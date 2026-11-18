package `in`.sunshineeldercare.employee.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class ActivationStep {
    ENTER_ID,
    ENTER_OTP,
    SET_PASSWORD,
    COMPLETE
}

data class ActivationUiState(
    val step: ActivationStep = ActivationStep.ENTER_ID,
    val employeeId: String = "",
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

class ActivationViewModel(
    private val authRepository: AuthRepository = SunshineEmployeeApp.instance.authRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ActivationUiState())
    val uiState: StateFlow<ActivationUiState> = _uiState.asStateFlow()

    fun onEmployeeIdChange(value: String) {
        _uiState.update { it.copy(employeeId = value.uppercase().trim(), errorMessage = null) }
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
        if (state.employeeId.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter your Employee ID") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val result = authRepository.initiateActivation(state.employeeId)
            result.onSuccess { res ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        step = ActivationStep.ENTER_OTP,
                        maskedEmail = res.maskedEmail,
                        successMessage = "Verification OTP sent to ${res.maskedEmail ?: "registered email"}"
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = err.message ?: "Failed to initiate activation"
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
            val result = authRepository.verifyActivation(state.employeeId, state.otp)
            result.onSuccess { res ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        step = ActivationStep.SET_PASSWORD,
                        activationToken = res.activationToken,
                        successMessage = "OTP verified. Now create your secure password."
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = err.message ?: "Invalid or expired OTP. Please try again."
                    )
                }
            }
        }
    }

    fun setPassword() {
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
            _uiState.update { it.copy(errorMessage = "Activation session expired. Please restart activation.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val result = authRepository.setPassword(
                employeeId = state.employeeId,
                activationToken = state.activationToken,
                newPassword = state.newPassword,
                confirmPassword = state.confirmPassword
            )
            result.onSuccess {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        step = ActivationStep.COMPLETE,
                        successMessage = "Account activated successfully! You are now logged in."
                    )
                }
            }.onFailure { err ->
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        errorMessage = err.message ?: "Failed to set password. Please try again."
                    )
                }
            }
        }
    }

    fun resetToStep1() {
        _uiState.update {
            it.copy(
                step = ActivationStep.ENTER_ID,
                otp = "",
                activationToken = null,
                errorMessage = null,
                successMessage = null
            )
        }
    }
}
