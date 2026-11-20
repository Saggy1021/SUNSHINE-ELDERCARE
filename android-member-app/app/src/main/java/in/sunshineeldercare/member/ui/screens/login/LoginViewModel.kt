package `in`.sunshineeldercare.member.ui.screens.login

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.member.SunshineMemberApp
import `in`.sunshineeldercare.member.data.repository.AccountNotActivatedException
import `in`.sunshineeldercare.member.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val memberId: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val requiresActivation: Boolean = false,
    val isSuccess: Boolean = false
)

class LoginViewModel(
    private val authRepository: AuthRepository = SunshineMemberApp.instance.authRepository
) : ViewModel() {

    private val TAG = "LoginViewModel"
    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun onMemberIdChanged(newId: String) {
        _uiState.update { it.copy(memberId = newId.trim().uppercase(), error = null, requiresActivation = false) }
    }

    fun onPasswordChanged(newPass: String) {
        _uiState.update { it.copy(password = newPass, error = null) }
    }

    fun login() {
        val state = _uiState.value
        if (state.memberId.isBlank()) {
            _uiState.update { it.copy(error = "Please enter your Sunshine Member ID.") }
            return
        }
        if (state.password.isBlank()) {
            _uiState.update { it.copy(error = "Please enter your account password.") }
            return
        }

        _uiState.update { it.copy(isLoading = true, error = null, requiresActivation = false) }

        viewModelScope.launch {
            try {
                Log.d(TAG, "Submitting authentication for ID: ${state.memberId}")
                val result = authRepository.login(state.memberId, state.password)
                result.onSuccess {
                    Log.d(TAG, "Authentication succeeded in ViewModel, signaling navigation")
                    _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                }.onFailure { err ->
                    val isActivationReq = err is AccountNotActivatedException
                    val userFriendlyError = when {
                        isActivationReq -> err.message ?: "Account not activated. Please complete first-time activation."
                        err is java.net.ConnectException -> "Could not connect to backend server. Please check internet connection."
                        err is java.net.SocketTimeoutException -> "Connection timed out. Please verify server status."
                        else -> err.message ?: "Authentication failed. Please check your credentials."
                    }
                    Log.w(TAG, "Authentication failed in ViewModel: $userFriendlyError (requiresActivation=$isActivationReq)")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = userFriendlyError,
                            requiresActivation = isActivationReq
                        )
                    }
                }
            } catch (t: Throwable) {
                Log.e(TAG, "Unexpected login error in coroutine", t)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "An unexpected error occurred. Please try again."
                    )
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
