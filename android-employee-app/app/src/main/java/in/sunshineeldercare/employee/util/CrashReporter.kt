package `in`.sunshineeldercare.employee.util

import android.content.Context
import android.os.Build
import android.util.Log
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class CrashInfo(
    val timestamp: Long,
    val dateDisplay: String,
    val exceptionType: String,
    val message: String,
    val stackTrace: String,
    val threadName: String,
    val deviceInfo: String
)

object CrashReporter {

    private const val TAG = "SUNSHINE_CRASH"
    private const val PREFS_NAME = "sunshine_crash_reporter"
    private const val KEY_HAS_CRASHED = "has_crashed"
    private const val KEY_TIMESTAMP = "crash_timestamp"
    private const val KEY_EXCEPTION_TYPE = "crash_exception_type"
    private const val KEY_MESSAGE = "crash_message"
    private const val KEY_STACKTRACE = "crash_stacktrace"
    private const val KEY_THREAD = "crash_thread"
    private const val CRASH_FILE_NAME = "crash_log.txt"

    private var defaultHandler: Thread.UncaughtExceptionHandler? = null

    fun install(context: Context) {
        val appContext = context.applicationContext
        defaultHandler = Thread.getDefaultUncaughtExceptionHandler()

        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                recordCrash(appContext, thread, throwable)
            } catch (e: Throwable) {
                Log.e(TAG, "Failed to record crash", e)
            } finally {
                defaultHandler?.uncaughtException(thread, throwable)
            }
        }
    }

    fun recordCrash(context: Context, thread: Thread, throwable: Throwable) {
        val sw = StringWriter()
        val pw = PrintWriter(sw)
        throwable.printStackTrace(pw)
        val fullStackTrace = sw.toString()

        val exceptionName = throwable.javaClass.name
        val message = throwable.localizedMessage ?: throwable.message ?: "No error message"
        val timestamp = System.currentTimeMillis()
        val dateDisplay = SimpleDateFormat("dd MMM yyyy HH:mm:ss.SSS", Locale.ENGLISH).format(Date(timestamp))

        val deviceInfo = buildString {
            append("Model: ").append(Build.MANUFACTURER).append(" ").append(Build.MODEL).append("\n")
            append("Android OS: ").append(Build.VERSION.RELEASE).append(" (API ").append(Build.VERSION.SDK_INT).append(")\n")
            append("Device: ").append(Build.DEVICE).append(" / ").append(Build.PRODUCT).append("\n")
            append("Fingerprint: ").append(Build.FINGERPRINT)
        }

        Log.e(TAG, "================ FATAL ANDROID EXCEPTION CAUGHT ================")
        Log.e(TAG, "Timestamp: $dateDisplay")
        Log.e(TAG, "Thread: ${thread.name}")
        Log.e(TAG, "Exception: $exceptionName")
        Log.e(TAG, "Message: $message")
        Log.e(TAG, "Device:\n$deviceInfo")
        Log.e(TAG, "Stack Trace:\n$fullStackTrace")
        Log.e(TAG, "================================================================")

        // Save to SharedPreferences
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean(KEY_HAS_CRASHED, true)
                .putLong(KEY_TIMESTAMP, timestamp)
                .putString(KEY_EXCEPTION_TYPE, exceptionName)
                .putString(KEY_MESSAGE, message)
                .putString(KEY_STACKTRACE, fullStackTrace)
                .putString(KEY_THREAD, thread.name)
                .apply()
        } catch (e: Throwable) {
            Log.e(TAG, "Failed to write crash to SharedPreferences", e)
        }

        // Save to local file in filesDir
        try {
            val crashFile = File(context.filesDir, CRASH_FILE_NAME)
            val logContent = buildString {
                append("=== SUNSHINE EMPLOYEE APP FATAL CRASH LOG ===\n")
                append("Timestamp: ").append(dateDisplay).append("\n")
                append("Thread: ").append(thread.name).append("\n")
                append("Device: ").append(deviceInfo.replace("\n", " | ")).append("\n")
                append("Exception: ").append(exceptionName).append("\n")
                append("Message: ").append(message).append("\n\n")
                append("Stack Trace:\n").append(fullStackTrace).append("\n")
            }
            crashFile.writeText(logContent)
        } catch (e: Throwable) {
            Log.e(TAG, "Failed to write crash to file", e)
        }
    }

    fun hasPendingCrash(context: Context): Boolean {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.getBoolean(KEY_HAS_CRASHED, false)
        } catch (_: Throwable) {
            false
        }
    }

    fun getLastCrash(context: Context): CrashInfo? {
        return try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            if (!prefs.getBoolean(KEY_HAS_CRASHED, false)) return null

            val ts = prefs.getLong(KEY_TIMESTAMP, System.currentTimeMillis())
            val dateDisplay = SimpleDateFormat("dd MMM yyyy HH:mm:ss", Locale.ENGLISH).format(Date(ts))
            val ex = prefs.getString(KEY_EXCEPTION_TYPE, "Unknown Exception").orEmpty()
            val msg = prefs.getString(KEY_MESSAGE, "No message").orEmpty()
            val trace = prefs.getString(KEY_STACKTRACE, "No stack trace available").orEmpty()
            val thread = prefs.getString(KEY_THREAD, "main").orEmpty()

            val deviceInfo = "${Build.MANUFACTURER} ${Build.MODEL} (Android ${Build.VERSION.RELEASE}, API ${Build.VERSION.SDK_INT})"

            CrashInfo(
                timestamp = ts,
                dateDisplay = dateDisplay,
                exceptionType = ex,
                message = msg,
                stackTrace = trace,
                threadName = thread,
                deviceInfo = deviceInfo
            )
        } catch (_: Throwable) {
            null
        }
    }

    fun clearCrash(context: Context) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().clear().apply()
            val crashFile = File(context.filesDir, CRASH_FILE_NAME)
            if (crashFile.exists()) {
                crashFile.delete()
            }
        } catch (_: Throwable) {}
    }
}
