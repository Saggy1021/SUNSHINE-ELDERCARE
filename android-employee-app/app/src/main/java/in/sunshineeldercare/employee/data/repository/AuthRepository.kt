package `in`.sunshineeldercare.employee.data.repository

import `in`.sunshineeldercare.employee.data.remote.EmployeeApiService
import `in`.sunshineeldercare.employee.data.remote.model.*
import `in`.sunshineeldercare.employee.data.storage.SecureTokenManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

class AuthRepository(
    private val apiService: EmployeeApiService,
    private val tokenManager: SecureTokenManager
) {

    private val _isLoggedIn = MutableStateFlow(tokenManager.isLoggedIn)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _profile = MutableStateFlow<EmployeeProfile?>(
        if (tokenManager.isLoggedIn && tokenManager.employeeId != null) {
            EmployeeProfile(
                id = "",
                employeeId = tokenManager.employeeId.orEmpty(),
                name = tokenManager.employeeName.orEmpty(),
                designation = tokenManager.employeeDesignation.orEmpty(),
                department = "Care Operations",
                email = tokenManager.employeeEmail.orEmpty(),
                contactNumber = tokenManager.employeePhone
            )
        } else null
    )
    val profile: StateFlow<EmployeeProfile?> = _profile.asStateFlow()

    suspend fun initiateActivation(employeeId: String): Result<InitiateActivationResponse> {
        return try {
            val response = apiService.initiateActivation(InitiateActivationRequest(employeeId.trim()))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMsg = parseErrorMessage(response.errorBody()?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyActivation(employeeId: String, otp: String): Result<VerifyActivationResponse> {
        return try {
            val response = apiService.verifyActivation(VerifyActivationRequest(employeeId.trim(), otp.trim()))
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!)
            } else {
                val errorMsg = parseErrorMessage(response.errorBody()?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun setPassword(
        employeeId: String,
        activationToken: String,
        newPassword: String,
        confirmPassword: String
    ): Result<SetPasswordResponse> {
        return try {
            val response = apiService.setPassword(
                SetPasswordRequest(
                    employeeId = employeeId.trim(),
                    activationToken = activationToken.trim(),
                    newPassword = newPassword,
                    confirmPassword = confirmPassword
                )
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val token = body.effectiveToken
                if (!token.isNullOrBlank() && body.employee != null) {
                    saveSession(token, body.employee)
                }
                Result.success(body)
            } else {
                val errorMsg = parseErrorMessage(response.errorBody()?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun login(employeeId: String, password: String): Result<LoginResponse> {
        return try {
            val response = apiService.login(
                LoginRequest(
                    employeeId = employeeId.trim(),
                    password = password
                )
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val token = body.effectiveToken
                if (!token.isNullOrBlank() && body.employee != null) {
                    saveSession(token, body.employee)
                }
                Result.success(body)
            } else {
                val errorMsg = parseErrorMessage(response.errorBody()?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun refreshProfile(): Result<EmployeeProfile> {
        return try {
            val response = apiService.getMe()
            if (response.isSuccessful && response.body()?.employee != null) {
                val rawEmp = response.body()!!.employee!!
                val emp = rawEmp.copy(
                    name = rawEmp.displayName,
                    department = rawEmp.displayDepartment
                )
                _profile.value = emp
                tokenManager.employeeName = emp.name
                tokenManager.employeeDesignation = emp.designation
                tokenManager.employeeEmail = emp.email
                tokenManager.employeePhone = emp.contactNumber
                Result.success(emp)
            } else {
                if (response.code() == 401) {
                    logout()
                }
                val errorMsg = parseErrorMessage(response.errorBody()?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout() {
        try {
            apiService.logout()
        } catch (_: Exception) {
        } finally {
            tokenManager.clear()
            _isLoggedIn.value = false
            _profile.value = null
        }
    }

    private fun saveSession(token: String, employee: EmployeeProfile) {
        val resolvedName = employee.displayName
        val resolvedDept = employee.displayDepartment

        tokenManager.sessionToken = token
        tokenManager.employeeId = employee.employeeId
        tokenManager.employeeName = resolvedName
        tokenManager.employeeDesignation = employee.designation
        tokenManager.employeeEmail = employee.email
        tokenManager.employeePhone = employee.contactNumber

        _isLoggedIn.value = true
        _profile.value = employee.copy(
            name = resolvedName,
            department = resolvedDept
        )
    }

    private fun parseErrorMessage(errorBody: String?): String {
        if (errorBody.isNullOrBlank()) return "An unexpected error occurred. Please try again."
        return try {
            val json = JSONObject(errorBody)
            json.optString("message", json.optString("error", "Error processing request"))
        } catch (_: Exception) {
            "Error processing request. Please check your connection."
        }
    }
}
