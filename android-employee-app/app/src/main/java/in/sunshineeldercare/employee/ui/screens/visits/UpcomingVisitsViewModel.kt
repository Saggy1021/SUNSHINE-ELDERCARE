package `in`.sunshineeldercare.employee.ui.screens.visits

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import `in`.sunshineeldercare.employee.data.repository.VisitsRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class UpcomingVisitsUiState(
    val visits: List<VisitEntity> = emptyList(),
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null
)

class UpcomingVisitsViewModel(
    private val visitsRepository: VisitsRepository = SunshineEmployeeApp.instance.visitsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(UpcomingVisitsUiState())
    val uiState: StateFlow<UpcomingVisitsUiState> = _uiState.asStateFlow()

    init {
        observeVisits()
        refresh()
    }

    private fun observeVisits() {
        viewModelScope.launch {
            visitsRepository.getUpcomingVisits().collect { list ->
                _uiState.update { it.copy(visits = list) }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, errorMessage = null) }
            val result = visitsRepository.syncVisits("upcoming")
            _uiState.update {
                it.copy(
                    isRefreshing = false,
                    errorMessage = result.exceptionOrNull()?.message
                )
            }
        }
    }
}
