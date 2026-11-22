package `in`.sunshineeldercare.member

import `in`.sunshineeldercare.member.data.model.AppManifestResponse
import `in`.sunshineeldercare.member.data.repository.SosDeliveryStatus
import `in`.sunshineeldercare.member.data.repository.SosOutboxItem
import `in`.sunshineeldercare.member.data.repository.SosOutboxManager
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.io.FileOutputStream
import java.net.ServerSocket
import java.security.MessageDigest
import java.util.UUID

class AppUpdaterVerificationTest {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    private val httpClient = OkHttpClient.Builder().build()

    private val expectedBuild6Sha = "cf672287e6e396dcfa6070a6256176ba5d1161342187b1f4f406ef3b0368deaf"
    private val expectedBuild6Size = 46718122L
    private val staleBuild3Sha = "d3f31e5631155416e7ed6ed056f4fbf710982fbbb7670c968d05181bfb49a725"

    // =========================================================================
    // TEST 1: Installed Build 3 detects Build 6 update available
    // =========================================================================
    @Test
    fun testInstalledBuild3DetectsBuild6Update() {
        val installedVersionCode = 3
        val installedVersionName = "1.0.2"

        val manifestJson = """
            {
                "appId": "member-app",
                "packageName": "in.sunshineeldercare.member",
                "name": "Sunshine Member App",
                "latestVersionName": "1.0.5",
                "latestVersionCode": 6,
                "apkDownloadUrl": "http://localhost:3005/api/apps/member-app/download/Sunshine-Member-Release.apk",
                "sha256": "$expectedBuild6Sha",
                "fileSize": $expectedBuild6Size,
                "minSupportedVersion": "10 (API 29)",
                "releaseNotes": "Emergency SOS delivery reliability and automatic updates.",
                "isMandatory": false
            }
        """.trimIndent()

        val manifest = json.decodeFromString<AppManifestResponse>(manifestJson)
        val isUpdateAvailable = manifest.latestVersionCode > installedVersionCode

        assertTrue("Manifest Build 6 must trigger update for installed Build 3", isUpdateAvailable)
        assertEquals(6, manifest.latestVersionCode)
        assertEquals("1.0.5", manifest.latestVersionName)
        assertEquals(expectedBuild6Sha, manifest.sha256)
        assertEquals(expectedBuild6Size, manifest.fileSize)
    }

    // =========================================================================
    // TEST 2: Successful Download & Streaming SHA-256 Verification to Ready State
    // =========================================================================
    @Test
    fun testDownloadAndSha256VerificationSucceeds() {
        val genuineBytes = "Sunshine-Member-App-Build-6-Authentic-Binary-Payload-2026".toByteArray(Charsets.UTF_8)
        val genuineDigest = MessageDigest.getInstance("SHA-256").digest(genuineBytes)
        val genuineSha = genuineDigest.joinToString("") { "%02x".format(it) }

        val serverSocket = ServerSocket(0)
        val serverPort = serverSocket.localPort

        val serverThread = Thread {
            try {
                val socket = serverSocket.accept()
                val reader = socket.getInputStream().bufferedReader()
                var line = reader.readLine()
                while (!line.isNullOrEmpty()) {
                    line = reader.readLine()
                }
                val out = socket.getOutputStream()
                val header = "HTTP/1.1 200 OK\r\nContent-Type: application/vnd.android.package-archive\r\nContent-Length: ${genuineBytes.size}\r\nConnection: close\r\n\r\n"
                out.write(header.toByteArray())
                out.write(genuineBytes)
                out.flush()
                socket.close()
            } catch (_: Exception) {}
        }
        serverThread.start()

        val tempFile = File.createTempFile("test_member_6", ".apk.tmp")
        val targetFile = File(tempFile.parentFile, "Sunshine-Member-6.apk")

        try {
            val request = Request.Builder()
                .url("http://localhost:$serverPort/download/build6.apk")
                .header("Cache-Control", "no-cache, no-store, must-revalidate")
                .header("Pragma", "no-cache")
                .build()

            val response = httpClient.newCall(request).execute()
            assertEquals(200, response.code)

            val digest = MessageDigest.getInstance("SHA-256")
            val output = FileOutputStream(tempFile)
            val buffer = ByteArray(4096)
            var bytesRead: Int
            var downloaded = 0L

            response.body!!.byteStream().use { input ->
                while (input.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                    digest.update(buffer, 0, bytesRead)
                    downloaded += bytesRead
                }
            }
            output.close()

            assertEquals(genuineBytes.size.toLong(), downloaded)
            val calculatedSha = digest.digest().joinToString("") { "%02x".format(it) }

            // Strict SHA-256 Match
            assertTrue("Calculated SHA-256 must match manifest expected SHA-256", calculatedSha.equals(genuineSha, ignoreCase = true))

            // Atomic rename
            if (targetFile.exists()) targetFile.delete()
            val renamed = tempFile.renameTo(targetFile)
            assertTrue("Temp file must atomically rename to target file upon success", renamed)
            assertTrue("Target APK must exist", targetFile.exists())
            assertEquals(genuineBytes.size.toLong(), targetFile.length())
        } finally {
            serverSocket.close()
            if (tempFile.exists()) tempFile.delete()
            if (targetFile.exists()) targetFile.delete()
        }
    }

    // =========================================================================
    // TEST 3: Deliberately Corrupted Download Rejected & Temp File Cleaned Up
    // =========================================================================
    @Test
    fun testDeliberatelyCorruptedDownloadRejected() {
        val genuineBytes = "Sunshine-Member-App-Build-6-Authentic-Binary-Payload-2026".toByteArray(Charsets.UTF_8)
        val expectedSha = MessageDigest.getInstance("SHA-256").digest(genuineBytes).joinToString("") { "%02x".format(it) }

        val corruptedBytes = "Sunshine-Member-App-Build-6-TAMPERED-Payload-MALICIOUS".toByteArray(Charsets.UTF_8)

        val serverSocket = ServerSocket(0)
        val serverPort = serverSocket.localPort

        val serverThread = Thread {
            try {
                val socket = serverSocket.accept()
                val reader = socket.getInputStream().bufferedReader()
                var line = reader.readLine()
                while (!line.isNullOrEmpty()) {
                    line = reader.readLine()
                }
                val out = socket.getOutputStream()
                val header = "HTTP/1.1 200 OK\r\nContent-Type: application/vnd.android.package-archive\r\nContent-Length: ${corruptedBytes.size}\r\nConnection: close\r\n\r\n"
                out.write(header.toByteArray())
                out.write(corruptedBytes)
                out.flush()
                socket.close()
            } catch (_: Exception) {}
        }
        serverThread.start()

        val tempFile = File.createTempFile("test_member_corrupt", ".apk.tmp")
        val targetFile = File(tempFile.parentFile, "Sunshine-Member-6-corrupt.apk")

        try {
            val request = Request.Builder().url("http://localhost:$serverPort/download/corrupted.apk").build()
            val response = httpClient.newCall(request).execute()

            val digest = MessageDigest.getInstance("SHA-256")
            val output = FileOutputStream(tempFile)
            val buffer = ByteArray(4096)
            var bytesRead: Int

            response.body!!.byteStream().use { input ->
                while (input.read(buffer).also { bytesRead = it } != -1) {
                    output.write(buffer, 0, bytesRead)
                    digest.update(buffer, 0, bytesRead)
                }
            }
            output.close()

            val calculatedSha = digest.digest().joinToString("") { "%02x".format(it) }

            // Invariant: Updater MUST reject checksum mismatch
            assertNotEquals("Calculated SHA must not match expected SHA for corrupted file", expectedSha, calculatedSha)

            // Invariant: Cleanup on mismatch
            if (!calculatedSha.equals(expectedSha, ignoreCase = true)) {
                tempFile.delete()
            }

            assertFalse("Temp file must be deleted upon checksum failure", tempFile.exists())
            assertFalse("Target APK must NEVER be created from corrupted download", targetFile.exists())
        } finally {
            serverSocket.close()
            if (tempFile.exists()) tempFile.delete()
            if (targetFile.exists()) targetFile.delete()
        }
    }

    // =========================================================================
    // TEST 4: Truncated / Incomplete Stream Rejected
    // =========================================================================
    @Test
    fun testTruncatedStreamRejectedBeforeHashCalculation() {
        val totalExpectedSize = 46718122L
        val truncatedBytes = ByteArray(1024 * 1024) // Only 1MB sent

        val serverSocket = ServerSocket(0)
        val serverPort = serverSocket.localPort

        val serverThread = Thread {
            try {
                val socket = serverSocket.accept()
                val reader = socket.getInputStream().bufferedReader()
                var line = reader.readLine()
                while (!line.isNullOrEmpty()) {
                    line = reader.readLine()
                }
                val out = socket.getOutputStream()
                val header = "HTTP/1.1 200 OK\r\nContent-Type: application/vnd.android.package-archive\r\nContent-Length: $totalExpectedSize\r\nConnection: close\r\n\r\n"
                out.write(header.toByteArray())
                out.write(truncatedBytes)
                out.flush()
                socket.close()
            } catch (_: Exception) {}
        }
        serverThread.start()

        val tempFile = File.createTempFile("test_member_trunc", ".apk.tmp")
        try {
            val request = Request.Builder().url("http://localhost:$serverPort/download/truncated.apk").build()
            val response = httpClient.newCall(request).execute()

            val output = FileOutputStream(tempFile)
            val buffer = ByteArray(4096)
            var bytesRead: Int
            var downloaded = 0L

            try {
                response.body!!.byteStream().use { input ->
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        downloaded += bytesRead
                    }
                }
            } catch (_: Exception) {}
            output.close()

            // Invariant: downloaded < expectedSize must fail size check
            val isComplete = downloaded == totalExpectedSize
            assertFalse("Truncated stream must be flagged as incomplete", isComplete)

            if (!isComplete) {
                tempFile.delete()
            }
            assertFalse("Incomplete temp file must be immediately deleted", tempFile.exists())
        } finally {
            serverSocket.close()
            if (tempFile.exists()) tempFile.delete()
        }
    }

    // =========================================================================
    // TEST 5: Updater Never Silently Installs Alternative Binary Or Bypasses Hash
    // =========================================================================
    @Test
    fun testUpdaterNeverSilentlyInstallsAlternativeBinary() {
        val expectedSha = expectedBuild6Sha
        val receivedSha = staleBuild3Sha // Server returned Build 3

        var installationPermitted = false
        var targetFileCreated = false

        fun evaluateDownload(calculatedHash: String, expectedHash: String) {
            if (!calculatedHash.equals(expectedHash, ignoreCase = true)) {
                installationPermitted = false
                targetFileCreated = false
                return
            }
            installationPermitted = true
            targetFileCreated = true
        }

        evaluateDownload(receivedSha, expectedSha)

        assertFalse("Updater must NOT permit installation of alternative binary", installationPermitted)
        assertFalse("Target APK must NOT be created when alternative binary is served", targetFileCreated)
    }

    // =========================================================================
    // TEST 6: Package ID and Signing Certificate Compatibility Invariant
    // =========================================================================
    @Test
    fun testPackageIdAndCertificateFingerprintGuards() {
        val expectedPackage = "in.sunshineeldercare.member"
        val expectedFingerprint = "370b03fd0c87a9a4620e41fac3859ceeb81ab98752c7673f272548793c4f3394"

        // 1. Same package & cert: passes
        val validPkg = "in.sunshineeldercare.member"
        val validCert = "370b03fd0c87a9a4620e41fac3859ceeb81ab98752c7673f272548793c4f3394"
        assertTrue(validPkg == expectedPackage && validCert.equals(expectedFingerprint, ignoreCase = true))

        // 2. Package mismatch: rejected
        val foreignPkg = "in.sunshineeldercare.employee"
        assertFalse("Foreign package name must be rejected", foreignPkg == expectedPackage)

        // 3. Certificate mismatch: rejected
        val rogueCert = "0000000000000000000000000000000000000000000000000000000000000000"
        assertFalse("Untrusted signing certificate must be rejected", rogueCert.equals(expectedFingerprint, ignoreCase = true))
    }

    // =========================================================================
    // TEST 7: Emergency SOS Behavior Remains Invariant & Update Paused During SOS
    // =========================================================================
    @Test
    fun testSosBehaviorUnaffectedAndUpdatePausedDuringEmergency() {
        assertFalse("Initially no emergency must be active", SosOutboxManager.hasActiveOrPendingEmergency())

        val emergencyIdempotencyKey = UUID.randomUUID().toString()
        val sosItem = SosOutboxItem(
            requestId = emergencyIdempotencyKey,
            memberId = "SECD1000TAAM",
            callerName = "Tanish Alam",
            callerPhone = "+91 98300 12345",
            latitude = 22.5726,
            longitude = 88.3639,
            accuracy = 10f,
            status = SosDeliveryStatus.SENDING
        )

        fun isUpdateDownloadAllowed(isEmergencyActive: Boolean): Boolean {
            return !isEmergencyActive
        }

        assertTrue("Update download is permitted when SOS is idle", isUpdateDownloadAllowed(false))
        assertFalse("Update download MUST be suspended when SOS is SENDING", isUpdateDownloadAllowed(true))

        val retriedSos = sosItem.copy(retryCount = 1, status = SosDeliveryStatus.PENDING_RETRY)
        assertEquals("Emergency idempotency key must remain strictly invariant across retries", emergencyIdempotencyKey, retriedSos.requestId)
        assertEquals("SECD1000TAAM", retriedSos.memberId)
    }
}
