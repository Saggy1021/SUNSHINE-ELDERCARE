package `in`.sunshineeldercare.member.data.model

import kotlinx.serialization.Serializable

@Serializable
data class LoginRequest(
    val memberId: String,
    val password: String
)

@Serializable
data class LoginResponse(
    val success: Boolean,
    val token: String? = null,
    val requiresActivation: Boolean? = null,
    val error: String? = null,
    val member: MemberAuthDto? = null,
    val subscription: SubscriptionSummaryDto? = null
)

@Serializable
data class InitiateActivationRequest(
    val memberId: String
)

@Serializable
data class InitiateActivationResponse(
    val success: Boolean,
    val maskedEmail: String? = null,
    val message: String? = null,
    val error: String? = null
)

@Serializable
data class VerifyActivationRequest(
    val memberId: String,
    val otp: String
)

@Serializable
data class VerifyActivationResponse(
    val success: Boolean,
    val activationToken: String? = null,
    val message: String? = null,
    val error: String? = null
)

@Serializable
data class SetPasswordRequest(
    val memberId: String,
    val activationToken: String,
    val password: String
)

@Serializable
data class SetPasswordResponse(
    val success: Boolean,
    val token: String? = null,
    val member: MemberAuthDto? = null,
    val error: String? = null
)

@Serializable
data class SosTriggerRequest(
    val triggerSource: String = "MEMBER_APP_SOS",
    val latitude: Double? = null,
    val longitude: Double? = null,
    val accuracy: Float? = null,
    val notes: String? = null
)

@Serializable
data class SosTriggerResponse(
    val success: Boolean,
    val incidentId: String? = null,
    val incidentNumber: String? = null,
    val status: String? = null,
    val classification: String? = null,
    val emergencyHelpline: String? = null,
    val trackingActive: Boolean = false,
    val error: String? = null
)

@Serializable
data class TelemetryRequest(
    val incidentId: String,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float? = null
)

@Serializable
data class TelemetryResponse(
    val success: Boolean = false,
    val trackingActive: Boolean = false,
    val error: String? = null
)

@Serializable
data class MemberAuthDto(
    val id: String,
    val memberId: String,
    val name: String,
    val email: String? = null,
    val phone: String? = null,
    val gender: String? = null,
    val status: String = "ACTIVE"
)

@Serializable
data class SubscriptionSummaryDto(
    val id: String,
    val planName: String,
    val planSlug: String,
    val variantType: String,
    val status: String,
    val startDate: String? = null,
    val endDate: String? = null,
    val hasEmergencyAssistant: Boolean = true
)

@Serializable
data class GenericApiResponse(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null
)
