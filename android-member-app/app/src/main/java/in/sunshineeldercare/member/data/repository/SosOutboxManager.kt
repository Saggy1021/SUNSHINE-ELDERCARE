package `in`.sunshineeldercare.member.data.repository

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.util.Log
import androidx.work.*
import `in`.sunshineeldercare.member.data.api.ApiClient
import `in`.sunshineeldercare.member.data.model.SosTriggerRequest
import `in`.sunshineeldercare.member.data.security.SecureSessionManager
import `in`.sunshineeldercare.member.service.EmergencyLocationService
import `in`.sunshineeldercare.member.service.SosDeliveryWorker
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.io.File
import java.util.UUID
import java.util.concurrent.TimeUnit

@Serializable
enum class SosDeliveryStatus {
    IDLE,
    QUEUED,
    SENDING,
    DELIVERED,
    PENDING_RETRY,
    FAILED
}

@Serializable
data class SosOutboxItem(
    val requestId: String = UUID.randomUUID().toString(),
    val timestamp: Long = System.currentTimeMillis(),
    val memberId: String? = null,
    val callerName: String? = null,
    val callerPhone: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val accuracy: Float? = null,
    val status: SosDeliveryStatus = SosDeliveryStatus.QUEUED,
    val incidentId: String? = null,
    val incidentNumber: String? = null,
    val retryCount: Int = 0,
    val lastAttempt: Long = 0L,
    val failureReason: String? = null
)

object SosOutboxManager {

    private const val TAG = "SosOutboxManager"
    private const val OUTBOX_FILENAME = "active_sos.json"
    private const val OUTBOX_DIR = "sos_outbox"

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private val managerScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private val _currentSos = MutableStateFlow<SosOutboxItem?>(null)
    val currentSos: StateFlow<SosOutboxItem?> = _currentSos.asStateFlow()

    private var appContext: Context? = null

    fun init(context: Context) {
        appContext = context.applicationContext
        loadPersistedOutbox()
        checkAndResumePendingDelivery()
    }

    /**
     * Checks if there is currently an active or pending emergency.
     * Used by AppUpdateManager to ensure updates NEVER interrupt an emergency.
     */
    fun hasActiveOrPendingEmergency(): Boolean {
        val item = _currentSos.value ?: return false
        return when (item.status) {
            SosDeliveryStatus.QUEUED,
            SosDeliveryStatus.SENDING,
            SosDeliveryStatus.PENDING_RETRY -> true
            SosDeliveryStatus.DELIVERED -> {
                // Keep active state for 6 hours unless explicitly cleared
                val ageHours = (System.currentTimeMillis() - item.timestamp) / (1000 * 60 * 60)
                ageHours < 6
            }
            else -> false
        }
    }

    /**
     * Immediately registers a durable SOS outbox request and initiates delivery.
     * Guaranteed non-blocking location acquisition with strict 2.5s timeout.
     */
    fun triggerSosImmediate(
        context: Context,
        onImmediateResult: ((Boolean, String?) -> Unit)? = null
    ) {
        val ctx = appContext ?: context.applicationContext

        managerScope.launch {
            // 1. Non-blocking best-effort location acquisition (max 2.5s)
            val loc = acquireLocationQuick(ctx)

            val memberId = SecureSessionManager.getMemberId()
            val callerName = SecureSessionManager.getMemberName()
            val cachedProfile = SecureSessionManager.getCachedProfile()
            val callerPhone = cachedProfile?.phone?.ifBlank { null }

            val item = SosOutboxItem(
                requestId = UUID.randomUUID().toString(),
                timestamp = System.currentTimeMillis(),
                memberId = memberId,
                callerName = callerName,
                callerPhone = callerPhone,
                latitude = loc?.latitude,
                longitude = loc?.longitude,
                accuracy = loc?.accuracy,
                status = SosDeliveryStatus.SENDING,
                retryCount = 0
            )

            // 2. Persist immediately to disk BEFORE initiating network call
            persistOutboxItem(item)
            _currentSos.value = item

            // 3. Schedule WorkManager persistent retry worker (survives app kill / device reboot)
            scheduleWorkManagerDelivery(ctx, item.requestId)

            // 4. Attempt immediate in-process delivery with strict 8-second timeout
            var delivered = false
            var errorMsg: String? = null

            try {
                withTimeout(8000) {
                    val result = executeDeliveryNetworkCall(ctx, item)
                    if (result.first) {
                        delivered = true
                    } else {
                        errorMsg = result.second
                    }
                }
            } catch (e: TimeoutCancellationException) {
                Log.w(TAG, "In-process SOS delivery timed out after 8s; continuing in background outbox.")
                errorMsg = "Connecting to emergency command center took longer than expected. Automatic retry is active."
            } catch (e: Exception) {
                Log.e(TAG, "In-process SOS delivery error", e)
                errorMsg = e.message ?: "Network error during emergency dispatch."
            }

            if (!delivered) {
                // Update to PENDING_RETRY so UI clearly displays that emergency is registered
                // and retrying, while avoiding infinite spinners
                val retryingItem = item.copy(
                    status = SosDeliveryStatus.PENDING_RETRY,
                    lastAttempt = System.currentTimeMillis(),
                    failureReason = errorMsg
                )
                persistOutboxItem(retryingItem)
                _currentSos.value = retryingItem
            }

            withContext(Dispatchers.Main) {
                onImmediateResult?.invoke(delivered, errorMsg)
            }
        }
    }

    /**
     * Executes the actual network transmission to the backend SOS endpoint.
     * Reused by both foreground execution and WorkManager background worker.
     */
    suspend fun executeDeliveryNetworkCall(
        context: Context,
        item: SosOutboxItem
    ): Pair<Boolean, String?> = withContext(Dispatchers.IO) {
        try {
            val request = SosTriggerRequest(
                triggerSource = "MEMBER_APP_SOS",
                latitude = item.latitude,
                longitude = item.longitude,
                accuracy = item.accuracy,
                notes = "One-tap emergency SOS triggered by member from Sunshine Member App",
                idempotencyKey = item.requestId,
                memberId = item.memberId,
                callerName = item.callerName,
                callerPhone = item.callerPhone
            )

            val response = ApiClient.service.triggerSos(request)

            if (response.isSuccessful && response.body()?.success == true) {
                val body = response.body()!!
                val incidentId = body.incidentId
                val incidentNumber = body.incidentNumber ?: "Active Incident"

                val deliveredItem = item.copy(
                    status = SosDeliveryStatus.DELIVERED,
                    incidentId = incidentId,
                    incidentNumber = incidentNumber,
                    lastAttempt = System.currentTimeMillis(),
                    failureReason = null
                )
                persistOutboxItem(deliveredItem)
                _currentSos.value = deliveredItem

                LiveRefreshManager.isSosActive = true

                // Start emergency GPS foreground streaming if incidentId is available
                if (!incidentId.isNullOrBlank()) {
                    EmergencyLocationService.start(context, incidentId, incidentNumber)
                }

                // Cancel scheduled background worker since delivery is complete
                cancelWorkManagerDelivery(context, item.requestId)

                Log.i(TAG, "SOS successfully delivered and acknowledged: $incidentNumber")
                Pair(true, null)
            } else {
                val err = response.body()?.error ?: "Server returned error: ${response.code()}"
                Log.w(TAG, "SOS delivery server rejected: $err")
                Pair(false, err)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Network exception during SOS delivery", e)
            Pair(false, e.message ?: "Failed to connect to Sunshine emergency center")
        }
    }

    /**
     * Enqueues durable WorkManager worker with exponential backoff and network constraints.
     */
    private fun scheduleWorkManagerDelivery(context: Context, requestId: String) {
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workData = workDataOf("requestId" to requestId)

            val workRequest = OneTimeWorkRequestBuilder<SosDeliveryWorker>()
                .setConstraints(constraints)
                .setInputData(workData)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    5, TimeUnit.SECONDS
                )
                .addTag("sos_delivery")
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                "sos_delivery_$requestId",
                ExistingWorkPolicy.KEEP,
                workRequest
            )
            Log.d(TAG, "Enqueued WorkManager task: sos_delivery_$requestId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule WorkManager task", e)
        }
    }

    private fun cancelWorkManagerDelivery(context: Context, requestId: String) {
        try {
            WorkManager.getInstance(context).cancelUniqueWork("sos_delivery_$requestId")
        } catch (_: Exception) {}
    }

    /**
     * Acquires location quickly with a strict 2.5-second timeout, falling back gracefully.
     */
    @SuppressLint("MissingPermission")
    private suspend fun acquireLocationQuick(context: Context): Location? {
        return withContext(Dispatchers.IO) {
            try {
                withTimeoutOrNull(2500) {
                    val locManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
                    if (locManager == null) return@withTimeoutOrNull null

                    val hasGps = locManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    val hasNet = locManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

                    val lastGps = if (hasGps) locManager.getLastKnownLocation(LocationManager.GPS_PROVIDER) else null
                    val lastNet = if (hasNet) locManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER) else null

                    // Prefer GPS if fresh, else network
                    when {
                        lastGps != null && (System.currentTimeMillis() - lastGps.time) < 60_000 -> lastGps
                        lastNet != null -> lastNet
                        else -> lastGps
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Quick location check skipped: ${e.message}")
                null
            }
        }
    }

    private fun getOutboxFile(): File? {
        val ctx = appContext ?: return null
        val dir = File(ctx.filesDir, OUTBOX_DIR)
        if (!dir.exists()) dir.mkdirs()
        return File(dir, OUTBOX_FILENAME)
    }

    private fun loadPersistedOutbox() {
        try {
            val file = getOutboxFile() ?: return
            if (file.exists()) {
                val content = file.readText()
                if (content.isNotBlank()) {
                    val item = json.decodeFromString<SosOutboxItem>(content)
                    _currentSos.value = item
                    Log.d(TAG, "Loaded persisted SOS outbox: status=${item.status}, incident=${item.incidentNumber}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load persisted SOS outbox", e)
        }
    }

    @Synchronized
    private fun persistOutboxItem(item: SosOutboxItem) {
        try {
            val file = getOutboxFile() ?: return
            val tempFile = File(file.parentFile, "${OUTBOX_FILENAME}.tmp")
            val content = json.encodeToString(item)
            tempFile.writeText(content)
            if (tempFile.renameTo(file)) {
                Log.d(TAG, "Persisted SOS item (${item.status}) to ${file.name}")
            } else {
                file.writeText(content)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to persist SOS outbox item", e)
        }
    }

    /**
     * Checks if a pending outbox item exists upon app start or network reconnection,
     * and triggers WorkManager immediately.
     */
    fun checkAndResumePendingDelivery() {
        val item = _currentSos.value ?: return
        val ctx = appContext ?: return

        if (item.status == SosDeliveryStatus.QUEUED || item.status == SosDeliveryStatus.PENDING_RETRY) {
            Log.i(TAG, "Resuming pending SOS delivery: ${item.requestId}")
            scheduleWorkManagerDelivery(ctx, item.requestId)
            managerScope.launch {
                executeDeliveryNetworkCall(ctx, item)
            }
        } else if (item.status == SosDeliveryStatus.DELIVERED) {
            // Restore active state in LiveRefreshManager
            val ageHours = (System.currentTimeMillis() - item.timestamp) / (1000 * 60 * 60)
            if (ageHours < 6) {
                LiveRefreshManager.isSosActive = true
            }
        }
    }

    fun dismissCurrentEmergency() {
        val item = _currentSos.value ?: return
        val ctx = appContext
        if (ctx != null) {
            cancelWorkManagerDelivery(ctx, item.requestId)
            EmergencyLocationService.stop(ctx)
        }
        LiveRefreshManager.isSosActive = false
        _currentSos.value = null
        try {
            getOutboxFile()?.delete()
        } catch (_: Exception) {}
    }
}
