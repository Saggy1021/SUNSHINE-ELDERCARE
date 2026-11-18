package `in`.sunshineeldercare.employee.data.storage

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class SecureTokenManager(private val context: Context) {

    private val prefs: SharedPreferences by lazy {
        initPrefs()
    }

    private fun initPrefs(): SharedPreferences {
        return try {
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
        } catch (e: Throwable) {
            Log.e("SecureTokenManager", "Failed to initialize EncryptedSharedPreferences, falling back to standard prefs", e)
            getFallbackPrefs()
        }
    }

    private fun getFallbackPrefs(): SharedPreferences {
        return context.getSharedPreferences(PREFS_FILE_NAME + "_fallback", Context.MODE_PRIVATE)
    }

    private fun safeGetString(key: String): String? {
        return try {
            prefs.getString(key, null)
        } catch (e: Throwable) {
            Log.e("SecureTokenManager", "Error reading key $key from secure prefs, falling back", e)
            try {
                getFallbackPrefs().getString(key, null)
            } catch (_: Throwable) {
                null
            }
        }
    }

    private fun safePutString(key: String, value: String?) {
        try {
            prefs.edit().putString(key, value).apply()
        } catch (e: Throwable) {
            Log.e("SecureTokenManager", "Error writing key $key to secure prefs, writing to fallback", e)
            try {
                getFallbackPrefs().edit().putString(key, value).apply()
            } catch (_: Throwable) {}
        }
    }

    var sessionToken: String?
        get() = safeGetString(KEY_SESSION_TOKEN)
        set(value) = safePutString(KEY_SESSION_TOKEN, value)

    var employeeId: String?
        get() = safeGetString(KEY_EMPLOYEE_ID)
        set(value) = safePutString(KEY_EMPLOYEE_ID, value)

    var employeeName: String?
        get() = safeGetString(KEY_EMPLOYEE_NAME)
        set(value) = safePutString(KEY_EMPLOYEE_NAME, value)

    var employeeDesignation: String?
        get() = safeGetString(KEY_EMPLOYEE_DESIGNATION)
        set(value) = safePutString(KEY_EMPLOYEE_DESIGNATION, value)

    var employeeEmail: String?
        get() = safeGetString(KEY_EMPLOYEE_EMAIL)
        set(value) = safePutString(KEY_EMPLOYEE_EMAIL, value)

    var employeePhone: String?
        get() = safeGetString(KEY_EMPLOYEE_PHONE)
        set(value) = safePutString(KEY_EMPLOYEE_PHONE, value)

    val isLoggedIn: Boolean
        get() = !sessionToken.isNullOrBlank()

    fun clear() {
        try {
            prefs.edit().clear().apply()
        } catch (_: Throwable) {}
        try {
            getFallbackPrefs().edit().clear().apply()
        } catch (_: Throwable) {}
    }

    companion object {
        private const val PREFS_FILE_NAME = "sunshine_employee_secure_prefs"
        private const val KEY_SESSION_TOKEN = "session_token"
        private const val KEY_EMPLOYEE_ID = "employee_id"
        private const val KEY_EMPLOYEE_NAME = "employee_name"
        private const val KEY_EMPLOYEE_DESIGNATION = "employee_designation"
        private const val KEY_EMPLOYEE_EMAIL = "employee_email"
        private const val KEY_EMPLOYEE_PHONE = "employee_phone"
    }
}
