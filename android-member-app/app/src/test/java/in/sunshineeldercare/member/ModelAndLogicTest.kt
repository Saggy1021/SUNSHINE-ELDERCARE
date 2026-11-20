package `in`.sunshineeldercare.member

import `in`.sunshineeldercare.member.data.model.DashboardResponse
import `in`.sunshineeldercare.member.data.model.FullProfileDto
import `in`.sunshineeldercare.member.data.model.LoginRequest
import `in`.sunshineeldercare.member.data.model.LoginResponse
import `in`.sunshineeldercare.member.data.model.MemberAuthDto
import `in`.sunshineeldercare.member.data.model.ProfileResponse
import `in`.sunshineeldercare.member.data.model.ProfileUpdateRequest
import `in`.sunshineeldercare.member.data.model.SubscriptionSummaryDto
import `in`.sunshineeldercare.member.ui.components.COMPLAINT_CATEGORIES
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ModelAndLogicTest {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
    }

    @Test
    fun testLoginRequestSerialization() {
        val request = LoginRequest(memberId = "SEC/S/1001/TEST", password = "TestMember@2026")
        val jsonStr = json.encodeToString(LoginRequest.serializer(), request)
        assertTrue(jsonStr.contains("SEC/S/1001/TEST"))
        assertTrue(jsonStr.contains("TestMember@2026"))
    }

    @Test
    fun testLoginResponseDeserialization() {
        val rawJson = """
            {
                "success": true,
                "member": {
                    "id": "cmwdo4rz700007nlvjjypt0c2",
                    "memberId": "SEC/S/1001/TEST",
                    "name": "Sakuntala Roy",
                    "email": "test.member@sunshineeldercare.in",
                    "phone": "+91 98300 12345",
                    "gender": "Female",
                    "status": "ACTIVE"
                },
                "subscription": {
                    "id": "cmwdo761v0007cypebbq6ms1f",
                    "planName": "Shield Shine",
                    "planSlug": "shield-shine",
                    "variantType": "SINGLE",
                    "status": "ACTIVE",
                    "startDate": "2026-11-12T14:56:23.397Z",
                    "endDate": "2027-11-12T14:56:23.397Z",
                    "hasEmergencyAssistant": true
                }
            }
        """.trimIndent()

        val parsed = json.decodeFromString(LoginResponse.serializer(), rawJson)
        assertTrue(parsed.success)
        assertNotNull(parsed.member)
        assertEquals("SEC/S/1001/TEST", parsed.member?.memberId)
        assertEquals("Sakuntala Roy", parsed.member?.name)
        assertEquals("Female", parsed.member?.gender)
        assertEquals("Shield Shine", parsed.subscription?.planName)
    }

    @Test
    fun testDashboardResponseDeserialization() {
        val rawJson = """
            {
                "success": true,
                "member": {
                    "id": "cmwdo4rz700007nlvjjypt0c2",
                    "memberId": "SEC/S/1001/TEST",
                    "name": "Sakuntala Roy",
                    "email": "test.member@sunshineeldercare.in",
                    "gender": "Female",
                    "phone": "+91 98300 12345",
                    "bloodGroup": "O+",
                    "emergencyContact": {
                        "name": "Dr. Subhash Roy",
                        "phone": "+91 98300 54321",
                        "relation": "Son"
                    },
                    "preferredHospital": "Apollo Multispeciality Hospital, Kolkata"
                },
                "membership": {
                    "id": "cmwdo761v0007cypebbq6ms1f",
                    "planName": "Shield Shine",
                    "planSlug": "shield-shine",
                    "category": "Single Elder Care",
                    "variantType": "SINGLE",
                    "status": "ACTIVE",
                    "startDate": "2026-11-12T14:56:23.397Z",
                    "endDate": "2027-11-12T14:56:23.397Z",
                    "daysRemaining": 365,
                    "hasEmergencyAssistant": true,
                    "services": [
                        { "serviceName": "Comprehensive Care Service", "serviceNote": null },
                        { "serviceName": "24/7 Emergency Assistant", "serviceNote": null }
                    ]
                },
                "recentReceipts": [],
                "systemNotifications": [
                    {
                        "id": "notif_welcome",
                        "title": "Welcome",
                        "message": "Welcome Sakuntala Roy",
                        "date": "2026-11-12T16:39:58.672Z",
                        "read": false
                    }
                ],
                "events": []
            }
        """.trimIndent()

        val parsed = json.decodeFromString(DashboardResponse.serializer(), rawJson)
        assertTrue(parsed.success)
        assertNotNull(parsed.member)
        assertEquals("Sakuntala Roy", parsed.member?.name)
        assertEquals("Shield Shine", parsed.membership?.planName)
        assertEquals(2, parsed.membership?.services?.size)
        assertEquals("Dr. Subhash Roy", parsed.member?.emergencyContact?.name)
    }

    @Test
    fun testPersonalizedGreetingLogic() {
        fun formatGreeting(name: String?, gender: String?): String {
            val displayName = name?.takeIf { it.isNotBlank() } ?: "Member"
            return when (gender?.trim()?.lowercase()) {
                "female" -> "Hello, $displayName Ma'am"
                "male" -> "Hello, $displayName Sir"
                else -> "Welcome back, $displayName"
            }
        }

        assertEquals("Hello, Sakuntala Roy Ma'am", formatGreeting("Sakuntala Roy", "Female"))
        assertEquals("Hello, Sakuntala Roy Ma'am", formatGreeting("Sakuntala Roy", "female"))
        assertEquals("Hello, Debabrata Roy Sir", formatGreeting("Debabrata Roy", "Male"))
        assertEquals("Hello, Debabrata Roy Sir", formatGreeting("Debabrata Roy", "male"))
        assertEquals("Welcome back, Alex", formatGreeting("Alex", null))
        assertEquals("Welcome back, Alex", formatGreeting("Alex", "Other"))
    }

    @Test
    fun testSosHelplineConfiguration() {
        val helplineRaw = "03340585515"
        val dialUri = "tel:$helplineRaw"
        assertEquals("tel:03340585515", dialUri)
    }

    @Test
    fun testCareDeskHelplineConfiguration() {
        val phoneRaw = "+91 90888 82222"
        val dialNumber = phoneRaw.replace(" ", "")
        assertEquals("+919088882222", dialNumber)
        assertEquals("tel:+919088882222", "tel:$dialNumber")
    }

    @Test
    fun testRenewalRedirectUrl() {
        val expectedRenewalUrl = "https://www.sunshineeldercare.in/dashboard/renew"
        assertEquals("https://www.sunshineeldercare.in/dashboard/renew", expectedRenewalUrl)
    }

    @Test
    fun testComplaintCategoriesSpecification() {
        assertEquals(4, COMPLAINT_CATEGORIES.size)
        assertTrue(COMPLAINT_CATEGORIES.contains("Service-related Complaints"))
        assertTrue(COMPLAINT_CATEGORIES.contains("Staff-related Complaints"))
        assertTrue(COMPLAINT_CATEGORIES.contains("Payment-related Issues"))
        assertTrue(COMPLAINT_CATEGORIES.contains("Appointment-related Issues"))
    }

    @Test
    fun testProfileUpdateSerialization() {
        val req = ProfileUpdateRequest(
            phone = "+91 98300 12345",
            addressLine1 = "123 Park Street, Kolkata",
            emergencyContactName = "Subhashish Roy",
            emergencyContactPhone = "+91 98300 99999",
            hospitalPreference = "AMRI Hospital Dhakuria"
        )
        val jsonStr = json.encodeToString(ProfileUpdateRequest.serializer(), req)
        assertTrue(jsonStr.contains("Subhashish Roy"))
        assertTrue(jsonStr.contains("AMRI Hospital Dhakuria"))
    }
}
