package `in`.sunshineeldercare.employee.util

import android.content.Context
import android.util.Log
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.remote.model.EmergencyAssignmentDto
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

object EmergencyDispatchMonitor {

    private const val TAG = "EmergencyMonitor"
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var monitorJob: Job? = null

    private val _activeAssignment = MutableStateFlow<EmergencyAssignmentDto?>(null)
    val activeAssignment: StateFlow<EmergencyAssignmentDto?> = _activeAssignment.asStateFlow()

    fun start(context: Context) {
        if (monitorJob != null && monitorJob?.isActive == true) return

        EmergencyAlertManager.initNotificationChannel(context)

        monitorJob = scope.launch {
            Log.i(TAG, "Starting Emergency Dispatch Monitor loop (10s interval)...")
            while (isActive) {
                try {
                    pollActiveEmergency(context)
                } catch (e: Exception) {
                    Log.e(TAG, "Emergency dispatch poll error: ${e.message}")
                }
                delay(10000L) // Check every 10 seconds
            }
        }
    }

    fun refreshNow(context: Context) {
        scope.launch {
            try {
                pollActiveEmergency(context)
            } catch (e: Exception) {
                Log.e(TAG, "Immediate poll failed: ${e.message}")
            }
        }
    }

    private suspend fun pollActiveEmergency(context: Context) {
        val app = SunshineEmployeeApp.instance
        if (!app.tokenManager.isLoggedIn) {
            return
        }

        val response = app.apiService.getActiveEmergency()
        if (response.isSuccessful && response.body()?.success == true) {
            val body = response.body()!!
            if (body.hasAssignment && body.assignment != null) {
                val assignment = body.assignment
                _activeAssignment.value = assignment
                EmergencyAlertManager.notifyAssignment(context, assignment)
            } else {
                if (_activeAssignment.value != null) {
                    Log.i(TAG, "Emergency assignment resolved or cleared.")
                    EmergencyAlertManager.clearAlert(context)
                    _activeAssignment.value = null
                }
            }
        }
    }

    fun stop() {
        monitorJob?.cancel()
        monitorJob = null
    }
}
