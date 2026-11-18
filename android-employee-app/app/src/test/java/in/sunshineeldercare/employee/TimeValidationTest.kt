package `in`.sunshineeldercare.employee

import org.junit.Assert.*
import org.junit.Test

class TimeValidationTest {

    private fun parseTimeToMinutes(timeStr: String): Int {
        val upper = timeStr.trim().uppercase()
        val isPm = upper.contains("PM")
        val isAm = upper.contains("AM")
        val clean = upper.replace("AM", "").replace("PM", "").trim()
        val parts = clean.split(":")
        var h = parts[0].toInt()
        val m = parts[1].toInt()
        if (isPm && h != 12) h += 12
        if (isAm && h == 12) h = 0
        return h * 60 + m
    }

    private fun isDepartureValid(arrival: String, departure: String): Boolean {
        return parseTimeToMinutes(departure) >= parseTimeToMinutes(arrival)
    }

    @Test
    fun testChronologicalArrivalAndDeparture() {
        // 09:30 AM to 10:00 AM (30 min visit)
        assertTrue(isDepartureValid("09:30 AM", "10:00 AM"))

        // Same time (instantaneous departure check)
        assertTrue(isDepartureValid("09:30 AM", "09:30 AM"))

        // Cross-noon boundary: 11:45 AM to 12:15 PM
        assertTrue(isDepartureValid("11:45 AM", "12:15 PM"))

        // Afternoon: 01:00 PM to 02:30 PM
        assertTrue(isDepartureValid("01:00 PM", "02:30 PM"))
    }

    @Test
    fun testRejectionWhenDepartureIsEarlierThanArrival() {
        // Departure earlier than arrival
        assertFalse(isDepartureValid("10:00 AM", "09:30 AM"))

        // Cross-noon inverted: 12:30 PM to 11:30 AM
        assertFalse(isDepartureValid("12:30 PM", "11:30 AM"))

        // PM to AM error
        assertFalse(isDepartureValid("01:00 PM", "09:00 AM"))
    }

    @Test
    fun testDurationCalculation() {
        val start = parseTimeToMinutes("09:30 AM")
        val end = parseTimeToMinutes("10:00 AM")
        val diff = end - start
        assertEquals(30, diff)

        val startCrossNoon = parseTimeToMinutes("11:30 AM")
        val endCrossNoon = parseTimeToMinutes("01:00 PM")
        val diffCrossNoon = endCrossNoon - startCrossNoon
        assertEquals(90, diffCrossNoon)
    }
}
