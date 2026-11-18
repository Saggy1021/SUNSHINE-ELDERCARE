package `in`.sunshineeldercare.employee

import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import `in`.sunshineeldercare.employee.data.remote.model.EmployeeVisitDto
import org.junit.Assert.*
import org.junit.Test

class VisitEntityMappingTest {

    @Test
    fun testDtoToEntityAndBackMapping() {
        val dto = EmployeeVisitDto(
            id = "visit-uuid-101",
            memberId = "SECD1001PRCH",
            primaryMemberName = "Mr Prabir Chakraverty",
            spouseName = "Mrs Tapati Chakraverty",
            primaryMobile = "+91 98300 12345",
            serviceAddress = "Salt Lake Sector 1, Kolkata 700064",
            scheduledDate = "2026-11-19",
            scheduledStartTime = "09:30",
            scheduledEndTime = "10:30",
            scheduledWindowDisplay = "09:30 AM - 10:30 AM",
            actualArrivalDisplay = "09:30 AM",
            actualDepartureDisplay = "10:00 AM",
            workDescription = "Assisted with morning mobility walk and checked BP.",
            status = "COMPLETED",
            completedAt = "2026-11-19T10:00:00.000Z"
        )

        val entity = VisitEntity.fromDto(dto)

        assertEquals("visit-uuid-101", entity.id)
        assertEquals("SECD1001PRCH", entity.memberId)
        assertEquals("Mr Prabir Chakraverty", entity.primaryMemberName)
        assertEquals("Mrs Tapati Chakraverty", entity.spouseName)
        assertEquals("+91 98300 12345", entity.primaryMobile)
        assertEquals("Salt Lake Sector 1, Kolkata 700064", entity.serviceAddress)
        assertEquals("09:30 AM", entity.actualArrivalDisplay)
        assertEquals("10:00 AM", entity.actualDepartureDisplay)
        assertEquals("COMPLETED", entity.status)

        val restoredDto = entity.toDto()
        assertEquals(dto, restoredDto)
    }

    @Test
    fun testSpouseNameOmissionHandledGracefully() {
        val dto = EmployeeVisitDto(
            id = "visit-uuid-102",
            memberId = "SECD1002BADU",
            primaryMemberName = "Mr Basudeb Kundu",
            spouseName = null,
            primaryMobile = "+91 98311 22334",
            serviceAddress = "Ballygunge, Kolkata 700019",
            scheduledDate = "2026-11-19",
            scheduledStartTime = "11:00",
            scheduledEndTime = "12:00",
            scheduledWindowDisplay = "11:00 AM - 12:00 PM",
            actualArrivalDisplay = null,
            actualDepartureDisplay = null,
            workDescription = null,
            status = "SCHEDULED",
            completedAt = null
        )

        val entity = VisitEntity.fromDto(dto)
        assertNull(entity.spouseName)
        assertEquals("SCHEDULED", entity.status)
    }
}
