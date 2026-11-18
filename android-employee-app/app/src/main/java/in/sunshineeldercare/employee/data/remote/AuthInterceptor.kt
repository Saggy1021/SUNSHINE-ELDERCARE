package `in`.sunshineeldercare.employee.data.remote

import `in`.sunshineeldercare.employee.data.storage.SecureTokenManager
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor(
    private val tokenManager: SecureTokenManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = tokenManager.sessionToken

        val requestBuilder = originalRequest.newBuilder()
            .header("Accept", "application/json")
            .header("User-Agent", "SunshineEmployeeApp/1.0.0 (Android)")

        if (!token.isNullOrBlank()) {
            requestBuilder.header("Authorization", "Bearer $token")
        }

        val response = chain.proceed(requestBuilder.build())

        // If backend returns 401 Unauthorized, invalidate local session
        if (response.code == 401) {
            tokenManager.clear()
        }

        return response
    }
}
