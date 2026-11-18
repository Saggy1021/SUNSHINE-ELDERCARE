package `in`.sunshineeldercare.employee

import `in`.sunshineeldercare.employee.data.remote.model.CompleteVisitRequest
import `in`.sunshineeldercare.employee.data.remote.model.EmployeeVisitDto
import `in`.sunshineeldercare.employee.data.remote.model.UpdateTimeRequest
import `in`.sunshineeldercare.employee.ui.screens.detail.VisitDetailUiState
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test

class VisitExecutionSyncTest {

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        coerceInputValues = true
        encodeDefaults = true
        explicitNulls = false
    }

    @Test
    fun testUpdateTimeRequestDoesNotEmitNullKeys() {
        val arrivalOnly = UpdateTimeRequest(actualArrival = "03:00 AM")
        val jsonArrival = json.encodeToString(arrivalOnly)
        assertTrue("Should contain actualArrival", jsonArrival.contains("03:00 AM"))
        assertFalse("Should NOT serialize actualDeparture when null", jsonArrival.contains("actualDeparture"))

        val departureOnly = UpdateTimeRequest(actualDeparture = "03:30 AM")
        val jsonDeparture = json.encodeToString(departureOnly)
        assertTrue("Should contain actualDeparture", jsonDeparture.contains("03:30 AM"))
        assertFalse("Should NOT serialize actualArrival when null", jsonDeparture.contains("actualArrival"))
    }

    @Test
    fun testCompleteVisitRequestSerializesAllExecutionFields() {
        val request = CompleteVisitRequest(
            workDescription = "Delivered medication and checked BP",
            actualArrival = "03:00 AM",
            actualDeparture = "03:30 AM"
        )
        val encoded = json.encodeToString(request)
        assertTrue(encoded.contains("Delivered medication and checked BP"))
        assertTrue(encoded.contains("03:00 AM"))
        assertTrue(encoded.contains("03:30 AM"))
    }

    @Test
    fun testCanCompleteLogicInUiState() {
        // Empty state cannot complete
        val emptyState = VisitDetailUiState()
        assertFalse(emptyState.canComplete)

        // Only arrival cannot complete
        val arrivalOnlyState = VisitDetailUiState(arrivalInput = "03:00 AM")
        assertFalse(arrivalOnlyState.canComplete)

        // Arrival and departure but no description cannot complete
        val missingDescState = VisitDetailUiState(
            arrivalInput = "03:00 AM",
            departureInput = "03:30 AM"
        )
        assertFalse(missingDescState.canComplete)

        // All 3 present can complete
        val readyState = VisitDetailUiState(
            arrivalInput = "03:00 AM",
            departureInput = "03:30 AM",
            workDescriptionInput = "Administered health checks"
        )
        assertTrue(readyState.canComplete)

        // Already completed cannot complete again
        val completedState = readyState.copy(
            visit = `in`.sunshineeldercare.employee.data.local.entity.VisitEntity(
                id = "visit-1",
                memberId = "M-1",
                primaryMemberName = "John Doe",
                primaryMobile = "9876543210",
                serviceAddress = "Kolkata",
                scheduledDate = "19 Nov 2026",
                scheduledStartTime = "10:00 AM",
                scheduledEndTime = "11:00 AM",
                scheduledWindowDisplay = "10:00 AM - 11:00 AM",
                status = "COMPLETED"
            )
        )
        assertFalse(completedState.canComplete)
    }
}
