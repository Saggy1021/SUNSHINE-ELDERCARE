package `in`.sunshineeldercare.employee.ui.screens.visits

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import `in`.sunshineeldercare.employee.data.repository.VisitsRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class CompletedVisitsUiState(
    val visits: List<VisitEntity> = emptyList(),
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null
)

class CompletedVisitsViewModel(
    private val visitsRepository: VisitsRepository = SunshineEmployeeApp.instance.visitsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CompletedVisitsUiState())
    val uiState: StateFlow<CompletedVisitsUiState> = _uiState.asStateFlow()

    init {
        observeVisits()
        refresh()
    }

    private fun observeVisits() {
        viewModelScope.launch {
            visitsRepository.getCompletedVisits().collect { list ->
                _uiState.update { it.copy(visits = list) }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isRefreshing = true, errorMessage = null) }
            val result = visitsRepository.syncVisits("completed")
            _uiState.update {
                it.copy(
                    isRefreshing = false,
                    errorMessage = result.exceptionOrNull()?.message
                )
            }
        }
    }
}
