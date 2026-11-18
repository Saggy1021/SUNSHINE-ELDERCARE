package `in`.sunshineeldercare.employee

import `in`.sunshineeldercare.employee.data.remote.model.VisitsListResponse
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test

class VisitsJsonDeserializationTest {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
        encodeDefaults = true
    }

    @Test
    fun testLiveVisitsJsonDeserialization() {
        val payload = """
        {"success":true,"filter":"all","total":1,"count":1,"visits":[{"id":"cmwjy4q8d000erge8ehau0f1w","memberId":"","primaryMemberName":"Care Test User","spouseName":null,"primaryMobile":"","serviceAddress":"","scheduledDate":"17 Nov 2026","scheduledStartTime":"1:00 AM","scheduledEndTime":"2:00 PM","scheduledWindowDisplay":"1:00 AM – 2:00 PM","actualArrivalDisplay":"10:00 AM","actualDepartureDisplay":"11:30 AM","workDescription":"Completed routine health check: Blood Pressure 125/82 mmHg, Blood Sugar (postprandial) 138 mg/dL. Assisted with prescribed daily physical therapy exercises and hydration schedule. Member had lunch on schedule and reported good energy.","status":"COMPLETED","completedAt":"2026-11-18T19:27:01.476Z","member":{"primaryName":"Care Test User","spouseName":"—","memberId":null,"mobileNumber":null,"serviceAddress":null},"scheduled":{"start":"2026-11-16T19:30:00.000Z","end":"2026-11-17T08:30:00.000Z","dateDisplay":"17 Nov 2026","timeDisplay":"1:00 AM – 2:00 PM","startTimeDisplay":"1:00 AM","endTimeDisplay":"2:00 PM"},"actual":{"arrival":"2026-11-17T04:30:00.000Z","departure":"2026-11-17T06:00:00.000Z","arrivalDisplay":"10:00 AM","departureDisplay":"11:30 AM","arrivalDateDisplay":"17 Nov 2026","departureDateDisplay":"17 Nov 2026"},"operationalNotes":"[Scheduled] [Formerly assigned to: Nurse Test (SEC/999/TEST)]"}]}
        """.trimIndent()

        val parsed = json.decodeFromString<VisitsListResponse>(payload)
        assertTrue(parsed.success)
        assertEquals(1, parsed.visits.size)
        val v = parsed.visits[0]
        assertEquals("cmwjy4q8d000erge8ehau0f1w", v.id)
        assertEquals("Care Test User", v.primaryMemberName)
        assertEquals("COMPLETED", v.status)
        println("Visits deserialization passed! Visit: ${v.primaryMemberName}")
    }
}
