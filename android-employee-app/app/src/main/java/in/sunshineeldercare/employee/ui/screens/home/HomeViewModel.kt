package `in`.sunshineeldercare.employee.ui.screens.home

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import `in`.sunshineeldercare.employee.data.remote.model.EmployeeProfile
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
    val errorMessage: String? = null
)

class HomeViewModel(
    private val authRepository: AuthRepository = SunshineEmployeeApp.instance.authRepository,
    private val visitsRepository: VisitsRepository = SunshineEmployeeApp.instance.visitsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val coroutineExceptionHandler = CoroutineExceptionHandler { _, throwable ->
        Log.e("HomeViewModel", "Uncaught coroutine exception handled", throwable)
        _uiState.update {
            it.copy(
                isRefreshing = false,
                errorMessage = throwable.message ?: "An unexpected error occurred while loading dashboard"
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
            _uiState.update {
                it.copy(
                    isRefreshing = false,
                    errorMessage = syncResult.exceptionOrNull()?.message
                )
            }
        }
    }
}
