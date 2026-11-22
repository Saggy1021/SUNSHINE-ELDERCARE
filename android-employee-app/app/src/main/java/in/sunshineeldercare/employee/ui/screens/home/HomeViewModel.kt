package `in`.sunshineeldercare.employee.ui.screens.home

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import `in`.sunshineeldercare.employee.data.remote.EmployeeApiService
import `in`.sunshineeldercare.employee.data.remote.model.*
import `in`.sunshineeldercare.employee.data.repository.AuthRepository
import `in`.sunshineeldercare.employee.data.repository.VisitsRepository
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class HomeUiState(
    val profile: EmployeeProfile? = null,
    val todayVisits: List<VisitEntity> = emptyList(),
    val nextVisit: VisitEntity? = null,
    val completedCount: Int = 0,
    val pendingCount: Int = 0,
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null,

    // Duty Tracking State
    val isOnDuty: Boolean = false,
    val activeDutyStartTime: String? = null,
    val todayDutyMinutes: Int = 0,
    val todaySessionsCount: Int = 0,
    val isDutyLoading: Boolean = false,

    // Universal Events State
    val upcomingEvents: List<CommunityEventDto> = emptyList(),
    val isLoadingEvents: Boolean = false,

    // SOS State
    val isSosSending: Boolean = false,
    val sosAlertMessage: String? = null,

    // Leave Application State
    val isSubmittingLeave: Boolean = false,
    val leaveMessage: String? = null
) {
    val formattedTodayDuty: String
        get() {
            val hrs = todayDutyMinutes / 60
            val mins = todayDutyMinutes % 60
            return if (hrs > 0) "${hrs}h ${mins}m" else "${mins}m"
        }
}

class HomeViewModel(
    private val authRepository: AuthRepository = SunshineEmployeeApp.instance.authRepository,
    private val visitsRepository: VisitsRepository = SunshineEmployeeApp.instance.visitsRepository,
    private val apiService: EmployeeApiService = SunshineEmployeeApp.instance.apiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val coroutineExceptionHandler = CoroutineExceptionHandler { _, throwable ->
        Log.e("HomeViewModel", "Uncaught coroutine exception handled", throwable)
        _uiState.update {
            it.copy(
                isRefreshing = false,
                isDutyLoading = false,
                isSosSending = false,
                isSubmittingLeave = false,
                errorMessage = throwable.message ?: "An unexpected error occurred"
            )
        }
    }

    init {
        observeData()
        refresh()
    }

    private fun observeData() {
        viewModelScope.launch(coroutineExceptionHandler) {
            authRepository.profile.collect { profile ->
                _uiState.update { it.copy(profile = profile) }
            }
        }

        viewModelScope.launch(coroutineExceptionHandler) {
            visitsRepository.getTodayVisits()
                .catch { e ->
                    Log.e("HomeViewModel", "Error collecting today visits from database", e)
                    emit(emptyList())
                }
                .collect { todayList ->
                    val completed = todayList.count { it.status == "COMPLETED" }
                    val pending = todayList.count { it.status != "COMPLETED" && it.status != "CANCELLED" }
                    val next = todayList.firstOrNull { it.status != "COMPLETED" && it.status != "CANCELLED" }

                    _uiState.update {
                        it.copy(
                            todayVisits = todayList,
                            nextVisit = next,
                            completedCount = completed,
                            pendingCount = pending
                        )
                    }
                }
        }
    }

    fun refresh() {
        viewModelScope.launch(coroutineExceptionHandler) {
            _uiState.update { it.copy(isRefreshing = true, errorMessage = null) }
            runCatching { authRepository.refreshProfile() }
            val syncResult = visitsRepository.syncVisits()
            refreshDutyStatusInternal()
            fetchEventsInternal()
            _uiState.update {
                it.copy(
                    isRefreshing = false,
                    errorMessage = syncResult.exceptionOrNull()?.message
                )
            }
        }
    }

    fun refreshDutyStatus() {
        viewModelScope.launch(coroutineExceptionHandler) {
            refreshDutyStatusInternal()
        }
    }

    private suspend fun refreshDutyStatusInternal() {
        try {
            val response = apiService.getDutyStatus()
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                _uiState.update {
                    it.copy(
                        isOnDuty = body.isOnDuty,
                        activeDutyStartTime = body.activeSession?.startTime,
                        todayDutyMinutes = body.todayDurationMinutes,
                        todaySessionsCount = body.todaySessionsCount
                    )
                }
            }
        } catch (e: Throwable) {
            Log.e("HomeViewModel", "Error loading duty status", e)
        }
    }

    fun startDuty() {
        viewModelScope.launch(coroutineExceptionHandler) {
            _uiState.update { it.copy(isDutyLoading = true, errorMessage = null) }
            try {
                val response = apiService.startDuty(StartDutyRequest())
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    _uiState.update {
                        it.copy(
                            isDutyLoading = false,
                            isOnDuty = body.isOnDuty,
                            activeDutyStartTime = body.activeSession?.startTime,
                            todayDutyMinutes = body.todayDurationMinutes,
                            todaySessionsCount = body.todaySessionsCount
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isDutyLoading = false,
                            errorMessage = response.errorBody()?.string() ?: "Failed to start duty"
                        )
                    }
                }
            } catch (e: Throwable) {
                Log.e("HomeViewModel", "Error starting duty", e)
                _uiState.update {
                    it.copy(
                        isDutyLoading = false,
                        errorMessage = e.message ?: "Failed to start duty"
                    )
                }
            }
        }
    }

    fun endDuty() {
        viewModelScope.launch(coroutineExceptionHandler) {
            _uiState.update { it.copy(isDutyLoading = true, errorMessage = null) }
            try {
                val response = apiService.endDuty(EndDutyRequest())
                if (response.isSuccessful && response.body() != null) {
                    val body = response.body()!!
                    _uiState.update {
                        it.copy(
                            isDutyLoading = false,
                            isOnDuty = body.isOnDuty,
                            activeDutyStartTime = null,
                            todayDutyMinutes = body.todayDurationMinutes,
                            todaySessionsCount = body.todaySessionsCount
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            isDutyLoading = false,
                            errorMessage = response.errorBody()?.string() ?: "Failed to end duty"
                        )
                    }
                }
            } catch (e: Throwable) {
                Log.e("HomeViewModel", "Error ending duty", e)
                _uiState.update {
                    it.copy(
                        isDutyLoading = false,
                        errorMessage = e.message ?: "Failed to end duty"
                    )
                }
            }
        }
    }

    fun triggerSos(notes: String? = null, onComplete: (Boolean, String?) -> Unit) {
        viewModelScope.launch(coroutineExceptionHandler) {
            _uiState.update { it.copy(isSosSending = true) }
            try {
                val response = apiService.triggerSos(EmployeeSosRequest(notes = notes))
                if (response.isSuccessful && response.body()?.success == true) {
                    val res = response.body()!!
                    val msg = "Emergency SOS Alert dispatched! Incident ID: ${res.incidentNumber ?: "EMG"}"
                    _uiState.update {
                        it.copy(
                            isSosSending = false,
                            sosAlertMessage = msg
                        )
                    }
                    onComplete(true, msg)
                } else {
                    val error = response.errorBody()?.string() ?: "Failed to send SOS alert"
                    _uiState.update { it.copy(isSosSending = false) }
                    onComplete(false, error)
                }
            } catch (e: Throwable) {
                Log.e("HomeViewModel", "Error triggering employee SOS", e)
                _uiState.update { it.copy(isSosSending = false) }
                onComplete(false, e.message ?: "Network error triggering SOS")
            }
        }
    }

    fun fetchEvents() {
        viewModelScope.launch(coroutineExceptionHandler) {
            fetchEventsInternal()
        }
    }

    private suspend fun fetchEventsInternal() {
        _uiState.update { it.copy(isLoadingEvents = true) }
        try {
            val response = apiService.getEvents()
            if (response.isSuccessful && response.body() != null) {
                val events = response.body()!!.events
                _uiState.update {
                    it.copy(
                        upcomingEvents = events,
                        isLoadingEvents = false
                    )
                }
            } else {
                _uiState.update { it.copy(isLoadingEvents = false) }
            }
        } catch (e: Throwable) {
            Log.e("HomeViewModel", "Error loading events", e)
            _uiState.update { it.copy(isLoadingEvents = false) }
        }
    }

    fun applyLeave(
        startDate: String,
        endDate: String,
        reason: String,
        onComplete: (Boolean, String?) -> Unit
    ) {
        viewModelScope.launch(coroutineExceptionHandler) {
            _uiState.update { it.copy(isSubmittingLeave = true) }
            try {
                val response = apiService.applyLeave(
                    ApplyLeaveRequest(
                        startDate = startDate,
                        endDate = endDate,
                        reason = reason
                    )
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    _uiState.update {
                        it.copy(
                            isSubmittingLeave = false,
                            leaveMessage = "Leave application submitted successfully."
                        )
                    }
                    onComplete(true, "Leave application submitted successfully.")
                } else {
                    val error = response.errorBody()?.string() ?: "Failed to submit leave application"
                    _uiState.update { it.copy(isSubmittingLeave = false) }
                    onComplete(false, error)
                }
            } catch (e: Throwable) {
                Log.e("HomeViewModel", "Error applying for leave", e)
                _uiState.update { it.copy(isSubmittingLeave = false) }
                onComplete(false, e.message ?: "Failed to apply for leave")
            }
        }
    }
}
