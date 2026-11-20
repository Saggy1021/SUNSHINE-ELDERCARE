package `in`.sunshineeldercare.member.ui.screens.profile

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.member.data.model.FullProfileDto
import `in`.sunshineeldercare.member.data.model.ProfileUpdateRequest
import `in`.sunshineeldercare.member.data.repository.AuthRepository
import `in`.sunshineeldercare.member.data.repository.MemberRepository
import `in`.sunshineeldercare.member.data.security.SecureSessionManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ProfileUiState(
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val profile: FullProfileDto? = null,
    val error: String? = null,
    val saveMessage: String? = null,
    val isLoggedOut: Boolean = false
)

class ProfileViewModel(
    private val memberRepository: MemberRepository = MemberRepository(),
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val TAG = "ProfileViewModel"
    private val _uiState = MutableStateFlow(
        ProfileUiState(
            isLoading = true,
            profile = SecureSessionManager.getCachedProfile() ?: FullProfileDto(
                memberId = SecureSessionManager.getMemberId() ?: "",
                name = SecureSessionManager.getMemberName() ?: "Sunshine Member",
                email = SecureSessionManager.getMemberEmail() ?: ""
            )
        )
    )
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    fun loadProfile() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                Log.d(TAG, "Fetching member profile from server...")
                val result = memberRepository.getProfile()
                result.onSuccess { res ->
                    val serverProfile = res.profile
                    if (serverProfile != null) {
                        SecureSessionManager.saveCachedProfile(serverProfile)
                    }
                    Log.d(TAG, "Profile loaded successfully for: ${serverProfile?.name}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            profile = serverProfile ?: it.profile,
                            error = null
                        )
                    }
                }.onFailure { err ->
                    Log.w(TAG, "Profile fetch failed: ${err.message}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = err.message ?: "Connection timed out. Please check your internet connection and tap Retry."
                        )
                    }
                }
            } catch (t: Throwable) {
                Log.e(TAG, "Unexpected error in loadProfile", t)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Unable to connect to server. Please check your internet connection and tap Retry."
                    )
                }
            }
        }
    }

    fun saveContactDetails(
        phone: String,
        alternatePhone: String,
        address: String,
        landmark: String,
        city: String
    ) {
        _uiState.update { it.copy(isSaving = true, error = null, saveMessage = null) }
        viewModelScope.launch {
            try {
                Log.d(TAG, "Submitting Contact Details update to backend...")
                val request = ProfileUpdateRequest(
                    phone = phone.trim(),
                    alternatePhone = alternatePhone.trim(),
                    addressLine1 = address.trim(),
                    nearestLandmark = landmark.trim(),
                    city = city.trim()
                )
                val result = memberRepository.updateProfile(request)
                result.onSuccess { msg ->
                    Log.d(TAG, "Contact Details update confirmed by server: $msg")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            saveMessage = "Contact details updated successfully in Sunshine database."
                        )
                    }
                    loadProfile()
                }.onFailure { err ->
                    Log.w(TAG, "Contact Details update rejected: ${err.message}")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = err.message ?: "Failed to update contact details"
                        )
                    }
                }
            } catch (t: Throwable) {
                Log.e(TAG, "Exception during contact details save", t)
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        error = "An error occurred while saving contact details."
                    )
                }
            }
        }
    }

    fun saveCareDetails(
        bloodGroup: String,
        medicalConditions: String,
        hospital: String,
        emergencyName: String,
        emergencyPhone: String,
        emergencyRelation: String = "Family"
    ) {
        _uiState.update { it.copy(isSaving = true, error = null, saveMessage = null) }
        viewModelScope.launch {
            try {
                Log.d(TAG, "Submitting Care Details update to backend...")
                val request = ProfileUpdateRequest(
                    bloodGroup = bloodGroup.trim(),
                    medicalConditions = medicalConditions.trim(),
                    hospitalPreference = hospital.trim(),
                    emergencyContactName = emergencyName.trim(),
                    emergencyContactPhone = emergencyPhone.trim(),
                    emergencyContactRelation = emergencyRelation.trim().ifEmpty { "Family" }
                )
                val result = memberRepository.updateProfile(request)
                result.onSuccess { msg ->
                    Log.d(TAG, "Care Details update confirmed by server: $msg")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            saveMessage = "Care details updated successfully in Sunshine database."
                        )
                    }
                    loadProfile()
                }.onFailure { err ->
                    Log.w(TAG, "Care Details update rejected: ${err.message}")
                    _uiState.update {
                        it.copy(
                            isSaving = false,
                            error = err.message ?: "Failed to update care details"
                        )
                    }
                }
            } catch (t: Throwable) {
                Log.e(TAG, "Exception during care details save", t)
                _uiState.update {
                    it.copy(
                        isSaving = false,
                        error = "An error occurred while saving care details."
                    )
                }
            }
        }
    }

    fun clearMessages() {
        _uiState.update { it.copy(error = null, saveMessage = null) }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.update { it.copy(isLoggedOut = true) }
        }
    }
}
