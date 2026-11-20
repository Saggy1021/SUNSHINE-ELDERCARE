package `in`.sunshineeldercare.member.ui.screens.dashboard

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.member.data.model.DashboardResponse
import `in`.sunshineeldercare.member.data.repository.AuthRepository
import `in`.sunshineeldercare.member.data.repository.LiveRefreshManager
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
    private val authRepository: AuthRepository = AuthRepository(),
    private val liveRefreshManager: LiveRefreshManager = LiveRefreshManager
) : ViewModel() {

    private val TAG = "DashboardViewModel"
    private val _uiState = MutableStateFlow(
        DashboardUiState(
            isLoading = liveRefreshManager.dashboardFlow.value == null,
            data = liveRefreshManager.dashboardFlow.value,
            cachedName = authRepository.getCachedMemberName(),
            cachedMemberId = authRepository.getCachedMemberId(),
            cachedGender = authRepository.getCachedMemberGender()
        )
    )
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        // Collect live refresh updates seamlessly
        viewModelScope.launch {
            liveRefreshManager.dashboardFlow.collect { freshData ->
                if (freshData != null) {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            data = freshData,
                            cachedName = freshData.member?.name ?: it.cachedName,
                            cachedMemberId = freshData.member?.memberId ?: it.cachedMemberId,
                            cachedGender = freshData.member?.gender ?: it.cachedGender,
                            error = null
                        )
                    }
                }
            }
        }

        loadDashboard()
    }

    fun loadDashboard() {
        if (_uiState.value.data == null) {
            _uiState.update { it.copy(isLoading = true, error = null) }
        }
        liveRefreshManager.refreshNow(isSilent = _uiState.value.data != null)
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
