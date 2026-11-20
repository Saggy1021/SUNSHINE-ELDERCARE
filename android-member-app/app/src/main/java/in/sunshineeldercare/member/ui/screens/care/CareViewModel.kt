package `in`.sunshineeldercare.member.ui.screens.care

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import `in`.sunshineeldercare.member.data.model.DashboardResponse
import `in`.sunshineeldercare.member.data.repository.MemberRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class CareUiState(
    val isLoading: Boolean = true,
    val data: DashboardResponse? = null,
    val error: String? = null
)

class CareViewModel(
    private val memberRepository: MemberRepository = MemberRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(CareUiState())
    val uiState: StateFlow<CareUiState> = _uiState.asStateFlow()

    init {
        loadCareData()
    }

    fun loadCareData() {
        _uiState.update { it.copy(isLoading = true, error = null) }
        viewModelScope.launch {
            val result = memberRepository.getDashboard()
            result.onSuccess { res ->
                _uiState.update { it.copy(isLoading = false, data = res) }
            }.onFailure { err ->
                _uiState.update { it.copy(isLoading = false, error = err.message) }
            }
        }
    }
}
