package `in`.sunshineeldercare.member.data.repository

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import androidx.work.*
import `in`.sunshineeldercare.member.data.model.AppManifestResponse
import `in`.sunshineeldercare.member.service.AppUpdateCheckWorker
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

enum class UpdateStatus {
    IDLE,
    CHECKING,
    UP_TO_DATE,
    UPDATE_AVAILABLE,
    DOWNLOADING,
    READY_TO_INSTALL,
    INSTALLING,
    ERROR
}

data class AppUpdateState(
    val status: UpdateStatus = UpdateStatus.IDLE,
    val currentVersionName: String = "1.0.0",
    val currentVersionCode: Int = 1,
    val latestVersionName: String? = null,
    val latestVersionCode: Int? = null,
    val releaseNotes: String? = null,
    val fileSize: Long = 0L,
    val downloadProgress: Int = 0,
    val downloadedApkFile: File? = null,
    val isAutoUpdateEnabled: Boolean = true,
    val statusMessage: String? = null,
    val errorMessage: String? = null
)

object AppUpdateManager {

    private const val TAG = "AppUpdateManager"
    const val MANIFEST_URL = "https://www.sunshineeldercare.in/api/apps/member-app/manifest"
    const val EXPECTED_PACKAGE_NAME = "in.sunshineeldercare.member"
    const val EXPECTED_CERT_FINGERPRINT = "370b03fd0c87a9a4620e41fac3859ceeb81ab98752c7673f272548793c4f3394"

    private const val PREFS_NAME = "sunshine_member_updates"
    private const val KEY_AUTO_UPDATE = "key_auto_update_enabled"
    private const val KEY_LAST_CHECK = "key_last_check_timestamp"

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
    }

    private val isChecking = java.util.concurrent.atomic.AtomicBoolean(false)
    private val isDownloading = java.util.concurrent.atomic.AtomicBoolean(false)

    private val managerScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var appContext: Context? = null
    private var prefs: SharedPreferences? = null

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .retryOnConnectionFailure(true)
        .build()

    private val _updateState = MutableStateFlow(AppUpdateState())
    val updateState: StateFlow<AppUpdateState> = _updateState.asStateFlow()

    fun init(context: Context) {
        val ctx = context.applicationContext
        appContext = ctx
        prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        val autoEnabled = prefs?.getBoolean(KEY_AUTO_UPDATE, true) ?: true
        val (verName, verCode) = getCurrentAppVersion(ctx)

        _updateState.value = AppUpdateState(
            currentVersionName = verName,
            currentVersionCode = verCode,
            isAutoUpdateEnabled = autoEnabled
        )

        schedulePeriodicCheckWorker(ctx)

        // Check if an already-verified APK exists in cache from prior download
        checkExistingDownloadedApk(ctx, verCode)

        // Perform initial startup check in background
        checkForUpdates(isManual = false)
    }

    fun setAutoUpdateEnabled(enabled: Boolean) {
        prefs?.edit()?.putBoolean(KEY_AUTO_UPDATE, enabled)?.apply()
        _updateState.value = _updateState.value.copy(isAutoUpdateEnabled = enabled)
        if (enabled && _updateState.value.status == UpdateStatus.UPDATE_AVAILABLE) {
            checkForUpdates(isManual = true)
        }
    }

    fun onAppForegrounded() {
        val lastCheck = prefs?.getLong(KEY_LAST_CHECK, 0L) ?: 0L
        val hoursSince = (System.currentTimeMillis() - lastCheck) / (1000 * 60 * 60)
        if (hoursSince >= 6) {
            checkForUpdates(isManual = false)
        }
    }

    fun checkForUpdates(isManual: Boolean = false) {
        val ctx = appContext ?: return

        // Emergency Safeguard: Never check or download updates during active SOS
        if (SosOutboxManager.hasActiveOrPendingEmergency()) {
            Log.i(TAG, "Update check paused: active emergency in progress.")
            return
        }

        // Atomic Concurrency Guard: Prevent duplicate overlapping update checks
        if (!isChecking.compareAndSet(false, true)) {
            Log.i(TAG, "Update check already in progress; ignoring duplicate trigger.")
            return
        }

        managerScope.launch {
            try {
                _updateState.value = _updateState.value.copy(
                    status = UpdateStatus.CHECKING,
                    statusMessage = "Checking for official Sunshine updates...",
                    errorMessage = null
                )

                val request = Request.Builder()
                    .url(MANIFEST_URL)
                    .addHeader("Accept", "application/json")
                    .addHeader("Cache-Control", "no-cache, no-store, must-revalidate")
                    .addHeader("Pragma", "no-cache")
                    .build()

                val response = httpClient.newCall(request).execute()
                if (!response.isSuccessful) {
                    throw Exception("Failed to fetch manifest: HTTP ${response.code}")
                }

                val bodyStr = response.body?.string() ?: throw Exception("Empty manifest response")
                val manifest = json.decodeFromString<AppManifestResponse>(bodyStr)

                prefs?.edit()?.putLong(KEY_LAST_CHECK, System.currentTimeMillis())?.apply()

                val currentCode = _updateState.value.currentVersionCode

                if (manifest.latestVersionCode > currentCode) {
                    Log.i(TAG, "New release detected: v${manifest.latestVersionName} (${manifest.latestVersionCode})")
                    _updateState.value = _updateState.value.copy(
                        status = UpdateStatus.UPDATE_AVAILABLE,
                        latestVersionName = manifest.latestVersionName,
                        latestVersionCode = manifest.latestVersionCode,
                        releaseNotes = manifest.releaseNotes,
                        fileSize = manifest.fileSize,
                        statusMessage = "Version ${manifest.latestVersionName} is available."
                    )

                    // Auto-download if enabled or manually triggered
                    if (_updateState.value.isAutoUpdateEnabled || isManual) {
                        downloadAndVerifyApk(ctx, manifest)
                    }
                } else {
                    _updateState.value = _updateState.value.copy(
                        status = UpdateStatus.UP_TO_DATE,
                        latestVersionName = manifest.latestVersionName,
                        latestVersionCode = manifest.latestVersionCode,
                        statusMessage = "Your Sunshine Member App is up to date."
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to check for updates", e)
                _updateState.value = _updateState.value.copy(
                    status = if (isManual) UpdateStatus.ERROR else UpdateStatus.IDLE,
                    errorMessage = if (isManual) "Unable to check for updates: ${e.message}" else null,
                    statusMessage = null
                )
            } finally {
                isChecking.set(false)
            }
        }
    }

    private suspend fun downloadAndVerifyApk(
        context: Context,
        manifest: AppManifestResponse
    ) = withContext(Dispatchers.IO) {
        // Atomic Concurrency Guard: Ensure only one download attempt runs at a time
        if (!isDownloading.compareAndSet(false, true)) {
            Log.i(TAG, "Download already in progress; ignoring duplicate attempt.")
            return@withContext
        }

        try {
            // Emergency Safeguard
            if (SosOutboxManager.hasActiveOrPendingEmergency()) {
                Log.w(TAG, "Download aborted: active emergency.")
                return@withContext
            }

            val updatesDir = File(context.cacheDir, "updates")
            if (!updatesDir.exists()) updatesDir.mkdirs()

            val targetApk = File(updatesDir, "Sunshine-Member-${manifest.latestVersionCode}.apk")
            val tempApk = File(updatesDir, "Sunshine-Member-${manifest.latestVersionCode}.apk.tmp")

            // Always clean up any stale or leftover temp file from prior interrupted download
            if (tempApk.exists()) {
                tempApk.delete()
            }

            // If target file already exists and passes verification, jump straight to ready
            if (targetApk.exists() && (manifest.fileSize <= 0L || targetApk.length() == manifest.fileSize)) {
                val valid = verifyDownloadedApk(context, targetApk, manifest.sha256, manifest.latestVersionCode)
                if (valid) {
                    _updateState.value = _updateState.value.copy(
                        status = UpdateStatus.READY_TO_INSTALL,
                        downloadProgress = 100,
                        downloadedApkFile = targetApk,
                        statusMessage = "Update ready to install.",
                        errorMessage = null
                    )
                    return@withContext
                } else {
                    targetApk.delete() // Stale or corrupt target APK
                }
            }

            _updateState.value = _updateState.value.copy(
                status = UpdateStatus.DOWNLOADING,
                downloadProgress = 0,
                statusMessage = "Downloading Sunshine update...",
                errorMessage = null
            )

            // Resolve Origin and Candidate Download URLs
            val origin = if (manifest.apkDownloadUrl.startsWith("http")) {
                val uri = Uri.parse(manifest.apkDownloadUrl)
                "${uri.scheme}://${uri.host}" + if (uri.port != -1 && uri.port != 80 && uri.port != 443) ":${uri.port}" else ""
            } else {
                "https://www.sunshineeldercare.in"
            }

            val timestamp = System.currentTimeMillis()
            val candidateUrls = linkedSetOf<String>().apply {
                if (manifest.apkDownloadUrl.isNotBlank()) {
                    add(manifest.apkDownloadUrl)
                }
                add("$origin/api/apps/member-app/download/Sunshine-Member-Release.apk?v=${manifest.latestVersionCode}&t=$timestamp")
                add("$origin/api/apps/member-app/download?v=${manifest.latestVersionCode}&t=$timestamp")
                add("$origin/downloads/apps/Sunshine-Member-v${manifest.latestVersionName}-b${manifest.latestVersionCode}.apk")
                add("$origin/downloads/apps/Sunshine-Member-Release.apk?t=$timestamp")
            }.toList()

            var downloadSuccess = false
            var lastFailureReason = "Download failed."
            var lastExpectedSha = manifest.sha256
            var lastReceivedSha: String? = null

            for ((index, candidateUrl) in candidateUrls.withIndex()) {
                if (SosOutboxManager.hasActiveOrPendingEmergency()) {
                    Log.w(TAG, "Download cancelled due to active SOS.")
                    if (tempApk.exists()) tempApk.delete()
                    _updateState.value = _updateState.value.copy(status = UpdateStatus.IDLE)
                    return@withContext
                }

                Log.i(TAG, "Attempting update download candidate [${index + 1}/${candidateUrls.size}]: $candidateUrl")

                if (tempApk.exists()) tempApk.delete()

                try {
                    val request = Request.Builder()
                        .url(candidateUrl)
                        .header("Cache-Control", "no-cache, no-store, must-revalidate")
                        .header("Pragma", "no-cache")
                        .header("User-Agent", "SunshineMemberApp/${_updateState.value.currentVersionName} (Build ${_updateState.value.currentVersionCode}; Android ${Build.VERSION.SDK_INT})")
                        .header("Accept", "application/vnd.android.package-archive, application/octet-stream, */*")
                        .build()

                    val response = httpClient.newCall(request).execute()

                    // Ensure complete content (Reject 206 Partial Content or HTTP errors)
                    if (!response.isSuccessful || response.code != 200) {
                        val code = response.code
                        response.close()
                        Log.w(TAG, "Candidate ${index + 1} returned HTTP $code.")
                        lastFailureReason = when (code) {
                            404 -> "The update package is currently being deployed to our servers. Please try again shortly or contact support at 033-40585515."
                            401, 403 -> "Update download authorization failed. Please contact support."
                            in 500..599 -> "The distribution server is temporarily unavailable (HTTP $code). Please try again in a few minutes."
                            else -> "Download server returned HTTP $code."
                        }
                        continue
                    }

                    val body = response.body
                    if (body == null) {
                        response.close()
                        Log.w(TAG, "Candidate ${index + 1} returned empty response body.")
                        lastFailureReason = "Empty download response body from server."
                        continue
                    }

                    val contentLength = body.contentLength()
                    val totalBytes = if (manifest.fileSize > 0) manifest.fileSize else contentLength

                    val digest = MessageDigest.getInstance("SHA-256")
                    val input = body.byteStream()
                    val output = FileOutputStream(tempApk)

                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    var downloadedBytes = 0L
                    var lastReportedProgress = 0
                    var streamInterrupted = false

                    try {
                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            if (SosOutboxManager.hasActiveOrPendingEmergency()) {
                                streamInterrupted = true
                                Log.w(TAG, "Download stream cancelled due to active SOS.")
                                break
                            }

                            output.write(buffer, 0, bytesRead)
                            digest.update(buffer, 0, bytesRead)
                            downloadedBytes += bytesRead

                            if (totalBytes > 0) {
                                val progress = ((downloadedBytes * 100) / totalBytes).toInt().coerceIn(0, 100)
                                if (progress != lastReportedProgress) {
                                    lastReportedProgress = progress
                                    _updateState.value = _updateState.value.copy(downloadProgress = progress)
                                }
                            }
                        }
                    } finally {
                        try { output.flush() } catch (_: Exception) {}
                        try { output.close() } catch (_: Exception) {}
                        try { input.close() } catch (_: Exception) {}
                        try { response.close() } catch (_: Exception) {}
                    }

                    if (streamInterrupted) {
                        if (tempApk.exists()) tempApk.delete()
                        _updateState.value = _updateState.value.copy(status = UpdateStatus.IDLE)
                        return@withContext
                    }

                    // 1. Partial / Incomplete Stream Check
                    if (manifest.fileSize > 0 && downloadedBytes != manifest.fileSize) {
                        Log.w(TAG, "Candidate ${index + 1} size mismatch: received $downloadedBytes bytes, expected ${manifest.fileSize} bytes.")
                        if (tempApk.exists()) tempApk.delete()
                        lastFailureReason = "Download verification failed: the file was incomplete or corrupted. Please try downloading again."
                        continue
                    } else if (contentLength > 0 && downloadedBytes != contentLength) {
                        Log.w(TAG, "Candidate ${index + 1} stream truncated: received $downloadedBytes bytes, header stated $contentLength bytes.")
                        if (tempApk.exists()) tempApk.delete()
                        lastFailureReason = "Download stream ended prematurely. Please check your internet connection."
                        continue
                    }

                    // 2. Full Streaming SHA-256 Verification
                    val calculatedSha = digest.digest().joinToString("") { "%02x".format(it) }
                    lastReceivedSha = calculatedSha

                    if (!calculatedSha.equals(manifest.sha256, ignoreCase = true)) {
                        Log.w(TAG, "Candidate ${index + 1} SHA-256 mismatch! Expected: ${manifest.sha256}, Got: $calculatedSha. URL: $candidateUrl")
                        if (tempApk.exists()) tempApk.delete()
                        lastFailureReason = "Download verification failed: received SHA-256 does not match manifest. Expected: ${manifest.sha256.take(8)}..., Got: ${calculatedSha.take(8)}..."
                        continue
                    }

                    // 3. Verify Package Name & Signing Certificate
                    val isValidApk = verifyDownloadedApk(context, tempApk, manifest.sha256, manifest.latestVersionCode)
                    if (!isValidApk) {
                        Log.w(TAG, "Candidate ${index + 1} APK package/signature verification failed.")
                        if (tempApk.exists()) tempApk.delete()
                        lastFailureReason = "Security verification failed: invalid digital signature. Download cancelled for your safety."
                        continue
                    }

                    // 4. Atomically commit temp file to target file
                    if (targetApk.exists()) targetApk.delete()
                    val renamed = tempApk.renameTo(targetApk)
                    if (!renamed) {
                        tempApk.copyTo(targetApk, overwrite = true)
                        tempApk.delete()
                    }

                    _updateState.value = _updateState.value.copy(
                        status = UpdateStatus.READY_TO_INSTALL,
                        downloadProgress = 100,
                        downloadedApkFile = targetApk,
                        statusMessage = "Update ready to install.",
                        errorMessage = null
                    )
                    Log.i(TAG, "Update successfully downloaded and verified via candidate ${index + 1}: ${targetApk.name}")
                    downloadSuccess = true
                    break

                } catch (e: Exception) {
                    Log.e(TAG, "Error on download candidate ${index + 1} ($candidateUrl)", e)
                    if (tempApk.exists()) tempApk.delete()
                    lastFailureReason = when {
                        e is java.net.SocketTimeoutException ->
                            "Connection timed out while downloading update. Please check your internet connection."
                        e is java.net.UnknownHostException ->
                            "Unable to reach update server. Please check your network connection."
                        else -> e.message ?: "Download connection error."
                    }
                }
            }

            if (!downloadSuccess) {
                if (tempApk.exists()) tempApk.delete()
                val friendlyError = if (lastReceivedSha != null && !lastReceivedSha.equals(lastExpectedSha, ignoreCase = true)) {
                    "Download verification failed: the file was incomplete or corrupted. Please try downloading again."
                } else {
                    lastFailureReason
                }
                _updateState.value = _updateState.value.copy(
                    status = UpdateStatus.ERROR,
                    errorMessage = "Download failed: $friendlyError",
                    statusMessage = null
                )
            }

        } finally {
            isDownloading.set(false)
        }
    }

    /**
     * Verifies package archive integrity, package name, version, and signing certificate.
     */
    private fun verifyDownloadedApk(
        context: Context,
        apkFile: File,
        expectedSha: String,
        expectedVersionCode: Int
    ): Boolean {
        try {
            val pm = context.packageManager
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageManager.GET_SIGNING_CERTIFICATES
            } else {
                @Suppress("DEPRECATION")
                PackageManager.GET_SIGNATURES
            }

            val pkgInfo = pm.getPackageArchiveInfo(apkFile.absolutePath, flags) ?: run {
                Log.e(TAG, "Could not parse APK archive info.")
                return false
            }

            // 1. Verify Package Name
            if (pkgInfo.packageName != EXPECTED_PACKAGE_NAME) {
                Log.e(TAG, "Package name mismatch: ${pkgInfo.packageName} != $EXPECTED_PACKAGE_NAME")
                return false
            }

            // 2. Verify Version Code
            val apkVersionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pkgInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                pkgInfo.versionCode
            }
            if (apkVersionCode < expectedVersionCode) {
                Log.e(TAG, "Version code mismatch: $apkVersionCode < $expectedVersionCode")
                return false
            }

            // 3. Verify Signing Certificate SHA-256 Fingerprint
            val certFingerprint = extractCertFingerprint(pkgInfo)
            if (certFingerprint == null || !certFingerprint.equals(EXPECTED_CERT_FINGERPRINT, ignoreCase = true)) {
                Log.e(TAG, "Certificate fingerprint mismatch: $certFingerprint != $EXPECTED_CERT_FINGERPRINT")
                return false
            }

            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error verifying APK", e)
            return false
        }
    }

    private fun extractCertFingerprint(pkgInfo: PackageInfo): String? {
        try {
            val signatures = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pkgInfo.signingInfo?.apkContentsSigners
            } else {
                @Suppress("DEPRECATION")
                pkgInfo.signatures
            }

            val sig = signatures?.firstOrNull() ?: return null
            val digest = MessageDigest.getInstance("SHA-256")
            val hash = digest.digest(sig.toByteArray())
            return hash.joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to compute certificate fingerprint", e)
            return null
        }
    }

    /**
     * Prompts the user to install the downloaded update using Android's native package installer.
     */
    fun startInstallation(activity: Activity) {
        // Emergency Safeguard
        if (SosOutboxManager.hasActiveOrPendingEmergency()) {
            _updateState.value = _updateState.value.copy(
                errorMessage = "Installation paused: an active emergency incident is in progress. Safety comes first."
            )
            return
        }

        val apkFile = _updateState.value.downloadedApkFile ?: run {
            _updateState.value = _updateState.value.copy(errorMessage = "APK file not found on device.")
            return
        }

        // Check Unknown Sources Permission on Android 8.0+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (!activity.packageManager.canRequestPackageInstalls()) {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${activity.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(intent)
                _updateState.value = _updateState.value.copy(
                    statusMessage = "Please allow Sunshine Member App to install updates, then return here."
                )
                return
            }
        }

        try {
            val contentUri = FileProvider.getUriForFile(
                activity,
                "${activity.packageName}.fileprovider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            _updateState.value = _updateState.value.copy(
                status = UpdateStatus.INSTALLING,
                statusMessage = "Starting Sunshine system update installer..."
            )

            activity.startActivity(installIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch package installer", e)
            _updateState.value = _updateState.value.copy(
                status = UpdateStatus.ERROR,
                errorMessage = "Could not open installer: ${e.message}"
            )
        }
    }

    private fun checkExistingDownloadedApk(context: Context, currentCode: Int) {
        try {
            val updatesDir = File(context.cacheDir, "updates")
            if (updatesDir.exists()) {
                val apks = updatesDir.listFiles { f -> f.extension == "apk" } ?: return
                for (apk in apks) {
                    val pm = context.packageManager
                    val info = pm.getPackageArchiveInfo(apk.absolutePath, 0)
                    if (info != null) {
                        val ver = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode.toInt() else @Suppress("DEPRECATION") info.versionCode
                        if (ver <= currentCode) {
                            apk.delete() // Clean up older already-installed APK
                        }
                    }
                }
            }
        } catch (_: Exception) {}
    }

    private fun schedulePeriodicCheckWorker(context: Context) {
        try {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<AppUpdateCheckWorker>(
                24, TimeUnit.HOURS,
                6, TimeUnit.HOURS
            )
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "periodic_app_update_check",
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule periodic update check", e)
        }
    }

    private fun getCurrentAppVersion(context: Context): Pair<String, Int> {
        return try {
            val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            val code = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode.toInt()
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode
            }
            Pair(pInfo.versionName ?: "1.0.0", code)
        } catch (_: Exception) {
            Pair("1.0.0", 1)
        }
    }
}
