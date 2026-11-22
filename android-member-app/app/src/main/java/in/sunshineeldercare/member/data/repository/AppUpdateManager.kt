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

            // If target file already exists and passes verification, jump straight to ready
            if (targetApk.exists() && targetApk.length() == manifest.fileSize) {
                val valid = verifyDownloadedApk(context, targetApk, manifest.sha256, manifest.latestVersionCode)
                if (valid) {
                    _updateState.value = _updateState.value.copy(
                        status = UpdateStatus.READY_TO_INSTALL,
                        downloadProgress = 100,
                        downloadedApkFile = targetApk,
                        statusMessage = "Update ready to install."
                    )
                    return@withContext
                }
            }

            _updateState.value = _updateState.value.copy(
                status = UpdateStatus.DOWNLOADING,
                downloadProgress = 0,
                statusMessage = "Downloading Sunshine update..."
            )

            try {
                val request = Request.Builder()
                    .url(manifest.apkDownloadUrl)
                    .build()

                var response = httpClient.newCall(request).execute()

                // Resilient Fallback 1: If direct manifest URL returned 404, try canonical download route
                if (!response.isSuccessful && response.code == 404) {
                    Log.w(TAG, "Direct download URL returned 404. Attempting /api/apps/member-app/download...")
                    val origin = if (manifest.apkDownloadUrl.startsWith("http")) {
                        val uri = Uri.parse(manifest.apkDownloadUrl)
                        "${uri.scheme}://${uri.host}" + if (uri.port != -1 && uri.port != 80 && uri.port != 443) ":${uri.port}" else ""
                    } else {
                        "https://www.sunshineeldercare.in"
                    }
                    val fallbackUrl = "$origin/api/apps/member-app/download"
                    val fallbackRequest = Request.Builder().url(fallbackUrl).build()
                    val fallbackResponse = httpClient.newCall(fallbackRequest).execute()
                    if (fallbackResponse.isSuccessful) {
                        response = fallbackResponse
                        Log.i(TAG, "Fallback download succeeded via /api/apps/member-app/download")
                    } else if (fallbackResponse.code == 404) {
                        // Resilient Fallback 2: Try canonical static release binary alias
                        val staticUrl = "$origin/downloads/apps/Sunshine-Member-Release.apk"
                        val staticRequest = Request.Builder().url(staticUrl).build()
                        val staticResponse = httpClient.newCall(staticRequest).execute()
                        if (staticResponse.isSuccessful) {
                            response = staticResponse
                            Log.i(TAG, "Fallback download succeeded via /downloads/apps/Sunshine-Member-Release.apk")
                        }
                    }
                }

                if (!response.isSuccessful) {
                    val errorReason = when (response.code) {
                        404 -> "The update package is currently being deployed to our servers. Please try again shortly or contact support at 033-40585515."
                        401, 403 -> "Update download authorization failed. Please contact support."
                        in 500..599 -> "The distribution server is temporarily unavailable (HTTP ${response.code}). Please try again in a few minutes."
                        else -> "Download server returned HTTP ${response.code}."
                    }
                    throw Exception(errorReason)
                }

                val body = response.body ?: throw Exception("Empty download response body")
                val totalBytes = if (manifest.fileSize > 0) manifest.fileSize else body.contentLength()

                val digest = MessageDigest.getInstance("SHA-256")
                val input = body.byteStream()
                val output = FileOutputStream(tempApk)

                val buffer = ByteArray(8192)
                var bytesRead: Int
                var downloadedBytes = 0L
                var lastReportedProgress = 0

                while (input.read(buffer).also { bytesRead = it } != -1) {
                    // Periodically check if emergency started during download
                    if (SosOutboxManager.hasActiveOrPendingEmergency()) {
                        output.close()
                        input.close()
                        tempApk.delete()
                        Log.w(TAG, "Download cancelled due to active SOS.")
                        _updateState.value = _updateState.value.copy(status = UpdateStatus.IDLE)
                        return@withContext
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

                output.flush()
                output.close()
                input.close()

                // Verify SHA-256 Checksum
                val calculatedSha = digest.digest().joinToString("") { "%02x".format(it) }
                if (!calculatedSha.equals(manifest.sha256, ignoreCase = true)) {
                    tempApk.delete()
                    throw Exception("SHA-256 checksum mismatch. Expected: ${manifest.sha256}, Got: $calculatedSha")
                }

                // Verify Package Name & Signing Certificate
                val isValidApk = verifyDownloadedApk(context, tempApk, manifest.sha256, manifest.latestVersionCode)
                if (!isValidApk) {
                    tempApk.delete()
                    throw Exception("APK signature or package verification failed.")
                }

                // Atomically rename to final target file
                if (targetApk.exists()) targetApk.delete()
                tempApk.renameTo(targetApk)

                _updateState.value = _updateState.value.copy(
                    status = UpdateStatus.READY_TO_INSTALL,
                    downloadProgress = 100,
                    downloadedApkFile = targetApk,
                    statusMessage = "Update ready to install."
                )
                Log.i(TAG, "Update successfully downloaded, verified and ready: ${targetApk.name}")

            } catch (e: Exception) {
                Log.e(TAG, "Download error", e)
                if (tempApk.exists()) tempApk.delete()
                val friendlyError = when {
                    e is java.net.SocketTimeoutException ->
                        "Connection timed out while downloading update. Please check your internet connection."
                    e is java.net.UnknownHostException ->
                        "Unable to reach update server. Please check your network connection."
                    e.message?.startsWith("SHA-256 checksum mismatch") == true ->
                        "Download verification failed: the file was incomplete or corrupted. Please try downloading again."
                    e.message?.startsWith("APK signature") == true ->
                        "Security verification failed: invalid digital signature. Download cancelled for your safety."
                    else -> e.message ?: "Download failed. Please try again later."
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
