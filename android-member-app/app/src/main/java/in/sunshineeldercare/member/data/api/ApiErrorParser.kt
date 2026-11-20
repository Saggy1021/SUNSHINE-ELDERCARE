package `in`.sunshineeldercare.member.data.api

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.Response

/**
 * Robust utility for safely parsing HTTP error responses and mapping exceptions
 * to user-friendly messages without exposing raw HTML or serialization stack traces.
 */
object ApiErrorParser {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    /**
     * Extracts a structured error message from a non-2xx Retrofit response.
     */
    fun parse(response: Response<*>, defaultError: String = "Request failed"): String {
        try {
            val rawContentType = response.raw().header("Content-Type")?.lowercase() ?: ""
            val errorBodyStr = response.errorBody()?.string()?.trim()

            if (errorBodyStr.isNullOrBlank()) {
                return when (response.code()) {
                    401 -> "Unauthorized. Please verify your credentials."
                    403 -> "Account inactive or unauthorized. Please contact Sunshine Eldercare."
                    404 -> "Service endpoint or record not found."
                    500 -> "Server encountered an error. Please try again later."
                    else -> "$defaultError (HTTP ${response.code()})"
                }
            }

            // Check if response body is HTML
            if (rawContentType.contains("text/html") ||
                errorBodyStr.startsWith("<") ||
                errorBodyStr.contains("<!DOCTYPE", ignoreCase = true) ||
                errorBodyStr.contains("<html", ignoreCase = true)
            ) {
                return "Unable to connect to the activation service. Please try again later."
            }

            // Attempt to parse structured JSON error
            try {
                val element = json.parseToJsonElement(errorBodyStr)
                if (element is JsonObject) {
                    val error = element["error"]?.jsonPrimitive?.contentOrNull
                    if (!error.isNullOrBlank()) return error

                    val message = element["message"]?.jsonPrimitive?.contentOrNull
                    if (!message.isNullOrBlank()) return message
                }
            } catch (_: Exception) {
                // Ignore JSON parsing failure and fall back
            }

            return "$defaultError (HTTP ${response.code()})"
        } catch (_: Exception) {
            return "Unable to connect to the activation service. Please try again later."
        }
    }

    /**
     * Maps throwables to user-friendly messages.
     * Prevents technical stack traces or JSON decoding errors from reaching the user.
     */
    fun mapThrowable(e: Throwable, defaultMessage: String = "An unexpected error occurred"): String {
        val msg = e.message ?: ""
        return when {
            e is NonJsonApiResponseException -> {
                e.message ?: "Unable to connect to the activation service. Please try again later."
            }
            e is kotlinx.serialization.SerializationException ||
            e.javaClass.name.contains("SerializationException") ||
            msg.contains("Unexpected JSON token") ||
            msg.contains("Expected start of the object") ||
            msg.contains("<!DOCTYPE") ||
            msg.contains("<html") -> {
                "Unable to connect to the activation service. Please try again later."
            }
            e is java.net.UnknownHostException -> {
                "Unable to reach Sunshine Eldercare server. Please check your internet connection."
            }
            e is java.net.ConnectException -> {
                "Unable to connect to Sunshine Eldercare network. Please check your internet connection."
            }
            e is java.net.SocketTimeoutException -> {
                "Connection timed out. Please verify your connection and try again."
            }
            msg.isNotBlank() -> msg
            else -> defaultMessage
        }
    }
}
