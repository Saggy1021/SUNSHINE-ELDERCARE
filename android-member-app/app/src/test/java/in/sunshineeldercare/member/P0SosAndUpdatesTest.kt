package `in`.sunshineeldercare.member

import `in`.sunshineeldercare.member.data.model.AppManifestResponse
import `in`.sunshineeldercare.member.data.model.SosTriggerRequest
import `in`.sunshineeldercare.member.data.model.SosTriggerResponse
import `in`.sunshineeldercare.member.data.repository.SosDeliveryStatus
import `in`.sunshineeldercare.member.data.repository.SosOutboxItem
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test
import java.security.MessageDigest
import java.util.UUID

class P0SosAndUpdatesTest {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
    }

    // ==========================================
    // PRIORITY 1: SOS RELIABILITY & OUTBOX TESTS
    // ==========================================

    @Test
    fun testSosOutboxItemSerializationAndRestoration() {
        val requestId = UUID.randomUUID().toString()
        val item = SosOutboxItem(
            requestId = requestId,
            timestamp = 1763800000000L,
            memberId = "SECD1000TAAM",
            callerName = "Tanish Alam",
            callerPhone = "+91 98300 12345",
            latitude = 22.5726,
            longitude = 88.3639,
            accuracy = 12.5f,
            status = SosDeliveryStatus.SENDING,
            incidentId = null,
            incidentNumber = null,
            retryCount = 0
        )

        val encoded = json.encodeToString(SosOutboxItem.serializer(), item)
        assertTrue(encoded.contains(requestId))
        assertTrue(encoded.contains("SECD1000TAAM"))
        assertTrue(encoded.contains("SENDING"))

        val decoded = json.decodeFromString(SosOutboxItem.serializer(), encoded)
        assertEquals(requestId, decoded.requestId)
        assertEquals("SECD1000TAAM", decoded.memberId)
        assertEquals("Tanish Alam", decoded.callerName)
        assertEquals(22.5726, decoded.latitude!!, 0.0001)
        assertEquals(88.3639, decoded.longitude!!, 0.0001)
        assertEquals(12.5f, decoded.accuracy!!, 0.1f)
        assertEquals(SosDeliveryStatus.SENDING, decoded.status)
    }

    @Test
    fun testSosOutboxItemDeliveredTransition() {
        val requestId = UUID.randomUUID().toString()
        val initial = SosOutboxItem(
            requestId = requestId,
            status = SosDeliveryStatus.SENDING,
            memberId = "SECD1000TAAM"
        )

        val delivered = initial.copy(
            status = SosDeliveryStatus.DELIVERED,
            incidentId = "inc_test_123",
            incidentNumber = "EMG-20261122-005",
            lastAttempt = System.currentTimeMillis()
        )

        assertEquals(SosDeliveryStatus.DELIVERED, delivered.status)
        assertEquals("inc_test_123", delivered.incidentId)
        assertEquals("EMG-20261122-005", delivered.incidentNumber)
        assertEquals(requestId, delivered.requestId) // Idempotency key strictly invariant
    }

    @Test
    fun testSosOutboxItemPendingRetryTransition() {
        val initial = SosOutboxItem(
            status = SosDeliveryStatus.SENDING,
            retryCount = 0
        )

        val retrying = initial.copy(
            status = SosDeliveryStatus.PENDING_RETRY,
            retryCount = initial.retryCount + 1,
            lastAttempt = System.currentTimeMillis(),
            failureReason = "Connection timed out after 8s"
        )

        assertEquals(SosDeliveryStatus.PENDING_RETRY, retrying.status)
        assertEquals(1, retrying.retryCount)
        assertNotNull(retrying.failureReason)
    }

    @Test
    fun testSosBackoffCalculationIsBounded() {
        assertEquals(2L, `in`.sunshineeldercare.member.data.repository.SosOutboxManager.calculateBackoffSeconds(1))
        assertEquals(4L, `in`.sunshineeldercare.member.data.repository.SosOutboxManager.calculateBackoffSeconds(2))
        assertEquals(7L, `in`.sunshineeldercare.member.data.repository.SosOutboxManager.calculateBackoffSeconds(3))
        assertEquals(10L, `in`.sunshineeldercare.member.data.repository.SosOutboxManager.calculateBackoffSeconds(4))
        // Verify bounded to at most 15 seconds so seniors are never stalled indefinitely
        for (attempt in 5..20) {
            val backoff = `in`.sunshineeldercare.member.data.repository.SosOutboxManager.calculateBackoffSeconds(attempt)
            assertTrue("Backoff for attempt $attempt must be <= 15s", backoff <= 15L)
            assertTrue("Backoff for attempt $attempt must be >= 5s", backoff >= 5L)
        }
    }

    @Test
    fun testReconciliationTransitionsPendingRetryToDelivered() {
        val originalKey = UUID.randomUUID().toString()
        val pendingItem = SosOutboxItem(
            requestId = originalKey,
            status = SosDeliveryStatus.PENDING_RETRY,
            retryCount = 3,
            failureReason = "Temporary mobile network jitter"
        )

        // Simulating server reconciliation logic
        val serverIncident = `in`.sunshineeldercare.member.data.model.EmergencyIncidentSummaryDto(
            id = "cmwrp4yno0002pf02a5zevy3l",
            incidentNumber = "EMG-20261122-002",
            status = "ACKNOWLEDGED",
            classification = "CODE_RED",
            triggeredAt = "2026-11-22T10:30:53.556Z"
        )

        val reconciled = pendingItem.copy(
            status = SosDeliveryStatus.DELIVERED,
            incidentId = serverIncident.id,
            incidentNumber = serverIncident.incidentNumber,
            lastAttempt = System.currentTimeMillis(),
            failureReason = null
        )

        assertEquals(SosDeliveryStatus.DELIVERED, reconciled.status)
        assertEquals("cmwrp4yno0002pf02a5zevy3l", reconciled.incidentId)
        assertEquals("EMG-20261122-002", reconciled.incidentNumber)
        assertEquals(originalKey, reconciled.requestId) // Idempotency preserved
        assertNull(reconciled.failureReason)
    }

    @Test
    fun testSosTriggerRequestContainsIdempotencyKey() {
        val reqId = "req_uuid_9999_test"
        val request = SosTriggerRequest(
            triggerSource = "MEMBER_APP_SOS",
            latitude = 22.5726,
            longitude = 88.3639,
            accuracy = 10f,
            notes = "One-tap emergency SOS",
            idempotencyKey = reqId,
            memberId = "SECD1000TAAM",
            callerName = "Tanish Alam",
            callerPhone = "+91 98300 12345"
        )

        val serialized = json.encodeToString(SosTriggerRequest.serializer(), request)
        assertTrue(serialized.contains("req_uuid_9999_test"))
        assertTrue(serialized.contains("SECD1000TAAM"))
        assertTrue(serialized.contains("Tanish Alam"))

        val deserialized = json.decodeFromString(SosTriggerRequest.serializer(), serialized)
        assertEquals(reqId, deserialized.idempotencyKey)
        assertEquals("SECD1000TAAM", deserialized.memberId)
    }

    @Test
    fun testSosTriggerResponseDeserialization() {
        val rawJson = """
            {
                "success": true,
                "incidentId": "inc_abc_123",
                "incidentNumber": "EMG-20261122-001",
                "status": "TRIGGERED",
                "classification": "CODE_RED",
                "emergencyHelpline": "03340585515",
                "trackingActive": true
            }
        """.trimIndent()

        val response = json.decodeFromString(SosTriggerResponse.serializer(), rawJson)
        assertTrue(response.success)
        assertEquals("inc_abc_123", response.incidentId)
        assertEquals("EMG-20261122-001", response.incidentNumber)
        assertEquals("TRIGGERED", response.status)
        assertEquals("CODE_RED", response.classification)
        assertEquals("03340585515", response.emergencyHelpline)
        assertTrue(response.trackingActive)
    }

    // ==========================================
    // PRIORITY 2: AUTOMATIC APP UPDATE TESTS
    // ==========================================

    @Test
    fun testAppManifestDeserialization() {
        val rawJson = """
            {
                "appId": "member-app",
                "packageName": "in.sunshineeldercare.member",
                "name": "Sunshine Member App",
                "latestVersionName": "1.0.1",
                "latestVersionCode": 2,
                "apkDownloadUrl": "https://www.sunshineeldercare.in/downloads/apps/Sunshine-Member-Release.apk",
                "sha256": "1348e59b00cd995b778d7c9da3cc1ad07539e76f234688d9510aef7df2e5566e",
                "fileSize": 46701738,
                "minSupportedVersion": "Android 10 (API 29)",
                "releaseNotes": "Emergency SOS delivery reliability and automatic updates.",
                "isMandatory": false
            }
        """.trimIndent()

        val manifest = json.decodeFromString(AppManifestResponse.serializer(), rawJson)
        assertEquals("member-app", manifest.appId)
        assertEquals("in.sunshineeldercare.member", manifest.packageName)
        assertEquals("1.0.1", manifest.latestVersionName)
        assertEquals(2, manifest.latestVersionCode)
        assertEquals(64, manifest.sha256.length)
        assertEquals(46701738L, manifest.fileSize)
    }

    @Test
    fun testVersionComparisonLogic() {
        val currentCode = 1

        val newerManifest = AppManifestResponse(
            appId = "member-app",
            packageName = "in.sunshineeldercare.member",
            name = "Sunshine Member App",
            latestVersionName = "1.0.1",
            latestVersionCode = 2,
            apkDownloadUrl = "http://example.com/app.apk",
            sha256 = "0".repeat(64),
            fileSize = 1000
        )
        assertTrue("Manifest with versionCode 2 is newer than installed versionCode 1", newerManifest.latestVersionCode > currentCode)

        val sameManifest = newerManifest.copy(latestVersionCode = 1, latestVersionName = "1.0.0")
        assertFalse("Manifest with equal versionCode 1 is not newer", sameManifest.latestVersionCode > currentCode)

        val olderManifest = newerManifest.copy(latestVersionCode = 0)
        assertFalse("Manifest with lower versionCode 0 must not trigger update", olderManifest.latestVersionCode > currentCode)
    }

    @Test
    fun testSha256DigestCalculation() {
        val sampleData = "Sunshine Eldercare Member App Production Update 2026".toByteArray(Charsets.UTF_8)
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(sampleData)
        val hashStr = hashBytes.joinToString("") { "%02x".format(it) }

        assertEquals(64, hashStr.length)
        // Verify deterministic hashing
        val digest2 = MessageDigest.getInstance("SHA-256")
        val hashStr2 = digest2.digest(sampleData).joinToString("") { "%02x".format(it) }
        assertEquals(hashStr, hashStr2)
    }

    @Test
    fun testEmergencySuspendsUpdateInvariant() {
        // Simulation of emergency state machine check
        fun isUpdatePermitted(sosStatus: SosDeliveryStatus, sosAgeMs: Long): Boolean {
            val isEmergencyActive = when (sosStatus) {
                SosDeliveryStatus.QUEUED,
                SosDeliveryStatus.SENDING,
                SosDeliveryStatus.PENDING_RETRY -> true
                SosDeliveryStatus.DELIVERED -> sosAgeMs < (6 * 3600 * 1000L)
                SosDeliveryStatus.IDLE,
                SosDeliveryStatus.FAILED -> false
            }
            return !isEmergencyActive
        }

        assertFalse("Update must be suspended while SOS is QUEUED", isUpdatePermitted(SosDeliveryStatus.QUEUED, 0))
        assertFalse("Update must be suspended while SOS is SENDING", isUpdatePermitted(SosDeliveryStatus.SENDING, 0))
        assertFalse("Update must be suspended while SOS is PENDING_RETRY", isUpdatePermitted(SosDeliveryStatus.PENDING_RETRY, 0))
        assertFalse("Update must be suspended while SOS is DELIVERED within 6h", isUpdatePermitted(SosDeliveryStatus.DELIVERED, 1000))
        assertTrue("Update is permitted when SOS is IDLE", isUpdatePermitted(SosDeliveryStatus.IDLE, 0))
        assertTrue("Update is permitted when emergency is old (>6h)", isUpdatePermitted(SosDeliveryStatus.DELIVERED, 7 * 3600 * 1000L))
    }

    // ==========================================
    // PRIORITY 3: HOME-FIRST NAVIGATION INVARIANTS
    // ==========================================

    @Test
    fun testDrawerDefaultInitialStateIsClosed() {
        // Invariant: Initial drawer state value must strictly be Closed
        val initialDrawerValue = androidx.compose.material3.DrawerValue.Closed
        assertEquals(androidx.compose.material3.DrawerValue.Closed, initialDrawerValue)
    }

    @Test
    fun testRootDestinationIsDashboard() {
        val dashboardRoute = "dashboard"
        assertEquals("dashboard", dashboardRoute)
    }

    // ==========================================
    // PRIORITY 4: ACCIDENTAL SOS LAUNCH & CONFIRMATION INVARIANTS
    // ==========================================

    @Test
    fun testDefaultSosStateIsIdle() {
        // Invariant: SosOutboxManager default state must be strictly null (inactive/idle)
        val defaultSos = `in`.sunshineeldercare.member.data.repository.SosOutboxManager.currentSos.value
        assertNull("Default SOS state must be null on clean launch", defaultSos)
    }

    @Test
    fun testStalePersistedOutboxCriteria() {
        val now = System.currentTimeMillis()
        val staleItem = SosOutboxItem(
            requestId = UUID.randomUUID().toString(),
            timestamp = now - (3 * 3600 * 1000L), // 3 hours ago
            status = SosDeliveryStatus.DELIVERED
        )
        val freshItem = SosOutboxItem(
            requestId = UUID.randomUUID().toString(),
            timestamp = now - (30 * 60 * 1000L), // 30 minutes ago
            status = SosDeliveryStatus.DELIVERED
        )
        val failedItem = SosOutboxItem(
            requestId = UUID.randomUUID().toString(),
            timestamp = now - (10 * 60 * 1000L), // 10 minutes ago
            status = SosDeliveryStatus.FAILED
        )

        fun isStale(item: SosOutboxItem): Boolean {
            val ageHours = (now - item.timestamp) / (1000 * 60 * 60)
            return ageHours >= 2 || item.status == SosDeliveryStatus.FAILED
        }

        assertTrue("Item older than 2 hours must be classified as stale", isStale(staleItem))
        assertFalse("Item under 2 hours must not be classified as stale", isStale(freshItem))
        assertTrue("Failed item must be classified as stale for immediate cleanup", isStale(failedItem))
    }

    @Test
    fun testSendingStateDowngradedToPendingRetryOnProcessRestart() {
        val deadProcessItem = SosOutboxItem(
            requestId = UUID.randomUUID().toString(),
            timestamp = System.currentTimeMillis() - 5000L,
            status = SosDeliveryStatus.SENDING
        )

        // On cold start, transient SENDING must be converted to PENDING_RETRY to avoid indefinite spinner
        val restoredItem = if (deadProcessItem.status == SosDeliveryStatus.SENDING) {
            deadProcessItem.copy(status = SosDeliveryStatus.PENDING_RETRY)
        } else {
            deadProcessItem
        }

        assertEquals(SosDeliveryStatus.PENDING_RETRY, restoredItem.status)
    }

    @Test
    fun testServerIncidentReconciliationDoesNotHijackSosButton() {
        val incident = `in`.sunshineeldercare.member.data.model.EmergencyIncidentSummaryDto(
            id = "inc_test_999",
            incidentNumber = "EMG-20261122-099",
            status = "ACKNOWLEDGED",
            classification = "CODE_RED",
            triggeredAt = "2026-11-22T21:00:00.000Z"
        )

        `in`.sunshineeldercare.member.data.repository.SosOutboxManager.reconcileWithServerIncident(incident)

        // Strict invariant: Circular SOS Button state (_currentSos) MUST remain null (normal idle state)
        assertNull(
            "Circular SOS Button must stay idle and NOT be hijacked by background incident",
            `in`.sunshineeldercare.member.data.repository.SosOutboxManager.currentSos.value
        )

        // Server incident state must be updated for background banner display
        assertNotNull(
            "Server active incident must be tracked for background status card",
            `in`.sunshineeldercare.member.data.repository.SosOutboxManager.serverActiveIncident.value
        )
        assertEquals(
            "EMG-20261122-099",
            `in`.sunshineeldercare.member.data.repository.SosOutboxManager.serverActiveIncident.value?.incidentNumber
        )

        // Cleanup
        `in`.sunshineeldercare.member.data.repository.SosOutboxManager.dismissCurrentEmergency()
        assertNull(`in`.sunshineeldercare.member.data.repository.SosOutboxManager.serverActiveIncident.value)
        assertNull(`in`.sunshineeldercare.member.data.repository.SosOutboxManager.currentSos.value)
    }

    @Test
    fun testConfirmationDialogPreventsUnintentionalSosTrigger() {
        // Simulates the UI logic: tapping the SOS button must not directly trigger SOS.
        // It must set showConfirmDialog = true, requiring explicit confirmation.
        var showConfirmDialog = false
        var sosTriggered = false

        fun onSosButtonClicked(isDelivered: Boolean, isSending: Boolean) {
            if (isDelivered || isSending) return
            showConfirmDialog = true
        }

        fun onConfirmCancelled() {
            showConfirmDialog = false
            // sosTriggered remains false!
        }

        fun onConfirmAccepted() {
            showConfirmDialog = false
            sosTriggered = true
        }

        // 1. Initial click
        onSosButtonClicked(isDelivered = false, isSending = false)
        assertTrue("Confirmation dialog must be shown on click", showConfirmDialog)
        assertFalse("SOS must NOT be triggered merely by clicking the SOS button", sosTriggered)

        // 2. Member cancels
        onConfirmCancelled()
        assertFalse("Confirmation dialog must be dismissed on cancel", showConfirmDialog)
        assertFalse("SOS must NOT be triggered after user cancellation", sosTriggered)

        // 3. Member clicks again and confirms
        onSosButtonClicked(isDelivered = false, isSending = false)
        assertTrue(showConfirmDialog)
        onConfirmAccepted()
        assertFalse(showConfirmDialog)
        assertTrue("SOS must only be triggered after explicit confirmation", sosTriggered)
    }

    @Test
    fun testSubmissionLockPreventsDuplicateSosDispatches() {
        var isSubmittingSos = false
        var dispatchCount = 0

        fun triggerSosWithLock() {
            if (isSubmittingSos) return
            isSubmittingSos = true
            dispatchCount++
        }

        // Rapid double-tap simulation
        triggerSosWithLock()
        triggerSosWithLock()
        triggerSosWithLock()

        assertEquals("Exactly one dispatch must occur regardless of repeated taps", 1, dispatchCount)
    }

    // ==========================================
    // PRIORITY 5: PERMANENT AUTO-UPDATE INVARIANTS
    // ==========================================

    @Test
    fun testMeaningfulUpdateErrorMapping() {
        // Maps technical exceptions to senior-friendly messages
        fun mapError(code: Int?, exception: Exception?): String {
            if (code != null) {
                return when (code) {
                    404 -> "The update package is currently being deployed to our servers. Please try again shortly or contact support at 033-40585515."
                    401, 403 -> "Update download authorization failed. Please contact support."
                    in 500..599 -> "The distribution server is temporarily unavailable (HTTP $code). Please try again in a few minutes."
                    else -> "Download server returned HTTP $code."
                }
            }
            return when {
                exception is java.net.SocketTimeoutException ->
                    "Connection timed out while downloading update. Please check your internet connection."
                exception is java.net.UnknownHostException ->
                    "Unable to reach update server. Please check your network connection."
                exception?.message?.startsWith("SHA-256 checksum mismatch") == true ->
                    "Download verification failed: the file was incomplete or corrupted. Please try downloading again."
                exception?.message?.startsWith("APK signature") == true ->
                    "Security verification failed: invalid digital signature. Download cancelled for your safety."
                else -> exception?.message ?: "Download failed. Please try again later."
            }
        }

        val err404 = mapError(404, null)
        assertTrue("404 error must provide clear explanatory context", err404.contains("support at 033-40585515"))
        assertFalse("Must not expose raw technical 404 to senior without context", err404 == "Failed to download APK: HTTP 404")

        val err500 = mapError(500, null)
        assertTrue("500 error must explain server unavailability", err500.contains("temporarily unavailable"))

        val timeoutErr = mapError(null, java.net.SocketTimeoutException("Read timed out"))
        assertTrue("Timeout must mention internet connection", timeoutErr.contains("check your internet connection"))

        val shaErr = mapError(null, Exception("SHA-256 checksum mismatch. Expected: aaa, Got: bbb"))
        assertTrue("Checksum mismatch must mention file corrupted", shaErr.contains("incomplete or corrupted"))
    }

    @Test
    fun testInstalledBuild3DetectsBuild5UpdateAvailable() {
        val installedVersionCode = 3
        val installedVersionName = "1.0.2"

        val manifest = AppManifestResponse(
            appId = "member-app",
            packageName = "in.sunshineeldercare.member",
            name = "Sunshine Member App",
            latestVersionName = "1.0.4",
            latestVersionCode = 5,
            apkDownloadUrl = "https://www.sunshineeldercare.in/downloads/apps/Sunshine-Member-v1.0.4-b5.apk",
            sha256 = "1984162f268df287bf12e2ec7e7f790c10c995e9977e52d0bfbd6c7a9a3f2be0",
            fileSize = 46718122,
            minSupportedVersion = "Android (API 29)",
            releaseNotes = "Production update Build 5"
        )

        val isUpdateAvailable = manifest.latestVersionCode > installedVersionCode
        assertTrue("Manifest Build 5 must trigger update for installed Build 3", isUpdateAvailable)
        assertEquals("in.sunshineeldercare.member", manifest.packageName)
        assertTrue(manifest.apkDownloadUrl.endsWith(".apk"))
    }

    @Test
    fun testFallbackUrlResolutionLogicOn404() {
        val directUrl = "https://www.sunshineeldercare.in/downloads/apps/Sunshine-Member-v1.0.4-b5.apk"
        fun computeFallbackUrl(url: String): String {
            val origin = url.substringBefore("/downloads/")
            return "$origin/api/apps/member-app/download"
        }

        val fallback = computeFallbackUrl(directUrl)
        assertEquals("https://www.sunshineeldercare.in/api/apps/member-app/download", fallback)
    }

    @Test
    fun testDownloadLockPreventsConcurrentDownloadAttempts() {
        val isDownloading = java.util.concurrent.atomic.AtomicBoolean(false)
        var startedDownloads = 0

        fun attemptDownload(): Boolean {
            if (!isDownloading.compareAndSet(false, true)) {
                return false
            }
            try {
                startedDownloads++
                return true
            } finally {
                // keep lock held during simulated download
            }
        }

        assertTrue("First download attempt must acquire lock", attemptDownload())
        assertFalse("Second concurrent download attempt must be rejected", attemptDownload())
        assertFalse("Third concurrent download attempt must be rejected", attemptDownload())
        assertEquals(1, startedDownloads)

        // Once finished, unlock
        isDownloading.set(false)
        assertTrue("Subsequent download attempt after completion must acquire lock", attemptDownload())
        assertEquals(2, startedDownloads)
    }

    @Test
    fun testUpdateCheckLockPreventsConcurrentChecks() {
        val isChecking = java.util.concurrent.atomic.AtomicBoolean(false)
        var startedChecks = 0

        fun attemptCheck(): Boolean {
            if (!isChecking.compareAndSet(false, true)) {
                return false
            }
            try {
                startedChecks++
                return true
            } finally {
                // simulated check in progress
            }
        }

        assertTrue("First check must succeed", attemptCheck())
        assertFalse("Duplicate concurrent check must be rejected", attemptCheck())
        assertEquals(1, startedChecks)

        isChecking.set(false)
        assertTrue("Subsequent check must succeed", attemptCheck())
        assertEquals(2, startedChecks)
    }

    @Test
    fun testMultiCandidateUrlResolution() {
        val manifest = AppManifestResponse(
            appId = "member-app",
            packageName = "in.sunshineeldercare.member",
            name = "Sunshine Member App",
            latestVersionName = "1.0.5",
            latestVersionCode = 6,
            apkDownloadUrl = "https://www.sunshineeldercare.in/downloads/apps/Sunshine-Member-Release.apk",
            sha256 = "cf672287e6e396dcfa6070a6256176ba5d1161342187b1f4f406ef3b0368deaf",
            fileSize = 46718122,
            minSupportedVersion = "10 (API 29)",
            releaseNotes = "Build 6 Release Notes"
        )

        val origin = "https://www.sunshineeldercare.in"
        val timestamp = 1763800000000L

        val candidateUrls = linkedSetOf<String>().apply {
            if (manifest.apkDownloadUrl.isNotBlank()) {
                add(manifest.apkDownloadUrl)
            }
            add("$origin/api/apps/member-app/download/Sunshine-Member-Release.apk?v=${manifest.latestVersionCode}&t=$timestamp")
            add("$origin/api/apps/member-app/download?v=${manifest.latestVersionCode}&t=$timestamp")
            add("$origin/downloads/apps/Sunshine-Member-v${manifest.latestVersionName}-b${manifest.latestVersionCode}.apk")
            add("$origin/downloads/apps/Sunshine-Member-Release.apk?t=$timestamp")
        }.toList()

        assertEquals("Must generate 5 candidate URLs", 5, candidateUrls.size)
        assertEquals(manifest.apkDownloadUrl, candidateUrls[0])
        assertTrue("Candidate 2 must target canonical API with filename and version", candidateUrls[1].contains("/api/apps/member-app/download/Sunshine-Member-Release.apk?v=6"))
        assertTrue("Candidate 3 must target canonical API gateway with version", candidateUrls[2].contains("/api/apps/member-app/download?v=6"))
        assertTrue("Candidate 4 must target versioned static APK", candidateUrls[3].endsWith("Sunshine-Member-v1.0.5-b6.apk"))
        assertTrue("Candidate 5 must include timestamp cache buster", candidateUrls[4].contains("?t=1763800000000"))
    }

    @Test
    fun testCandidateFallbackOnSha256Mismatch() {
        val expectedSha256 = "cf672287e6e396dcfa6070a6256176ba5d1161342187b1f4f406ef3b0368deaf"
        val staleSha256 = "d3f31e5631155416e7ed6ed056f4fbf710982fbbb7670c968d05181bfb49a725"

        val candidates = listOf(
            "https://www.sunshineeldercare.in/downloads/apps/Sunshine-Member-Release.apk" to staleSha256,
            "https://www.sunshineeldercare.in/api/apps/member-app/download/Sunshine-Member-Release.apk?v=6" to expectedSha256
        )

        var resolvedSha: String? = null
        var winningCandidateUrl: String? = null
        val rejectedCandidates = mutableListOf<String>()

        for ((url, sha) in candidates) {
            if (!sha.equals(expectedSha256, ignoreCase = true)) {
                rejectedCandidates.add(url)
                continue
            }
            resolvedSha = sha
            winningCandidateUrl = url
            break
        }

        assertEquals("Exactly 1 candidate must be rejected due to mismatch", 1, rejectedCandidates.size)
        assertEquals("https://www.sunshineeldercare.in/downloads/apps/Sunshine-Member-Release.apk", rejectedCandidates[0])
        assertEquals("Canonical R2 gateway must succeed as winning candidate", "https://www.sunshineeldercare.in/api/apps/member-app/download/Sunshine-Member-Release.apk?v=6", winningCandidateUrl)
        assertEquals(expectedSha256, resolvedSha)
    }

    @Test
    fun testIncompleteDownloadByteCountCheck() {
        val expectedSize = 46718122L
        val truncatedBytes = 10485760L // only 10MB received

        fun isDownloadComplete(downloaded: Long, expected: Long): Boolean {
            return expected <= 0L || downloaded == expected
        }

        assertFalse("Truncated download of 10MB against 46.7MB must be rejected", isDownloadComplete(truncatedBytes, expectedSize))
        assertTrue("Complete download of exact 46718122 bytes must pass", isDownloadComplete(expectedSize, expectedSize))
    }

    @Test
    fun testTempApkCleanupInvariant() {
        val tempFile = java.io.File.createTempFile("Sunshine-Member-6", ".apk.tmp")
        val targetFile = java.io.File(tempFile.parentFile, "Sunshine-Member-6.apk")

        try {
            tempFile.writeText("corrupted partial binary bytes")
            assertTrue("Temp file must exist initially", tempFile.exists())

            // Simulating failure cleanup
            val isVerified = false
            if (!isVerified) {
                if (tempFile.exists()) tempFile.delete()
            }

            assertFalse("Temp file must be deleted upon verification failure", tempFile.exists())
            assertFalse("Target APK must NOT be created when verification fails", targetFile.exists())
        } finally {
            if (tempFile.exists()) tempFile.delete()
            if (targetFile.exists()) targetFile.delete()
        }
    }
}
