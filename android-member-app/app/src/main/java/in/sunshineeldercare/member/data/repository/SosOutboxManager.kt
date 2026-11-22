package `in`.sunshineeldercare.member.data.repository

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.util.Log
import androidx.work.*
import `in`.sunshineeldercare.member.data.api.ApiClient
import `in`.sunshineeldercare.member.data.model.EmergencyIncidentSummaryDto
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
import kotlin.math.min

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
    private var activeRetryJob: Job? = null

    private val _currentSos = MutableStateFlow<SosOutboxItem?>(null)
    val currentSos: StateFlow<SosOutboxItem?> = _currentSos.asStateFlow()

    private var appContext: Context? = null

    fun init(context: Context) {
        appContext = context.applicationContext
        loadPersistedOutbox()
        checkAndResumePendingDelivery()
    }

    /**
     * Retrieves current SOS item, reloading from disk if null.
     */
    fun getOrLoadCurrentSos(context: Context? = null): SosOutboxItem? {
        val inMemory = _currentSos.value
        if (inMemory != null) return inMemory

        val ctx = context?.applicationContext ?: appContext
        if (ctx != null && appContext == null) {
            appContext = ctx
        }
        loadPersistedOutbox()
        return _currentSos.value
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
     * If an emergency is already active or retrying, triggers immediate retry preserving requestId.
     */
    fun triggerSosImmediate(
        context: Context,
        onImmediateResult: ((Boolean, String?) -> Unit)? = null
    ) {
        val ctx = appContext ?: context.applicationContext

        val existing = _currentSos.value
        if (existing != null && (existing.status == SosDeliveryStatus.SENDING ||
                    existing.status == SosDeliveryStatus.PENDING_RETRY ||
                    existing.status == SosDeliveryStatus.QUEUED)) {
            Log.i(TAG, "SOS already pending/sending (${existing.requestId}). Triggering immediate retry.")
            retryNow(ctx, onImmediateResult)
            return
        }

        managerScope.launch {
            // 1. Non-blocking best-effort location acquisition (max 2.5s)
            val loc = acquireLocationQuick(ctx)

            val memberId = SecureSessionManager.getMemberId()
            val callerName = SecureSessionManager.getMemberName()
            val callerPhone = SecureSessionManager.getMemberPhone()
                ?: SecureSessionManager.getCachedProfile()?.phone?.ifBlank { null }

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

            // 3. Schedule WorkManager persistent retry worker (survives app kill / reboot)
            scheduleWorkManagerDelivery(ctx, item.requestId)

            // 4. Launch resilient in-process retry loop
            startForegroundRetryLoop(ctx, item, onImmediateResult)
        }
    }

    /**
     * Forces an immediate retry attempt for the active pending emergency.
     */
    fun retryNow(
        context: Context,
        onImmediateResult: ((Boolean, String?) -> Unit)? = null
    ) {
        val ctx = appContext ?: context.applicationContext
        val item = _currentSos.value ?: loadPersistedOutbox() ?: return

        if (item.status == SosDeliveryStatus.DELIVERED) {
            onImmediateResult?.invoke(true, null)
            return
        }

        managerScope.launch {
            val sendingItem = item.copy(
                status = SosDeliveryStatus.SENDING,
                lastAttempt = System.currentTimeMillis()
            )
            persistOutboxItem(sendingItem)
            _currentSos.value = sendingItem

            // Re-schedule WorkManager in case it was cancelled
            scheduleWorkManagerDelivery(ctx, item.requestId)

            // Start in-process retry loop
            startForegroundRetryLoop(ctx, sendingItem, onImmediateResult)
        }
    }

    /**
     * Resilient in-process foreground retry loop with bounded exponential backoff.
     */
    private fun startForegroundRetryLoop(
        context: Context,
        initialItem: SosOutboxItem,
        onImmediateResult: ((Boolean, String?) -> Unit)? = null
    ) {
        activeRetryJob?.cancel()
        activeRetryJob = managerScope.launch {
            var current = initialItem
            var firstAttemptCompleted = false

            for (attempt in 0..12) {
                if (_currentSos.value?.status == SosDeliveryStatus.DELIVERED) {
                    Log.i(TAG, "Emergency already acknowledged/delivered; exiting retry loop.")
                    break
                }

                if (attempt > 0) {
                    val backoffSeconds = calculateBackoffSeconds(attempt)
                    Log.d(TAG, "Scheduling in-process SOS retry #$attempt in ${backoffSeconds}s")
                    delay(backoffSeconds * 1000L)
                }

                if (_currentSos.value?.status == SosDeliveryStatus.DELIVERED) break

                val (success, errorMsg) = executeDeliveryNetworkCall(context, current, timeoutMs = 15000L)

                if (success) {
                    Log.i(TAG, "In-process SOS delivery succeeded on attempt $attempt")
                    if (!firstAttemptCompleted) {
                        firstAttemptCompleted = true
                        withContext(Dispatchers.Main) {
                            onImmediateResult?.invoke(true, null)
                        }
                    }
                    break
                } else {
                    Log.w(TAG, "In-process SOS delivery attempt $attempt failed: $errorMsg")
                    current = current.copy(
                        status = SosDeliveryStatus.PENDING_RETRY,
                        retryCount = attempt + 1,
                        lastAttempt = System.currentTimeMillis(),
                        failureReason = errorMsg
                    )
                    persistOutboxItem(current)
                    _currentSos.value = current

                    if (!firstAttemptCompleted) {
                        firstAttemptCompleted = true
                        withContext(Dispatchers.Main) {
                            onImmediateResult?.invoke(false, errorMsg)
                        }
                    }
                }
            }
        }
    }

    /**
     * Reconciles active emergency state when server dashboard or API returns an ongoing incident.
     */
    fun reconcileWithServerIncident(incident: EmergencyIncidentSummaryDto) {
        val activeStatuses = listOf("TRIGGERED", "ACKNOWLEDGED", "DISPATCHED", "RESPONDER_ON_SCENE")
        if (incident.status !in activeStatuses) {
            return
        }

        val current = _currentSos.value
        val needsReconciliation = current == null ||
                current.status != SosDeliveryStatus.DELIVERED ||
                current.incidentId != incident.id

        if (needsReconciliation) {
            Log.i(TAG, "Reconciling local SOS with active server incident #${incident.incidentNumber} (${incident.status})")
            activeRetryJob?.cancel()
            activeRetryJob = null

            val ctx = appContext
            if (ctx != null) {
                cancelWorkManagerDelivery(ctx, current?.requestId ?: incident.id)
                EmergencyLocationService.start(ctx, incident.id, incident.incidentNumber)
            }

            LiveRefreshManager.isSosActive = true

            val reconciledItem = (current ?: SosOutboxItem(
                requestId = UUID.randomUUID().toString(),
                timestamp = System.currentTimeMillis()
            )).copy(
                status = SosDeliveryStatus.DELIVERED,
                incidentId = incident.id,
                incidentNumber = incident.incidentNumber,
                lastAttempt = System.currentTimeMillis(),
                failureReason = null
            )

            persistOutboxItem(reconciledItem)
            _currentSos.value = reconciledItem
        }
    }

    /**
     * Invoked when the server indicates that the active incident is resolved or cancelled.
     */
    fun onServerIncidentResolved() {
        val current = _currentSos.value ?: return
        if (current.status == SosDeliveryStatus.DELIVERED) {
            Log.i(TAG, "Server incident #${current.incidentNumber} is closed. Dismissing active SOS.")
            dismissCurrentEmergency()
        }
    }

    /**
     * Executes the actual network transmission to the backend SOS endpoint.
     * Reused by both foreground execution and WorkManager background worker.
     */
    suspend fun executeDeliveryNetworkCall(
        context: Context,
        item: SosOutboxItem,
        timeoutMs: Long = 15000L
    ): Pair<Boolean, String?> = withContext(Dispatchers.IO) {
        try {
            withTimeout(timeoutMs) {
                val memberId = item.memberId ?: SecureSessionManager.getMemberId()
                val callerName = item.callerName ?: SecureSessionManager.getMemberName()
                val callerPhone = item.callerPhone ?: SecureSessionManager.getMemberPhone()

                val request = SosTriggerRequest(
                    triggerSource = "MEMBER_APP_SOS",
                    latitude = item.latitude,
                    longitude = item.longitude,
                    accuracy = item.accuracy,
                    notes = "One-tap emergency SOS triggered by member from Sunshine Member App",
                    idempotencyKey = item.requestId,
                    memberId = memberId,
                    callerName = callerName,
                    callerPhone = callerPhone
                )

                Log.d(TAG, "Executing SOS network call: key=${item.requestId}, member=$memberId")
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
            }
        } catch (e: TimeoutCancellationException) {
            Log.w(TAG, "SOS network call timed out after ${timeoutMs}ms")
            Pair(false, "Connecting to emergency command center took longer than expected. Automatic retry active.")
        } catch (e: Exception) {
            Log.e(TAG, "Network exception during SOS delivery", e)
            Pair(false, e.message ?: "Failed to connect to Sunshine emergency center")
        }
    }

    /**
     * Enqueues durable WorkManager worker with expedited execution and network constraints.
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
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    5, TimeUnit.SECONDS
                )
                .addTag("sos_delivery")
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                "sos_delivery_$requestId",
                ExistingWorkPolicy.REPLACE,
                workRequest
            )
            Log.d(TAG, "Enqueued Expedited WorkManager task: sos_delivery_$requestId")
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
                        ?: return@withTimeoutOrNull null

                    val hasGps = locManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    val hasNet = locManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

                    val lastGps = if (hasGps) locManager.getLastKnownLocation(LocationManager.GPS_PROVIDER) else null
                    val lastNet = if (hasNet) locManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER) else null

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

    private fun loadPersistedOutbox(): SosOutboxItem? {
        return try {
            val file = getOutboxFile() ?: return null
            if (file.exists()) {
                val content = file.readText()
                if (content.isNotBlank()) {
                    val item = json.decodeFromString<SosOutboxItem>(content)
                    _currentSos.value = item
                    Log.d(TAG, "Loaded persisted SOS outbox: status=${item.status}, incident=${item.incidentNumber}")
                    return item
                }
            }
            null
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load persisted SOS outbox", e)
            null
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
     * and resumes in-process retry and WorkManager immediately.
     */
    fun checkAndResumePendingDelivery() {
        val item = _currentSos.value ?: loadPersistedOutbox() ?: return
        val ctx = appContext ?: return

        if (item.status == SosDeliveryStatus.QUEUED || item.status == SosDeliveryStatus.PENDING_RETRY || item.status == SosDeliveryStatus.SENDING) {
            Log.i(TAG, "Resuming pending SOS delivery: ${item.requestId}")
            scheduleWorkManagerDelivery(ctx, item.requestId)
            startForegroundRetryLoop(ctx, item)
        } else if (item.status == SosDeliveryStatus.DELIVERED) {
            val ageHours = (System.currentTimeMillis() - item.timestamp) / (1000 * 60 * 60)
            if (ageHours < 6) {
                LiveRefreshManager.isSosActive = true
            }
        }
    }

    fun dismissCurrentEmergency() {
        val item = _currentSos.value
        val ctx = appContext
        activeRetryJob?.cancel()
        activeRetryJob = null

        if (item != null && ctx != null) {
            cancelWorkManagerDelivery(ctx, item.requestId)
            EmergencyLocationService.stop(ctx)
        }
        LiveRefreshManager.isSosActive = false
        _currentSos.value = null
        try {
            getOutboxFile()?.delete()
        } catch (_: Exception) {}
    }

    fun calculateBackoffSeconds(attempt: Int): Long {
        return when (attempt) {
            1 -> 2L
            2 -> 4L
            3 -> 7L
            4 -> 10L
            else -> min(15L, (5L + attempt * 2L))
        }
    }
}
