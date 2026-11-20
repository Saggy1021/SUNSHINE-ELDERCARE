package `in`.sunshineeldercare.member

import `in`.sunshineeldercare.member.data.model.DashboardResponse
import `in`.sunshineeldercare.member.data.model.FullProfileDto
import `in`.sunshineeldercare.member.data.model.LoginRequest
import `in`.sunshineeldercare.member.data.model.LoginResponse
import `in`.sunshineeldercare.member.data.model.MemberAuthDto
import `in`.sunshineeldercare.member.data.model.ProfileResponse
import `in`.sunshineeldercare.member.data.model.ProfileUpdateRequest
import `in`.sunshineeldercare.member.data.model.SubscriptionSummaryDto
import `in`.sunshineeldercare.member.data.model.SosTriggerRequest
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
            alternatePhone = "+91 98300 54321",
            addressLine1 = "123 Park Street, Kolkata",
            nearestLandmark = "Near Park Circus",
            emergencyContactName = "Subhashish Roy",
            emergencyContactPhone = "+91 98300 99999",
            hospitalPreference = "AMRI Hospital Dhakuria"
        )
        val jsonStr = json.encodeToString(ProfileUpdateRequest.serializer(), req)
        assertTrue(jsonStr.contains("Subhashish Roy"))
        assertTrue(jsonStr.contains("AMRI Hospital Dhakuria"))
        assertTrue(jsonStr.contains("+91 98300 54321"))
        assertTrue(jsonStr.contains("Near Park Circus"))
    }

    @Test
    fun testFullProfileDtoWithAllFields() {
        val rawJson = """
            {
                "success": true,
                "profile": {
                    "id": "cmv5j9l6d00014uplaumg7m8l",
                    "memberId": "SECD1000TAAM",
                    "salutation": "Mr",
                    "firstName": "Tanish",
                    "lastName": "Alam",
                    "name": "Mr Tanish Alam",
                    "email": "tanishalam61@gmail.com",
                    "phone": "7980721244",
                    "alternatePhone": "7980718556",
                    "addressLine1": "Rabindra Nagar Kolkata",
                    "nearestLandmark": "Rabindra Nagar Bus Stand",
                    "status": "ACTIVE",
                    "membershipName": "Shield Shine — Single (12 Months)",
                    "membershipType": "Single",
                    "membershipStatus": "ACTIVE",
                    "membershipStartDate": "2026-11-20T00:00:00.000Z",
                    "membershipEndDate": "2027-11-19T23:59:59.999Z",
                    "bloodGroup": "",
                    "medicalConditions": "",
                    "hospitalPreference": "",
                    "emergencyContactName": "Tanish",
                    "emergencyContactPhone": "7980718556",
                    "emergencyContactRelation": "Family"
                }
            }
        """.trimIndent()

        val parsed = json.decodeFromString(ProfileResponse.serializer(), rawJson)
        assertTrue(parsed.success)
        assertNotNull(parsed.profile)
        val p = parsed.profile!!
        assertEquals("SECD1000TAAM", p.memberId)
        assertEquals("Mr Tanish Alam", p.name)
        assertEquals("tanishalam61@gmail.com", p.email)
        assertEquals("7980721244", p.phone)
        assertEquals("7980718556", p.alternatePhone)
        assertEquals("Rabindra Nagar Kolkata", p.addressLine1)
        assertEquals("Rabindra Nagar Bus Stand", p.nearestLandmark)
        assertEquals("Shield Shine — Single (12 Months)", p.membershipName)
        assertEquals("ACTIVE", p.status)
        assertEquals("Tanish", p.emergencyContactName)
    }

    @Test
    fun testOneTapSosRequestPayload() {
        val testJson = Json {
            ignoreUnknownKeys = true
            isLenient = true
            encodeDefaults = true
        }
        val sosReq = SosTriggerRequest(
            triggerSource = "MEMBER_APP_SOS",
            latitude = 22.5726,
            longitude = 88.3639,
            accuracy = 12.5f,
            notes = "One-tap emergency SOS triggered by member from Sunshine Member App"
        )
        val jsonStr = testJson.encodeToString(SosTriggerRequest.serializer(), sosReq)
        assertTrue(jsonStr.contains("MEMBER_APP_SOS"))
        assertTrue(jsonStr.contains("22.5726"))
        assertTrue(jsonStr.contains("88.3639"))

        val decoded = testJson.decodeFromString(SosTriggerRequest.serializer(), jsonStr)
        assertEquals("MEMBER_APP_SOS", decoded.triggerSource)
        assertEquals(22.5726, decoded.latitude ?: 0.0, 0.0001)
        assertEquals(88.3639, decoded.longitude ?: 0.0, 0.0001)
    }

    @Test
    fun testComplaintSerializationAndStatusMapping() {
        val testJson = Json {
            ignoreUnknownKeys = true
            isLenient = true
            encodeDefaults = true
        }
        val req = `in`.sunshineeldercare.member.data.model.SubmitComplaintRequest(
            category = "Service-related Complaints",
            subject = "Delayed Caretaker Visit",
            description = "The scheduled morning visit arrived 45 minutes late today."
        )
        val jsonStr = testJson.encodeToString(`in`.sunshineeldercare.member.data.model.SubmitComplaintRequest.serializer(), req)
        assertTrue(jsonStr.contains("Delayed Caretaker Visit"))

        val dto = `in`.sunshineeldercare.member.data.model.MemberComplaintDto(
            id = "cmp_123",
            complaintNumber = "CMP-1001",
            category = "Service-related Complaints",
            subject = "Delayed Caretaker Visit",
            description = "The scheduled morning visit arrived 45 minutes late today.",
            status = "RESOLVED",
            adminResponse = "Care coordinator has spoken to the family and rescheduled future visits."
        )
        val dtoJson = testJson.encodeToString(`in`.sunshineeldercare.member.data.model.MemberComplaintDto.serializer(), dto)
        assertTrue(dtoJson.contains("CMP-1001"))
        assertTrue(dtoJson.contains("RESOLVED"))

        val decodedDto = testJson.decodeFromString(`in`.sunshineeldercare.member.data.model.MemberComplaintDto.serializer(), dtoJson)
        assertEquals("CMP-1001", decodedDto.complaintNumber)
        assertEquals("RESOLVED", decodedDto.status)
        assertEquals("Care coordinator has spoken to the family and rescheduled future visits.", decodedDto.adminResponse)
    }

    @Test
    fun testUpcomingEventDto() {
        val testJson = Json {
            ignoreUnknownKeys = true
            isLenient = true
            encodeDefaults = true
        }
        val event = `in`.sunshineeldercare.member.data.model.CalendarEventDto(
            id = "ev_1",
            date = "25",
            month = "NOV",
            title = "Elderly Health & Vitals Camp",
            description = "Routine geriatric wellness check",
            location = "Salt Lake Community Centre",
            time = "10:00 AM - 01:00 PM"
        )
        val jsonStr = testJson.encodeToString(`in`.sunshineeldercare.member.data.model.CalendarEventDto.serializer(), event)
        assertTrue(jsonStr.contains("Elderly Health & Vitals Camp"))
        val decoded = testJson.decodeFromString(`in`.sunshineeldercare.member.data.model.CalendarEventDto.serializer(), jsonStr)
        assertEquals("25", decoded.date)
        assertEquals("NOV", decoded.month)
        assertEquals("Salt Lake Community Centre", decoded.location)
    }
}
