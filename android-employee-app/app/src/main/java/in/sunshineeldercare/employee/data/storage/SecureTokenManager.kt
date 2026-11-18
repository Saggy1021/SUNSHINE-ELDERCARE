package `in`.sunshineeldercare.employee.data.storage

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureTokenManager(context: Context) {

    private val prefs: SharedPreferences by lazy {
        try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                PREFS_FILE_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            // Fallback for edge cases in testing environments
            context.getSharedPreferences(PREFS_FILE_NAME + "_fallback", Context.MODE_PRIVATE)
        }
    }

    var sessionToken: String?
        get() = prefs.getString(KEY_SESSION_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_SESSION_TOKEN, value).apply()

    var employeeId: String?
        get() = prefs.getString(KEY_EMPLOYEE_ID, null)
        set(value) = prefs.edit().putString(KEY_EMPLOYEE_ID, value).apply()

    var employeeName: String?
        get() = prefs.getString(KEY_EMPLOYEE_NAME, null)
        set(value) = prefs.edit().putString(KEY_EMPLOYEE_NAME, value).apply()

    var employeeDesignation: String?
        get() = prefs.getString(KEY_EMPLOYEE_DESIGNATION, null)
        set(value) = prefs.edit().putString(KEY_EMPLOYEE_DESIGNATION, value).apply()

    var employeeEmail: String?
        get() = prefs.getString(KEY_EMPLOYEE_EMAIL, null)
        set(value) = prefs.edit().putString(KEY_EMPLOYEE_EMAIL, value).apply()

    val isLoggedIn: Boolean
        get() = !sessionToken.isNullOrBlank()

    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val PREFS_FILE_NAME = "sunshine_employee_secure_prefs"
        private const val KEY_SESSION_TOKEN = "session_token"
        private const val KEY_EMPLOYEE_ID = "employee_id"
        private const val KEY_EMPLOYEE_NAME = "employee_name"
        private const val KEY_EMPLOYEE_DESIGNATION = "employee_designation"
        private const val KEY_EMPLOYEE_EMAIL = "employee_email"
    }
}
