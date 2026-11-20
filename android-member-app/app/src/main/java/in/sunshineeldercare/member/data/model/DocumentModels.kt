package `in`.sunshineeldercare.member.data.model

import kotlinx.serialization.Serializable

@Serializable
data class DocumentsResponse(
    val success: Boolean,
    val error: String? = null,
    val documents: List<MemberDocumentDto> = emptyList()
)

@Serializable
data class MemberDocumentDto(
    val id: String,
    val documentType: String = "PAYMENT_RECEIPT",
    val title: String,
    val receiptNumber: String,
    val amount: Double,
    val currency: String = "INR",
    val issueDate: String,
    val paymentMethod: String = "ONLINE",
    val planName: String,
    val downloadUrl: String
)
