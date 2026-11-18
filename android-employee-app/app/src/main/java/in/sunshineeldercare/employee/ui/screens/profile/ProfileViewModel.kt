package `in`.sunshineeldercare.employee.ui.screens.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.remote.model.EmployeeProfile
import `in`.sunshineeldercare.employee.data.repository.AuthRepository
import `in`.sunshineeldercare.employee.data.repository.VisitsRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProfileUiState(
    val profile: EmployeeProfile? = null,
    val isLoading: Boolean = false,
    val isLoggedOut: Boolean = false
)

class ProfileViewModel(
    private val authRepository: AuthRepository = SunshineEmployeeApp.instance.authRepository,
    private val visitsRepository: VisitsRepository = SunshineEmployeeApp.instance.visitsRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.profile.collect { profile ->
                _uiState.update { it.copy(profile = profile) }
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            authRepository.refreshProfile()
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun logout() {
        viewModelScope.launch {
            visitsRepository.clearCache()
            authRepository.logout()
            _uiState.update { it.copy(isLoggedOut = true) }
        }
    }
}
