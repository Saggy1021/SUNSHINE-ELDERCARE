package `in`.sunshineeldercare.member.data.repository

import android.util.Log
import `in`.sunshineeldercare.member.data.api.ApiClient
import `in`.sunshineeldercare.member.data.api.ApiErrorParser
import `in`.sunshineeldercare.member.data.model.DashboardResponse
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.min

object LiveRefreshManager {

    private const val TAG = "LiveRefreshManager"
    private const val BASE_POLL_INTERVAL_MS = 5000L
    private const val MAX_BACKOFF_INTERVAL_MS = 30000L

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var refreshJob: Job? = null

    private val isRequestInFlight = AtomicBoolean(false)
    private var lastEtag: String? = null
    private var currentIntervalMs = BASE_POLL_INTERVAL_MS

    // Flag indicating an active SOS emergency broadcast is in progress
    @Volatile
    var isSosActive: Boolean = false

    private val _dashboardFlow = MutableStateFlow<DashboardResponse?>(null)
    val dashboardFlow: StateFlow<DashboardResponse?> = _dashboardFlow.asStateFlow()

    private val _isRefreshing = MutableStateFlow(false)
    val isRefreshing: StateFlow<Boolean> = _isRefreshing.asStateFlow()

    private val _lastError = MutableStateFlow<String?>(null)
    val lastError: StateFlow<String?> = _lastError.asStateFlow()

    /**
     * Called when the application enters the foreground.
     * Initiates the 5-second live refresh cycle.
     */
    fun onAppForegrounded() {
        Log.i(TAG, "Application entered foreground. Starting live refresh loop (~5s).")
        startPollingLoop()
    }

    /**
     * Called when the application enters the background.
     * Stops the live refresh loop to conserve battery, CPU and network bandwidth.
     */
    fun onAppBackgrounded() {
        Log.i(TAG, "Application entered background. Suspending live refresh loop.")
        stopPollingLoop()
    }

    private fun startPollingLoop() {
        if (refreshJob?.isActive == true) return

        refreshJob = scope.launch {
            // Immediate initial fetch on foreground entry
            executeRefresh(isSilent = _dashboardFlow.value != null)

            while (true) {
                delay(currentIntervalMs)

                // Continue polling periodically (every 5-10s) to keep incident & staff status updated in real time
                executeRefresh(isSilent = true)
            }
        }
    }

    private fun stopPollingLoop() {
        refreshJob?.cancel()
        refreshJob = null
        currentIntervalMs = BASE_POLL_INTERVAL_MS
    }

    /**
     * Trigger a manual on-demand refresh (e.g. pull-to-refresh or explicit user action).
     */
    fun refreshNow(isSilent: Boolean = false) {
        scope.launch {
            executeRefresh(isSilent = isSilent)
        }
    }

    private suspend fun executeRefresh(isSilent: Boolean) {
        // Prevent overlapping concurrent network requests
        if (!isRequestInFlight.compareAndSet(false, true)) {
            Log.d(TAG, "Previous refresh request still in flight. Skipping overlapping poll.")
            return
        }

        if (!isSilent) {
            _isRefreshing.value = true
        }

        try {
            val response = ApiClient.service.getDashboard(ifNoneMatch = lastEtag)
            val newEtag = response.headers()["ETag"]

            when {
                response.code() == 304 -> {
                    // HTTP 304 Not Modified: Data is identical, retain existing state with zero payload overhead
                    Log.d(TAG, "Live refresh: 304 Not Modified. ETag match, data is fresh.")
                    currentIntervalMs = BASE_POLL_INTERVAL_MS
                    _lastError.value = null
                }

                response.isSuccessful && response.body()?.success == true -> {
                    val freshData = response.body()!!
                    Log.i(TAG, "Live refresh: 200 OK. Received updated dashboard state. ETag: $newEtag")
                    lastEtag = newEtag
                    _dashboardFlow.value = freshData
                    currentIntervalMs = BASE_POLL_INTERVAL_MS
                    _lastError.value = null

                    // Update cached member presentation details in session
                    freshData.member?.let { m ->
                        `in`.sunshineeldercare.member.data.security.SecureSessionManager.saveMemberDetails(
                            memberId = m.memberId,
                            name = m.name,
                            phone = m.phone,
                            gender = m.gender,
                            email = m.email
                        )
                    }

                    // Reconcile active emergency with server state
                    val activeInc = freshData.activeIncident
                    if (activeInc != null) {
                        SosOutboxManager.reconcileWithServerIncident(activeInc)
                    } else if (SosOutboxManager.currentSos.value?.status == SosDeliveryStatus.DELIVERED) {
                        SosOutboxManager.onServerIncidentResolved()
                    }
                }

                else -> {
                    val errorMsg = ApiErrorParser.parse(response, "Refresh check failed")
                    Log.w(TAG, "Live refresh returned non-success: $errorMsg (code: ${response.code()})")
                    // Retain existing valid data gracefully
                    _lastError.value = errorMsg
                    // Exponential backoff
                    currentIntervalMs = min((currentIntervalMs * 1.5).toLong(), MAX_BACKOFF_INTERVAL_MS)
                }
            }
        } catch (t: Throwable) {
            Log.w(TAG, "Network exception during live refresh: ${t.message}. Retaining last valid data.")
            // Retain last valid data on network disruption
            _lastError.value = t.message
            // Exponential backoff
            currentIntervalMs = min((currentIntervalMs * 1.5).toLong(), MAX_BACKOFF_INTERVAL_MS)
        } finally {
            isRequestInFlight.set(false)
            _isRefreshing.value = false
        }
    }
}
