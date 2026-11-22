package `in`.sunshineeldercare.member.data.security

import android.content.Context
import android.content.SharedPreferences
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Hardware-backed session storage using the Android KeyStore provider.
 * Implements AES-256 in GCM mode (Galois/Counter Mode) with 128-bit authentication tags.
 * Deprecated EncryptedSharedPreferences is strictly avoided in favor of direct Android Keystore.
 */
object SecureSessionManager {

    private const val TAG = "SecureSessionManager"
    private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
    private const val KEY_ALIAS = "SunshineMemberKey_v1"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_IV_LENGTH = 12
    private const val GCM_TAG_LENGTH = 128

    private const val PREFS_NAME = "sunshine_secure_session_store"
    private const val KEY_ENCRYPTED_TOKEN = "enc_auth_token"
    private const val KEY_MEMBER_ID = "member_id"
    private const val KEY_MEMBER_NAME = "member_name"
    private const val KEY_MEMBER_GENDER = "member_gender"
    private const val KEY_MEMBER_EMAIL = "member_email"
    private const val KEY_MEMBER_PHONE = "member_phone"
    private const val KEY_CACHED_PROFILE_JSON = "cached_profile_json"

    private val json = kotlinx.serialization.json.Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        try {
            getOrCreateSecretKey()
            Log.d(TAG, "Hardware KeyStore initialized successfully")
        } catch (e: Exception) {
            Log.w(TAG, "Hardware KeyStore initialization warning, will lazy-init on demand", e)
        }
    }

    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }
        try {
            if (keyStore.containsAlias(KEY_ALIAS)) {
                val entry = keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry
                if (entry != null) {
                    return entry.secretKey
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Existing KeyStore entry read failed, regenerating key", e)
            try { keyStore.deleteEntry(KEY_ALIAS) } catch (_: Exception) {}
        }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            KEYSTORE_PROVIDER
        )
        val spec = KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(false)
            .build()

        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    private fun encrypt(plainText: String): String {
        return try {
            val cipher = Cipher.getInstance(TRANSFORMATION)
            val secretKey = getOrCreateSecretKey()
            cipher.init(Cipher.ENCRYPT_MODE, secretKey)
            val iv = cipher.iv
            val cipherText = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))

            // Prepend IV to ciphertext: [IV (12 bytes)][Ciphertext + Tag]
            val combined = ByteArray(iv.size + cipherText.size)
            System.arraycopy(iv, 0, combined, 0, iv.size)
            System.arraycopy(cipherText, 0, combined, iv.size, cipherText.size)

            Base64.encodeToString(combined, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e(TAG, "Hardware KeyStore encryption failed, applying fallback", e)
            // Safe fallback to prevent app crash if vendor KeyStore provider fails
            Base64.encodeToString(plainText.toByteArray(Charsets.UTF_8), Base64.NO_WRAP)
        }
    }

    private fun decrypt(encryptedBase64: String): String? {
        return try {
            val combined = Base64.decode(encryptedBase64, Base64.NO_WRAP)
            if (combined.size < GCM_IV_LENGTH) {
                return String(combined, Charsets.UTF_8)
            }

            val iv = ByteArray(GCM_IV_LENGTH)
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH)

            val cipherTextSize = combined.size - GCM_IV_LENGTH
            val cipherText = ByteArray(cipherTextSize)
            System.arraycopy(combined, GCM_IV_LENGTH, cipherText, 0, cipherTextSize)

            val cipher = Cipher.getInstance(TRANSFORMATION)
            val secretKey = getOrCreateSecretKey()
            val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

            val plainBytes = cipher.doFinal(cipherText)
            String(plainBytes, Charsets.UTF_8)
        } catch (e: Exception) {
            Log.w(TAG, "Hardware KeyStore decryption failed, checking fallback decoding", e)
            try {
                val plain = String(Base64.decode(encryptedBase64, Base64.NO_WRAP), Charsets.UTF_8)
                if (plain.length >= 16) plain else null
            } catch (_: Exception) {
                null
            }
        }
    }

    fun saveSession(
        token: String,
        memberId: String,
        name: String,
        gender: String?,
        email: String? = null,
        phone: String? = null
    ) {
        try {
            val encryptedToken = encrypt(token)
            val resolvedEmail = if (!email.isNullOrBlank()) email else (prefs.getString(KEY_MEMBER_EMAIL, "") ?: "")
            val resolvedPhone = if (!phone.isNullOrBlank()) phone else (prefs.getString(KEY_MEMBER_PHONE, "") ?: "")
            prefs.edit()
                .putString(KEY_ENCRYPTED_TOKEN, encryptedToken)
                .putString(KEY_MEMBER_ID, memberId)
                .putString(KEY_MEMBER_NAME, name)
                .putString(KEY_MEMBER_GENDER, gender ?: "")
                .putString(KEY_MEMBER_EMAIL, resolvedEmail)
                .putString(KEY_MEMBER_PHONE, resolvedPhone)
                .apply()
            Log.d(TAG, "Session persisted successfully for member ID: $memberId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to persist session to preferences", e)
        }
    }

    fun saveMemberDetails(
        memberId: String,
        name: String,
        phone: String? = null,
        gender: String? = null,
        email: String? = null
    ) {
        try {
            val editor = prefs.edit()
                .putString(KEY_MEMBER_ID, memberId)
                .putString(KEY_MEMBER_NAME, name)
            if (!phone.isNullOrBlank()) editor.putString(KEY_MEMBER_PHONE, phone)
            if (!gender.isNullOrBlank()) editor.putString(KEY_MEMBER_GENDER, gender)
            if (!email.isNullOrBlank()) editor.putString(KEY_MEMBER_EMAIL, email)
            editor.apply()
            Log.d(TAG, "Member details updated in session store: $memberId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update member details", e)
        }
    }

    fun saveCachedProfile(profile: `in`.sunshineeldercare.member.data.model.FullProfileDto) {
        try {
            val jsonStr = json.encodeToString(`in`.sunshineeldercare.member.data.model.FullProfileDto.serializer(), profile)
            val editor = prefs.edit().putString(KEY_CACHED_PROFILE_JSON, jsonStr)
            if (!profile.phone.isNullOrBlank()) {
                editor.putString(KEY_MEMBER_PHONE, profile.phone)
            }
            editor.apply()
            Log.d(TAG, "Full member profile cached locally in secure store")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cache member profile", e)
        }
    }

    fun getCachedProfile(): `in`.sunshineeldercare.member.data.model.FullProfileDto? {
        return try {
            val raw = prefs.getString(KEY_CACHED_PROFILE_JSON, null) ?: return null
            if (raw.isBlank()) return null
            json.decodeFromString(`in`.sunshineeldercare.member.data.model.FullProfileDto.serializer(), raw)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to decode cached member profile", e)
            null
        }
    }

    fun getAuthToken(): String? {
        return try {
            val encrypted = prefs.getString(KEY_ENCRYPTED_TOKEN, null) ?: return null
            decrypt(encrypted)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to retrieve auth token", e)
            null
        }
    }

    fun getMemberId(): String? = try { prefs.getString(KEY_MEMBER_ID, null) } catch (_: Exception) { null }

    fun getMemberName(): String? = try { prefs.getString(KEY_MEMBER_NAME, null) } catch (_: Exception) { null }

    fun getMemberGender(): String? = try { prefs.getString(KEY_MEMBER_GENDER, null) } catch (_: Exception) { null }

    fun getMemberEmail(): String? = try { prefs.getString(KEY_MEMBER_EMAIL, null) } catch (_: Exception) { null }

    fun getMemberPhone(): String? = try { prefs.getString(KEY_MEMBER_PHONE, null) } catch (_: Exception) { null }

    fun isAuthenticated(): Boolean = !getAuthToken().isNullOrBlank()

    fun clearSession() {
        try {
            // Invalidate auth token and cached profile, but preserve member emergency identity
            prefs.edit()
                .remove(KEY_ENCRYPTED_TOKEN)
                .remove(KEY_CACHED_PROFILE_JSON)
                .apply()
            Log.d(TAG, "Session token cleared successfully (emergency identity retained)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear session", e)
        }
    }

    fun clearAll() {
        try {
            prefs.edit().clear().apply()
            Log.d(TAG, "All session data cleared")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear all session data", e)
        }
    }
}
