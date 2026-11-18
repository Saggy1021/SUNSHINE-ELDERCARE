package `in`.sunshineeldercare.employee.data.remote.model

import kotlinx.serialization.Serializable

@Serializable
data class EmployeeProfile(
    val id: String,
    val employeeId: String,
    val name: String,
    val designation: String,
    val department: String,
    val email: String
)

@Serializable
data class EmployeeVisitDto(
    val id: String,
    val memberId: String,
    val primaryMemberName: String,
    val spouseName: String? = null,
    val primaryMobile: String,
    val serviceAddress: String,
    val scheduledDate: String,
    val scheduledStartTime: String,
    val scheduledEndTime: String,
    val scheduledWindowDisplay: String,
    val actualArrivalDisplay: String? = null,
    val actualDepartureDisplay: String? = null,
    val workDescription: String? = null,
    val status: String,
    val completedAt: String? = null
)

// Auth Models
@Serializable
data class InitiateActivationRequest(
    val employeeId: String
)

@Serializable
data class InitiateActivationResponse(
    val success: Boolean,
    val message: String,
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
    val message: String,
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
    val message: String,
    val sessionToken: String? = null,
    val employee: EmployeeProfile? = null
)

@Serializable
data class LoginRequest(
    val employeeId: String,
    val password: String
)

@Serializable
data class LoginResponse(
    val success: Boolean,
    val message: String,
    val sessionToken: String? = null,
    val employee: EmployeeProfile? = null
)

@Serializable
data class MeResponse(
    val success: Boolean,
    val employee: EmployeeProfile
)

@Serializable
data class LogoutResponse(
    val success: Boolean,
    val message: String
)

// Visits Models
@Serializable
data class VisitsListResponse(
    val success: Boolean,
    val count: Int = 0,
    val filter: String = "all",
    val visits: List<EmployeeVisitDto> = emptyList()
)

@Serializable
data class VisitDetailsResponse(
    val success: Boolean,
    val visit: EmployeeVisitDto
)

@Serializable
data class UpdateTimeRequest(
    val actualArrival: String? = null,
    val actualDeparture: String? = null
)

@Serializable
data class UpdateTimeResponse(
    val success: Boolean,
    val message: String,
    val visit: EmployeeVisitDto? = null
)

@Serializable
data class UpdateWorkDescriptionRequest(
    val workDescription: String
)

@Serializable
data class UpdateWorkDescriptionResponse(
    val success: Boolean,
    val message: String,
    val visit: EmployeeVisitDto? = null
)

@Serializable
data class CompleteVisitRequest(
    val workDescription: String? = null
)

@Serializable
data class CompleteVisitResponse(
    val success: Boolean,
    val message: String,
    val visit: EmployeeVisitDto? = null
)

@Serializable
data class GenericApiResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
)
