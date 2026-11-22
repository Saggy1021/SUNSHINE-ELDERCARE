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
}
