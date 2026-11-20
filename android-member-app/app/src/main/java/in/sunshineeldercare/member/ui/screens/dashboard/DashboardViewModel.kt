package `in`.sunshineeldercare.member.ui.screens.dashboard

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.member.data.model.DashboardResponse
import `in`.sunshineeldercare.member.data.repository.AuthRepository
import `in`.sunshineeldercare.member.data.repository.MemberRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DashboardUiState(
    val isLoading: Boolean = true,
    val data: DashboardResponse? = null,
    val error: String? = null,
    val cachedName: String = "Member",
    val cachedMemberId: String = "SEC/MEMBER",
    val cachedGender: String? = null
)

class DashboardViewModel(
    private val memberRepository: MemberRepository = MemberRepository(),
    private val authRepository: AuthRepository = AuthRepository()
) : ViewModel() {

    private val TAG = "DashboardViewModel"
    private val _uiState = MutableStateFlow(
        DashboardUiState(
            cachedName = authRepository.getCachedMemberName(),
            cachedMemberId = authRepository.getCachedMemberId(),
            cachedGender = authRepository.getCachedMemberGender()
        )
    )
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadDashboard()
    }

    fun loadDashboard() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            try {
                Log.d(TAG, "Requesting dashboard data for cached ID: ${_uiState.value.cachedMemberId}")
                val result = memberRepository.getDashboard()
                result.onSuccess { response ->
                    Log.d(TAG, "Dashboard data loaded successfully. Plan: ${response.membership?.planName}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            data = response,
                            cachedName = response.member?.name ?: it.cachedName,
                            cachedMemberId = response.member?.memberId ?: it.cachedMemberId,
                            cachedGender = response.member?.gender ?: it.cachedGender
                        )
                    }
                }.onFailure { err ->
                    Log.w(TAG, "Dashboard fetch failed: ${err.message}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = err.message ?: "Unable to fetch latest member data."
                        )
                    }
                }
            } catch (t: Throwable) {
                Log.e(TAG, "Unexpected error in loadDashboard", t)
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = "Failed to load dashboard data."
                    )
                }
            }
        }
    }

    fun getPersonalizedGreeting(): String {
        val name = _uiState.value.cachedName.trim().ifEmpty { "Member" }
        val gender = (_uiState.value.cachedGender ?: "").trim().lowercase()

        return when {
            gender == "female" || gender == "f" || gender == "woman" -> "Hello, $name Ma'am"
            gender == "male" || gender == "m" || gender == "man" -> "Hello, $name Sir"
            else -> "Hello, $name"
        }
    }
}
