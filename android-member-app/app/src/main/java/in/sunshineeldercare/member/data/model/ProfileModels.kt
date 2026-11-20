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
    val salutation: String = "Mr",
    val firstName: String = "",
    val lastName: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val alternatePhone: String = "",
    val addressLine1: String = "",
    val city: String = "Kolkata",
    val state: String = "West Bengal",
    val pincode: String = "",
    val nearestLandmark: String = "",
    val status: String = "ACTIVE",
    val membershipName: String = "",
    val membershipType: String = "",
    val membershipStatus: String = "",
    val membershipStartDate: String = "",
    val membershipEndDate: String = "",
    val bloodGroup: String = "",
    val medicalConditions: String = "",
    val allergies: String = "No known allergies",
    val hospitalPreference: String = "",
    val emergencyContactName: String = "",
    val emergencyContactPhone: String = "",
    val emergencyContactRelation: String = ""
)

@Serializable
data class ProfileUpdateRequest(
    val phone: String? = null,
    val alternatePhone: String? = null,
    val addressLine1: String? = null,
    val nearestLandmark: String? = null,
    val city: String? = null,
    val bloodGroup: String? = null,
    val medicalConditions: String? = null,
    val hospitalPreference: String? = null,
    val emergencyContactName: String? = null,
    val emergencyContactPhone: String? = null,
    val emergencyContactRelation: String? = null
)
