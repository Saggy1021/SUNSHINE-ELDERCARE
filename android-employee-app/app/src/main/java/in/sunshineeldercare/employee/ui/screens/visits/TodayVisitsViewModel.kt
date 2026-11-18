package `in`.sunshineeldercare.employee.ui.screens.visits

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import `in`.sunshineeldercare.employee.data.repository.VisitsRepository
import kotlinx.coroutines.CoroutineExceptionHandler
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class TodayVisitsUiState(
    val visits: List<VisitEntity> = emptyList(),
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null
)

class TodayVisitsViewModel(
    private val visitsRepository: VisitsRepository = SunshineEmployeeApp.instance.visitsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TodayVisitsUiState())
    val uiState: StateFlow<TodayVisitsUiState> = _uiState.asStateFlow()

    private val coroutineExceptionHandler = CoroutineExceptionHandler { _, throwable ->
        Log.e("TodayVisitsViewModel", "Uncaught coroutine exception handled", throwable)
        _uiState.update {
            it.copy(
                isRefreshing = false,
                errorMessage = throwable.message ?: "Failed to load today's visits"
            )
        }
    }

    init {
        observeVisits()
        refresh()
    }

    private fun observeVisits() {
        viewModelScope.launch(coroutineExceptionHandler) {
            visitsRepository.getTodayVisits()
                .catch { e ->
                    Log.e("TodayVisitsViewModel", "Error collecting today visits from database", e)
                    emit(emptyList())
                }
                .collect { list ->
                    _uiState.update { it.copy(visits = list) }
                }
        }
    }

    fun refresh() {
        viewModelScope.launch(coroutineExceptionHandler) {
            _uiState.update { it.copy(isRefreshing = true, errorMessage = null) }
            val result = visitsRepository.syncVisits("today")
            _uiState.update {
                it.copy(
                    isRefreshing = false,
                    errorMessage = result.exceptionOrNull()?.message
                )
            }
        }
    }
}
