package `in`.sunshineeldercare.member.data.model

import kotlinx.serialization.Serializable

@Serializable
data class DashboardResponse(
    val success: Boolean = false,
    val error: String? = null,
    val member: DashboardMemberDto? = null,
    val membership: DashboardMembershipDto? = null,
    val recentReceipts: List<ReceiptSummaryDto> = emptyList(),
    val systemNotifications: List<NotificationDto> = emptyList(),
    val events: List<CalendarEventDto> = emptyList()
)

@Serializable
data class DashboardMemberDto(
    val id: String = "",
    val memberId: String = "",
    val name: String = "",
    val email: String = "",
    val gender: String? = null,
    val phone: String? = null,
    val bloodGroup: String? = null,
    val emergencyContact: EmergencyContactDto? = null,
    val preferredHospital: String? = null
)

@Serializable
data class EmergencyContactDto(
    val name: String = "",
    val phone: String = "",
    val relation: String = ""
)

@Serializable
data class DashboardMembershipDto(
    val id: String = "",
    val planName: String = "",
    val planSlug: String = "",
    val category: String = "",
    val variantType: String = "",
    val status: String = "",
    val startDate: String? = null,
    val endDate: String? = null,
    val daysRemaining: Int = 0,
    val hasEmergencyAssistant: Boolean = false,
    val services: List<CareServiceDto> = emptyList()
)

@Serializable
data class CareServiceDto(
    val serviceName: String = "",
    val serviceNote: String? = null
)

@Serializable
data class ReceiptSummaryDto(
    val id: String = "",
    val receiptNumber: String = "",
    val amount: Double = 0.0,
    val date: String = "",
    val method: String = "ONLINE",
    val downloadUrl: String = ""
)

@Serializable
data class NotificationDto(
    val id: String = "",
    val title: String = "",
    val message: String = "",
    val date: String = "",
    val read: Boolean = false
)

@Serializable
data class CalendarEventDto(
    val id: String = "",
    val date: String = "",
    val month: String = "",
    val title: String = "",
    val description: String? = null,
    val location: String? = null,
    val time: String? = null
)
