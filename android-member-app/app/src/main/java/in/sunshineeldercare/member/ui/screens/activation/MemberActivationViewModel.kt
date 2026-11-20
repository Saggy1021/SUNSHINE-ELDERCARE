package `in`.sunshineeldercare.member.ui.screens.activation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.member.SunshineMemberApp
import `in`.sunshineeldercare.member.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class MemberActivationStep {
    ENTER_ID,
    ENTER_OTP,
    SET_PASSWORD,
    COMPLETE
}

data class MemberActivationUiState(
    val step: MemberActivationStep = MemberActivationStep.ENTER_ID,
    val memberId: String = "",
    val maskedEmail: String? = null,
    val otp: String = "",
    val activationToken: String? = null,
    val newPassword: String = "",
    val confirmPassword: String = "",
    val isPasswordVisible: Boolean = false,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val successMessage: String? = null
)

class MemberActivationViewModel(
    private val authRepository: AuthRepository = SunshineMemberApp.instance.authRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MemberActivationUiState())
    val uiState: StateFlow<MemberActivationUiState> = _uiState.asStateFlow()

    fun onMemberIdChange(value: String) {
        _uiState.update { it.copy(memberId = value.uppercase().trim(), errorMessage = null) }
    }

    fun onOtpChange(value: String) {
        if (value.length <= 6) {
            _uiState.update { it.copy(otp = value.trim(), errorMessage = null) }
        }
    }

    fun onNewPasswordChange(value: String) {
        _uiState.update { it.copy(newPassword = value, errorMessage = null) }
    }

    fun onConfirmPasswordChange(value: String) {
        _uiState.update { it.copy(confirmPassword = value, errorMessage = null) }
    }

    fun togglePasswordVisibility() {
        _uiState.update { it.copy(isPasswordVisible = !it.isPasswordVisible) }
    }

    fun requestOtp() {
        val state = _uiState.value
        if (state.memberId.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter your canonical Member ID") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val result = authRepository.initiateActivation(state.memberId)
                result.onSuccess { res ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            step = MemberActivationStep.ENTER_OTP,
                            maskedEmail = res.maskedEmail,
                            successMessage = "Verification OTP sent to ${res.maskedEmail ?: "your registered email"}"
                        )
                    }
                }.onFailure { err ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = err.message ?: "Failed to initiate activation. Check Member ID."
                        )
                    }
                }
            } catch (t: Throwable) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = t.message ?: "Unable to connect to the activation service. Please try again later."
                    )
                }
            }
        }
    }

    fun verifyOtp() {
        val state = _uiState.value
        if (state.otp.length != 6) {
            _uiState.update { it.copy(errorMessage = "Please enter the complete 6-digit OTP") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val result = authRepository.verifyActivation(state.memberId, state.otp)
                result.onSuccess { res ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            step = MemberActivationStep.SET_PASSWORD,
                            activationToken = res.activationToken,
                            successMessage = "OTP verified. Now create your confidential password."
                        )
                    }
                }.onFailure { err ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = err.message ?: "Invalid or expired OTP. Please check and try again."
                        )
                    }
                }
            } catch (t: Throwable) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = t.message ?: "Failed to verify OTP. Please try again."
                    )
                }
            }
        }
    }

    fun setPassword(onSuccess: () -> Unit) {
        val state = _uiState.value
        if (state.newPassword.length < 8) {
            _uiState.update { it.copy(errorMessage = "Password must be at least 8 characters long") }
            return
        }
        if (state.newPassword != state.confirmPassword) {
            _uiState.update { it.copy(errorMessage = "Passwords do not match") }
            return
        }
        if (state.activationToken.isNullOrBlank()) {
            _uiState.update { it.copy(errorMessage = "Activation token expired. Please restart activation.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            try {
                val result = authRepository.setPassword(
                    state.memberId,
                    state.activationToken,
                    state.newPassword
                )
                result.onSuccess {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            step = MemberActivationStep.COMPLETE,
                            successMessage = "Account activated successfully! Redirecting..."
                        )
                    }
                    onSuccess()
                }.onFailure { err ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = err.message ?: "Failed to set password. Please try again."
                        )
                    }
                }
            } catch (t: Throwable) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = t.message ?: "Failed to set password. Please try again."
                    )
                }
            }
        }
    }
}
