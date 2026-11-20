package `in`.sunshineeldercare.member.data.model

import kotlinx.serialization.Serializable

@Serializable
data class SubmitComplaintRequest(
    val category: String,
    val subject: String,
    val description: String
)

@Serializable
data class MemberComplaintDto(
    val id: String = "",
    val complaintNumber: String = "",
    val category: String = "",
    val subject: String = "",
    val description: String = "",
    val status: String = "NEW", // NEW, IN_PROGRESS, RESOLVED
    val adminResponse: String? = null,
    val createdAt: String = "",
    val resolvedAt: String? = null
)

@Serializable
data class SubmitComplaintResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null,
    val complaint: MemberComplaintDto? = null
)

@Serializable
data class MemberComplaintsResponse(
    val success: Boolean,
    val error: String? = null,
    val complaints: List<MemberComplaintDto> = emptyList()
)
