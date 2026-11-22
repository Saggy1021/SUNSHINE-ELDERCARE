package `in`.sunshineeldercare.employee.data.remote.model

import kotlinx.serialization.Serializable

@Serializable
data class EmployeeProfile(
    val id: String = "",
    val employeeId: String = "",
    val name: String = "",
    val firstName: String? = null,
    val lastName: String? = null,
    val designation: String = "",
    val department: String = "Care Operations",
    val email: String = "",
    val contactNumber: String? = null,
    val photoReference: String? = null,
    val status: String? = null
) {
    val displayName: String
        get() {
            if (name.isNotBlank()) return name
            val full = listOfNotNull(firstName, lastName).joinToString(" ").trim()
            return if (full.isNotBlank()) full else employeeId
        }

    val displayDepartment: String
        get() = if (department.isNotBlank()) department else designation.ifBlank { "Care Operations" }
}

@Serializable
data class EmployeeVisitDto(
    val id: String = "",
    val memberId: String = "",
    val primaryMemberName: String = "",
    val spouseName: String? = null,
    val primaryMobile: String = "",
    val serviceAddress: String = "",
    val scheduledDate: String = "",
    val scheduledStartTime: String = "",
    val scheduledEndTime: String = "",
    val scheduledWindowDisplay: String = "",
    val actualArrivalDisplay: String? = null,
    val actualDepartureDisplay: String? = null,
    val workDescription: String? = null,
    val status: String = "SCHEDULED",
    val completedAt: String? = null,
    val isEmergency: Boolean = false,
    val emergencyClassification: String? = null
)

// Auth Models
@Serializable
data class InitiateActivationRequest(
    val employeeId: String
)

@Serializable
data class InitiateActivationResponse(
    val success: Boolean,
    val message: String = "",
    val maskedEmail: String? = null
)

@Serializable
data class VerifyActivationRequest(
    val employeeId: String,
    val otp: String
)

@Serializable
data class VerifyActivationResponse(
    val success: Boolean,
    val message: String = "",
    val activationToken: String? = null
)

@Serializable
data class SetPasswordRequest(
    val employeeId: String,
    val activationToken: String,
    val newPassword: String,
    val confirmPassword: String
)

@Serializable
data class SetPasswordResponse(
    val success: Boolean,
    val message: String = "",
    val sessionToken: String? = null,
    val token: String? = null,
    val employee: EmployeeProfile? = null
) {
    val effectiveToken: String?
        get() = sessionToken ?: token
}

@Serializable
data class LoginRequest(
    val employeeId: String,
    val password: String
)

@Serializable
data class LoginResponse(
    val success: Boolean,
    val message: String = "",
    val sessionToken: String? = null,
    val token: String? = null,
    val employee: EmployeeProfile? = null
) {
    val effectiveToken: String?
        get() = sessionToken ?: token
}

@Serializable
data class MeResponse(
    val success: Boolean,
    val employee: EmployeeProfile? = null
)

@Serializable
data class LogoutResponse(
    val success: Boolean,
    val message: String = ""
)

// Visits Models
@Serializable
data class VisitsListResponse(
    val success: Boolean,
    val count: Int = 0,
    val total: Int = 0,
    val filter: String = "all",
    val visits: List<EmployeeVisitDto> = emptyList()
)

@Serializable
data class VisitDetailsResponse(
    val success: Boolean,
    val visit: EmployeeVisitDto? = null
)

@Serializable
data class UpdateTimeRequest(
    val actualArrival: String? = null,
    val actualDeparture: String? = null
)

@Serializable
data class UpdateTimeResponse(
    val success: Boolean,
    val message: String = "",
    val visit: EmployeeVisitDto? = null
)

@Serializable
data class UpdateWorkDescriptionRequest(
    val workDescription: String
)

@Serializable
data class UpdateWorkDescriptionResponse(
    val success: Boolean,
    val message: String = "",
    val visit: EmployeeVisitDto? = null
)

@Serializable
data class CompleteVisitRequest(
    val workDescription: String? = null,
    val actualArrival: String? = null,
    val actualDeparture: String? = null
)

@Serializable
data class CompleteVisitResponse(
    val success: Boolean,
    val message: String = "",
    val visit: EmployeeVisitDto? = null
)

@Serializable
data class GenericApiResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
)

@Serializable
data class ActiveEmergencyResponse(
    val success: Boolean,
    val hasAssignment: Boolean = false,
    val assignment: EmergencyAssignmentDto? = null,
    val error: String? = null
)

@Serializable
data class EmergencyAssignmentDto(
    val id: String,
    val incidentNumber: String,
    val status: String,
    val classification: String = "CODE_RED",
    val callerName: String? = null,
    val callerPhone: String? = null,
    val address: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val locationAccuracy: Float? = null,
    val locationTimestamp: String? = null,
    val dispatchNotes: String? = null,
    val dispatchedAt: String? = null,
    val responderArrivedAt: String? = null,
    val member: EmergencyMemberDto? = null
)

@Serializable
data class EmergencyMemberDto(
    val memberId: String? = null,
    val name: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val landmark: String? = null,
    val bloodGroup: String? = null
)

@Serializable
data class RecordArrivalRequest(
    val incidentId: String,
    val notes: String? = null
)

@Serializable
data class RecordArrivalResponse(
    val success: Boolean,
    val message: String? = null,
    val status: String? = null,
    val responderArrivedAt: String? = null,
    val error: String? = null
)

// Duty Tracking Models
@Serializable
data class DutyStatusResponse(
    val success: Boolean,
    val isOnDuty: Boolean = false,
    val activeSession: DutySessionDto? = null,
    val todayDurationMinutes: Int = 0,
    val todaySessionsCount: Int = 0,
    val error: String? = null
)

@Serializable
data class DutySessionDto(
    val id: String = "",
    val employeeId: String = "",
    val startTime: String = "",
    val endTime: String? = null,
    val durationMinutes: Int? = null,
    val status: String = "ON_DUTY",
    val notes: String? = null
)

@Serializable
data class StartDutyRequest(
    val notes: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

@Serializable
data class EndDutyRequest(
    val notes: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

@Serializable
data class DutyHistoryResponse(
    val success: Boolean,
    val count: Int = 0,
    val totalMinutes: Int = 0,
    val sessions: List<DutySessionDto> = emptyList(),
    val error: String? = null
)

// Employee SOS Models
@Serializable
data class EmployeeSosRequest(
    val notes: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null
)

@Serializable
data class EmployeeSosResponse(
    val success: Boolean,
    val incidentId: String? = null,
    val incidentNumber: String? = null,
    val message: String? = null,
    val error: String? = null
)

// Community Events Models
@Serializable
data class CommunityEventDto(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val eventDate: String = "",
    val startTime: String = "",
    val endTime: String? = null,
    val venue: String = "",
    val imageUrl: String? = null,
    val audience: String = "EVERYONE"
)

@Serializable
data class EmployeeEventsResponse(
    val success: Boolean,
    val events: List<CommunityEventDto> = emptyList(),
    val error: String? = null
)

// Leave Models
@Serializable
data class ApplyLeaveRequest(
    val startDate: String,
    val endDate: String,
    val reason: String
)

@Serializable
data class LeaveRequestDto(
    val id: String = "",
    val employeeId: String = "",
    val startDate: String = "",
    val endDate: String = "",
    val totalDays: Int = 1,
    val reason: String = "",
    val status: String = "PENDING",
    val adminRemarks: String? = null,
    val createdAt: String = ""
)

@Serializable
data class LeaveListResponse(
    val success: Boolean,
    val requests: List<LeaveRequestDto> = emptyList(),
    val error: String? = null
)
