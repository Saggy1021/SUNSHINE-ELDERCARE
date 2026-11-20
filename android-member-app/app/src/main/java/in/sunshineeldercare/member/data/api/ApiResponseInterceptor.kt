package `in`.sunshineeldercare.member.data.api

import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

/**
 * Custom exception representing a non-JSON / HTML API response from the server.
 */
class NonJsonApiResponseException(message: String = "Unable to connect to the activation service. Please try again later.") : IOException(message)

/**
 * Network interceptor to validate that API responses are genuine JSON payloads
 * and never raw HTML web fallbacks, 404 pages, or gateway errors.
 */
class ApiResponseInterceptor : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)

        val path = request.url.encodedPath
        // Inspect all Sunshine API calls
        if (path.contains("/api/")) {
            val contentType = response.header("Content-Type")?.lowercase() ?: ""
            val isHtmlContentType = contentType.contains("text/html") || contentType.contains("text/plain")

            // If response is successful HTTP 2xx, verify it is not an HTML document disguised as 200
            if (response.isSuccessful) {
                if (contentType.contains("text/html")) {
                    throw NonJsonApiResponseException(
                        "Unable to connect to the activation service. Please try again later."
                    )
                }

                // Peek at the beginning of the body to detect HTML tags like <!DOCTYPE or <html
                val peek = response.peekBody(512).string().trimStart()
                if (peek.startsWith("<!DOCTYPE", ignoreCase = true) ||
                    peek.startsWith("<html", ignoreCase = true) ||
                    peek.startsWith("<")
                ) {
                    throw NonJsonApiResponseException(
                        "Unable to connect to the activation service. Please try again later."
                    )
                }
            }
        }

        return response
    }
}
