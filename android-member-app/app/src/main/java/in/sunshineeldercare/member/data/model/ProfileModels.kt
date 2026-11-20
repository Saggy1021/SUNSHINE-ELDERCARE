package `in`.sunshineeldercare.member.data.model

import kotlinx.serialization.Serializable

@Serializable
data class ProfileResponse(
    val success: Boolean = false,
    val error: String? = null,
    val profile: FullProfileDto? = null
)

@Serializable
data class FullProfileDto(
    val id: String = "",
    val memberId: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val addressLine1: String = "",
    val city: String = "Kolkata",
    val state: String = "West Bengal",
    val pincode: String = "",
    val bloodGroup: String = "",
    val medicalConditions: String = "None reported",
    val allergies: String = "No known allergies",
    val hospitalPreference: String = "",
    val emergencyContactName: String = "",
    val emergencyContactPhone: String = "",
    val emergencyContactRelation: String = "Family"
)

@Serializable
data class ProfileUpdateRequest(
    val phone: String? = null,
    val addressLine1: String? = null,
    val city: String? = null,
    val bloodGroup: String? = null,
    val medicalConditions: String? = null,
    val hospitalPreference: String? = null,
    val emergencyContactName: String? = null,
    val emergencyContactPhone: String? = null,
    val emergencyContactRelation: String? = null
)
