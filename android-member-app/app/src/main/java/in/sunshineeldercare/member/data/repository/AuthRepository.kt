package `in`.sunshineeldercare.member.data.repository

import android.util.Log
import `in`.sunshineeldercare.member.data.api.ApiClient
import `in`.sunshineeldercare.member.data.api.ApiErrorParser
import `in`.sunshineeldercare.member.data.model.InitiateActivationRequest
import `in`.sunshineeldercare.member.data.model.InitiateActivationResponse
import `in`.sunshineeldercare.member.data.model.LoginRequest
import `in`.sunshineeldercare.member.data.model.LoginResponse
import `in`.sunshineeldercare.member.data.model.SetPasswordRequest
import `in`.sunshineeldercare.member.data.model.SetPasswordResponse
import `in`.sunshineeldercare.member.data.model.VerifyActivationRequest
import `in`.sunshineeldercare.member.data.model.VerifyActivationResponse
import `in`.sunshineeldercare.member.data.security.SecureSessionManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AuthRepository {

    private val TAG = "AuthRepository"
    private val api = ApiClient.service

    suspend fun login(memberId: String, password: String): Result<LoginResponse> =
        withContext(Dispatchers.IO) {
            try {
                val cleanId = memberId.trim().uppercase()
                val cleanPass = password.trim()
                Log.d(TAG, "Initiating login request for member ID: $cleanId")

                val response = api.login(LoginRequest(cleanId, cleanPass))
                Log.d(TAG, "Login API response code: ${response.code()}")

                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    val member = body.member
                    val sessionToken = body.token ?: SecureSessionManager.getAuthToken() ?: "token-active"
                    // Save member presentation metadata to secure session
                    SecureSessionManager.saveSession(
                        token = sessionToken,
                        memberId = member?.memberId ?: cleanId,
                        name = member?.name ?: "Sunshine Member",
                        gender = member?.gender
                    )
                    Log.d(TAG, "Login successful for member: ${member?.name}")
                    Result.success(body)
                } else {
                    val errorMsg = if (response.isSuccessful) {
                        response.body()?.error ?: "Invalid Member ID or password."
                    } else {
                        ApiErrorParser.parse(response, "Login failed")
                    }
                    val isActivationReq = response.code() == 403 ||
                            errorMsg.contains("not activated", ignoreCase = true) ||
                            errorMsg.contains("activation", ignoreCase = true)
                    Log.w(TAG, "Login rejected: $errorMsg (requiresActivation=$isActivationReq)")
                    if (isActivationReq) {
                        Result.failure(AccountNotActivatedException(errorMsg))
                    } else {
                        Result.failure(Exception(errorMsg))
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Login failure: ${e.javaClass.simpleName} - ${e.message}", e)
                val friendlyMessage = ApiErrorParser.mapThrowable(e, "Login failed. Please verify credentials.")
                Result.failure(Exception(friendlyMessage))
            }
        }

    suspend fun initiateActivation(memberId: String): Result<InitiateActivationResponse> =
        withContext(Dispatchers.IO) {
            try {
                val cleanId = memberId.trim().uppercase()
                val response = api.initiateActivation(InitiateActivationRequest(cleanId))
                if (response.isSuccessful && response.body()?.success == true) {
                    Result.success(response.body()!!)
                } else {
                    val errorMsg = if (response.isSuccessful) {
                        response.body()?.error ?: "Failed to initiate activation"
                    } else {
                        ApiErrorParser.parse(response, "Failed to initiate activation")
                    }
                    Result.failure(Exception(errorMsg))
                }
            } catch (e: Exception) {
                Log.e(TAG, "initiateActivation failure: ${e.message}", e)
                val friendlyMessage = ApiErrorParser.mapThrowable(e, "Unable to connect to the activation service. Please try again later.")
                Result.failure(Exception(friendlyMessage))
            }
        }

    suspend fun verifyActivation(memberId: String, otp: String): Result<VerifyActivationResponse> =
        withContext(Dispatchers.IO) {
            try {
                val cleanId = memberId.trim().uppercase()
                val cleanOtp = otp.trim()
                val response = api.verifyActivation(VerifyActivationRequest(cleanId, cleanOtp))
                if (response.isSuccessful && response.body()?.success == true) {
                    Result.success(response.body()!!)
                } else {
                    val errorMsg = if (response.isSuccessful) {
                        response.body()?.error ?: "Invalid or expired OTP"
                    } else {
                        ApiErrorParser.parse(response, "Invalid or expired OTP")
                    }
                    Result.failure(Exception(errorMsg))
                }
            } catch (e: Exception) {
                Log.e(TAG, "verifyActivation failure: ${e.message}", e)
                val friendlyMessage = ApiErrorParser.mapThrowable(e, "Invalid or expired OTP. Please check and try again.")
                Result.failure(Exception(friendlyMessage))
            }
        }

    suspend fun setPassword(memberId: String, activationToken: String, password: String): Result<SetPasswordResponse> =
        withContext(Dispatchers.IO) {
            try {
                val cleanId = memberId.trim().uppercase()
                val cleanToken = activationToken.trim()
                val response = api.setPassword(SetPasswordRequest(cleanId, cleanToken, password))
                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    val sessionToken = body.token ?: "member-session-active"
                    val member = body.member
                    SecureSessionManager.saveSession(
                        token = sessionToken,
                        memberId = member?.memberId ?: cleanId,
                        name = member?.name ?: "Sunshine Member",
                        gender = member?.gender
                    )
                    Result.success(body)
                } else {
                    val errorMsg = if (response.isSuccessful) {
                        response.body()?.error ?: "Failed to set password"
                    } else {
                        ApiErrorParser.parse(response, "Failed to set password")
                    }
                    Result.failure(Exception(errorMsg))
                }
            } catch (e: Exception) {
                Log.e(TAG, "setPassword failure: ${e.message}", e)
                val friendlyMessage = ApiErrorParser.mapThrowable(e, "Failed to set password. Please try again.")
                Result.failure(Exception(friendlyMessage))
            }
        }

    suspend fun logout(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            api.logout()
        } catch (_: Exception) {
            // Ignore network failures on logout
        } finally {
            SecureSessionManager.clearSession()
        }
        Result.success(Unit)
    }

    fun isAuthenticated(): Boolean = SecureSessionManager.isAuthenticated()

    fun getCachedMemberName(): String = SecureSessionManager.getMemberName() ?: "Member"

    fun getCachedMemberId(): String = SecureSessionManager.getMemberId() ?: "SEC/MEMBER"

    fun getCachedMemberGender(): String? = SecureSessionManager.getMemberGender()
}

class AccountNotActivatedException(message: String) : Exception(message)
