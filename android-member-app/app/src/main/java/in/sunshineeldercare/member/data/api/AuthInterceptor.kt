package `in`.sunshineeldercare.member.data.api

import android.util.Log
import `in`.sunshineeldercare.member.data.security.SecureSessionManager
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor : Interceptor {

    private val TAG = "AuthInterceptor"

    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val requestBuilder = original.newBuilder()

        try {
            val token = SecureSessionManager.getAuthToken()
            if (!token.isNullOrBlank()) {
                val cleanToken = token.trim().replace("\n", "").replace("\r", "")
                requestBuilder.header("Authorization", "Bearer $cleanToken")
                requestBuilder.header("Cookie", "sunshine_member_session=$cleanToken; sunshine_member_token=$cleanToken")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to attach session credentials", e)
        }

        requestBuilder.header("Accept", "application/json")

        val response = chain.proceed(requestBuilder.build())

        // Capture session cookie from login response headers if present
        try {
            if (original.url.encodedPath.contains("auth/login") && response.isSuccessful) {
                val cookies = response.headers("Set-Cookie")
                Log.d(TAG, "auth/login returned HTTP ${response.code} with ${cookies.size} Set-Cookie headers")
                for (rawCookie in cookies) {
                    val cookie = rawCookie.trim()
                    if (cookie.startsWith("sunshine_member_session=")) {
                        val rawValue = cookie.substringAfter("sunshine_member_session=").substringBefore(";")
                        if (rawValue.isNotBlank()) {
                            val memberId = SecureSessionManager.getMemberId() ?: ""
                            val name = SecureSessionManager.getMemberName() ?: ""
                            val gender = SecureSessionManager.getMemberGender()
                            val email = SecureSessionManager.getMemberEmail()
                            SecureSessionManager.saveSession(rawValue, memberId, name, gender, email)
                            Log.d(TAG, "Session token captured from Set-Cookie (sunshine_member_session)")
                            break
                        }
                    } else if (cookie.startsWith("sunshine_member_token=")) {
                        val rawValue = cookie.substringAfter("sunshine_member_token=").substringBefore(";")
                        if (rawValue.isNotBlank()) {
                            val memberId = SecureSessionManager.getMemberId() ?: ""
                            val name = SecureSessionManager.getMemberName() ?: ""
                            val gender = SecureSessionManager.getMemberGender()
                            val email = SecureSessionManager.getMemberEmail()
                            SecureSessionManager.saveSession(rawValue, memberId, name, gender, email)
                            Log.d(TAG, "Session token captured from Set-Cookie (sunshine_member_token)")
                            break
                        }
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to process login Set-Cookie header", e)
        }

        // Automatic session invalidation on 401
        if (response.code == 401 && !original.url.encodedPath.contains("auth/login")) {
            Log.w(TAG, "Received HTTP 401 on ${original.url.encodedPath}, clearing session")
            SecureSessionManager.clearSession()
        }

        return response
    }
}
