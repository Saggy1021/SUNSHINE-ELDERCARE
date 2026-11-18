package `in`.sunshineeldercare.employee

import `in`.sunshineeldercare.employee.data.remote.model.EmployeeProfile
import org.junit.Assert.*
import org.junit.Test

class ProfileAndBrandingTest {

    @Test
    fun testEmployeeProfilePhoneAndDesignation() {
        val profileWithPhone = EmployeeProfile(
            id = "emp_123",
            employeeId = "SEC185TAAM",
            name = "Tanish Alam",
            designation = "ZC",
            department = "Care Operations",
            email = "tanish@example.com",
            contactNumber = "+91 98765 43210"
        )

        assertEquals("ZC", profileWithPhone.designation)
        assertEquals("+91 98765 43210", profileWithPhone.contactNumber)

        val phoneDisplay = profileWithPhone.contactNumber.orEmpty().ifBlank { "Not provided" }
        assertEquals("+91 98765 43210", phoneDisplay)

        val desigDisplay = profileWithPhone.designation.ifBlank { "--" }
        assertEquals("ZC", desigDisplay)
    }

    @Test
    fun testEmployeeProfilePhoneFallbackWhenMissing() {
        val profileWithoutPhone = EmployeeProfile(
            id = "emp_456",
            employeeId = "SEC184SAAR",
            name = "Sagnik Kar",
            designation = "Senior Care Manager",
            department = "Care Operations",
            email = "sagnik@example.com",
            contactNumber = null
        )

        assertEquals("Senior Care Manager", profileWithoutPhone.designation)
        assertNull(profileWithoutPhone.contactNumber)

        val phoneDisplay = profileWithoutPhone.contactNumber.orEmpty().ifBlank { "Not provided" }
        assertEquals("Not provided", phoneDisplay)

        val blankPhoneProfile = profileWithoutPhone.copy(contactNumber = "   ")
        val blankPhoneDisplay = blankPhoneProfile.contactNumber.orEmpty().ifBlank { "Not provided" }
        assertEquals("Not provided", blankPhoneDisplay)
    }
}
