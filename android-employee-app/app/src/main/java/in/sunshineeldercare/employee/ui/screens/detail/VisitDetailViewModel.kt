package `in`.sunshineeldercare.employee.ui.screens.detail

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import `in`.sunshineeldercare.employee.data.repository.VisitsRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

data class VisitDetailUiState(
    val visit: VisitEntity? = null,
    val arrivalInput: String = "",
    val departureInput: String = "",
    val workDescriptionInput: String = "",
    val isSavingTime: Boolean = false,
    val isSavingWorkDescription: Boolean = false,
    val isCompleting: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null,
    val showCompleteConfirmation: Boolean = false
) {
    val isCompleted: Boolean
        get() = visit?.status == "COMPLETED"

    val canComplete: Boolean
        get() {
            if (isCompleted) return false
            val arr = if (arrivalInput.isNotBlank()) arrivalInput else visit?.actualArrivalDisplay.orEmpty()
            val dep = if (departureInput.isNotBlank()) departureInput else visit?.actualDepartureDisplay.orEmpty()
            val desc = if (workDescriptionInput.isNotBlank()) workDescriptionInput else visit?.workDescription.orEmpty()
            return arr.isNotBlank() && dep.isNotBlank() && desc.isNotBlank()
        }
}

class VisitDetailViewModel(
    private val visitId: String,
    private val visitsRepository: VisitsRepository = SunshineEmployeeApp.instance.visitsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(VisitDetailUiState())
    val uiState: StateFlow<VisitDetailUiState> = _uiState.asStateFlow()

    init {
        observeVisit()
        fetchFromNetwork()
    }

    private fun observeVisit() {
        viewModelScope.launch {
            visitsRepository.getVisitById(visitId).collect { entity ->
                entity?.let { v ->
                    _uiState.update { current ->
                        current.copy(
                            visit = v,
                            arrivalInput = current.arrivalInput.ifBlank { v.actualArrivalDisplay.orEmpty() },
                            departureInput = current.departureInput.ifBlank { v.actualDepartureDisplay.orEmpty() },
                            workDescriptionInput = current.workDescriptionInput.ifBlank { v.workDescription.orEmpty() }
                        )
                    }
                }
            }
        }
    }

    private fun fetchFromNetwork() {
        viewModelScope.launch {
            visitsRepository.fetchVisitDetails(visitId)
        }
    }

    fun onWorkDescriptionChange(value: String) {
        _uiState.update { it.copy(workDescriptionInput = value, errorMessage = null) }
    }

    fun setArrival(formattedTime: String) {
        _uiState.update { it.copy(arrivalInput = formattedTime, errorMessage = null) }
        saveArrival(formattedTime)
    }

    fun setDeparture(formattedTime: String) {
        val arrivalTime = _uiState.value.arrivalInput.ifBlank { _uiState.value.visit?.actualArrivalDisplay.orEmpty() }
        if (arrivalTime.isNotBlank()) {
            val arrMinutes = parseTimeToMinutes(arrivalTime)
            val depMinutes = parseTimeToMinutes(formattedTime)
            if (depMinutes < arrMinutes) {
                _uiState.update { it.copy(errorMessage = "Departure time cannot be earlier than arrival time ($arrivalTime)") }
                return
            }
        }
        _uiState.update { it.copy(departureInput = formattedTime, errorMessage = null) }
        saveDeparture(formattedTime)
    }

    fun recordCurrentTimeToArrival() {
        val currentTime = getCurrentIstTime()
        setArrival(currentTime)
    }

    fun recordCurrentTimeToDeparture() {
        val currentTime = getCurrentIstTime()
        setDeparture(currentTime)
    }

    private fun saveArrival(time: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSavingTime = true, errorMessage = null) }
            val result = visitsRepository.updateTime(visitId, actualArrival = time)
            result.onSuccess {
                _uiState.update {
                    it.copy(
                        isSavingTime = false,
                        successMessage = "Actual arrival time recorded as $time"
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isSavingTime = false,
                        errorMessage = err.message ?: "Failed to save arrival time"
                    )
                }
            }
        }
    }

    private fun saveDeparture(time: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isSavingTime = true, errorMessage = null) }
            val result = visitsRepository.updateTime(visitId, actualDeparture = time)
            result.onSuccess {
                _uiState.update {
                    it.copy(
                        isSavingTime = false,
                        successMessage = "Actual departure time recorded as $time"
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isSavingTime = false,
                        errorMessage = err.message ?: "Failed to save departure time"
                    )
                }
            }
        }
    }

    fun saveWorkDescription() {
        val desc = _uiState.value.workDescriptionInput.trim()
        if (desc.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter work description") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSavingWorkDescription = true, errorMessage = null) }
            val result = visitsRepository.updateWorkDescription(visitId, desc)
            result.onSuccess {
                _uiState.update {
                    it.copy(
                        isSavingWorkDescription = false,
                        successMessage = "Work description saved successfully"
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isSavingWorkDescription = false,
                        errorMessage = err.message ?: "Failed to save work description"
                    )
                }
            }
        }
    }

    fun showCompleteDialog() {
        _uiState.update { it.copy(showCompleteConfirmation = true) }
    }

    fun dismissCompleteDialog() {
        _uiState.update { it.copy(showCompleteConfirmation = false) }
    }

    fun completeVisit() {
        _uiState.update { it.copy(showCompleteConfirmation = false) }
        val state = _uiState.value

        val arrival = state.arrivalInput.ifBlank { state.visit?.actualArrivalDisplay.orEmpty() }
        val departure = state.departureInput.ifBlank { state.visit?.actualDepartureDisplay.orEmpty() }
        val desc = state.workDescriptionInput.ifBlank { state.visit?.workDescription.orEmpty() }

        if (arrival.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please record actual arrival time before completing") }
            return
        }
        if (departure.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please record actual departure time before completing") }
            return
        }
        if (desc.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please record work description before completing") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isCompleting = true, errorMessage = null) }
            val result = visitsRepository.completeVisit(visitId, workDescription = desc)
            result.onSuccess {
                _uiState.update {
                    it.copy(
                        isCompleting = false,
                        successMessage = "Care Visit marked as COMPLETED successfully!"
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isCompleting = false,
                        errorMessage = err.message ?: "Failed to complete visit"
                    )
                }
            }
        }
    }

    private fun getCurrentIstTime(): String {
        val zdt = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"))
        return zdt.format(DateTimeFormatter.ofPattern("hh:mm a", Locale.US))
    }

    private fun parseTimeToMinutes(timeStr: String): Int {
        return try {
            val upper = timeStr.trim().uppercase()
            val isPm = upper.contains("PM")
            val isAm = upper.contains("AM")
            val clean = upper.replace("AM", "").replace("PM", "").trim()
            val parts = clean.split(":")
            var h = parts[0].toInt()
            val m = parts[1].toInt()
            if (isPm && h != 12) h += 12
            if (isAm && h == 12) h = 0
            h * 60 + m
        } catch (_: Exception) {
            0
        }
    }
}
