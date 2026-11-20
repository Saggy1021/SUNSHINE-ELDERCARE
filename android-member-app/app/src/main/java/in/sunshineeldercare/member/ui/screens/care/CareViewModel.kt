package `in`.sunshineeldercare.member.ui.screens.care

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.member.data.model.DashboardResponse
import `in`.sunshineeldercare.member.data.repository.LiveRefreshManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CareUiState(
    val isLoading: Boolean = false,
    val data: DashboardResponse? = null,
    val error: String? = null
)

class CareViewModel(
    private val liveRefreshManager: LiveRefreshManager = LiveRefreshManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(
        CareUiState(
            isLoading = liveRefreshManager.dashboardFlow.value == null,
            data = liveRefreshManager.dashboardFlow.value
        )
    )
    val uiState: StateFlow<CareUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            liveRefreshManager.dashboardFlow.collect { freshData ->
                if (freshData != null) {
                    _uiState.update {
                        it.copy(isLoading = false, data = freshData, error = null)
                    }
                }
            }
        }

        if (liveRefreshManager.dashboardFlow.value == null) {
            loadCareData()
        }
    }

    fun loadCareData() {
        _uiState.update { it.copy(isLoading = it.data == null, error = null) }
        liveRefreshManager.refreshNow(isSilent = _uiState.value.data != null)
    }
}
