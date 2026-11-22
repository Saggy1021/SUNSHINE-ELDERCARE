package `in`.sunshineeldercare.member.data.api

import `in`.sunshineeldercare.member.data.model.AppManifestResponse
import `in`.sunshineeldercare.member.data.model.DashboardResponse
import `in`.sunshineeldercare.member.data.model.DocumentsResponse
import `in`.sunshineeldercare.member.data.model.GenericApiResponse
import `in`.sunshineeldercare.member.data.model.InitiateActivationRequest
import `in`.sunshineeldercare.member.data.model.InitiateActivationResponse
import `in`.sunshineeldercare.member.data.model.LoginRequest
import `in`.sunshineeldercare.member.data.model.LoginResponse
import `in`.sunshineeldercare.member.data.model.ProfileResponse
import `in`.sunshineeldercare.member.data.model.ProfileUpdateRequest
import `in`.sunshineeldercare.member.data.model.SetPasswordRequest
import `in`.sunshineeldercare.member.data.model.SetPasswordResponse
import `in`.sunshineeldercare.member.data.model.SosTriggerRequest
import `in`.sunshineeldercare.member.data.model.SosTriggerResponse
import `in`.sunshineeldercare.member.data.model.SubmitComplaintRequest
import `in`.sunshineeldercare.member.data.model.SubmitComplaintResponse
import `in`.sunshineeldercare.member.data.model.MemberComplaintsResponse
import `in`.sunshineeldercare.member.data.model.TelemetryRequest
import `in`.sunshineeldercare.member.data.model.TelemetryResponse
import `in`.sunshineeldercare.member.data.model.VerifyActivationRequest
import `in`.sunshineeldercare.member.data.model.VerifyActivationResponse
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface MobileApiService {

    @POST("api/member/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("api/member/auth/initiate-activation")
    suspend fun initiateActivation(@Body request: InitiateActivationRequest): Response<InitiateActivationResponse>

    @POST("api/member/auth/verify-activation")
    suspend fun verifyActivation(@Body request: VerifyActivationRequest): Response<VerifyActivationResponse>

    @POST("api/member/auth/set-password")
    suspend fun setPassword(@Body request: SetPasswordRequest): Response<SetPasswordResponse>

    @POST("api/member/auth/logout")
    suspend fun logout(): Response<GenericApiResponse>

    @POST("api/emergency/sos")
    suspend fun triggerSos(@Body request: SosTriggerRequest): Response<SosTriggerResponse>

    @GET("api/apps/member-app/manifest")
    suspend fun getAppUpdateManifest(): Response<AppManifestResponse>

    @POST("api/emergency/telemetry")
    suspend fun sendTelemetry(@Body request: TelemetryRequest): Response<TelemetryResponse>

    @GET("api/member/dashboard")
    suspend fun getDashboard(
        @retrofit2.http.Header("If-None-Match") ifNoneMatch: String? = null
    ): Response<DashboardResponse>

    @GET("api/member/profile")
    suspend fun getProfile(): Response<ProfileResponse>

    @PUT("api/member/profile")
    suspend fun updateProfile(@Body request: ProfileUpdateRequest): Response<GenericApiResponse>

    @GET("api/member/documents")
    suspend fun getDocuments(): Response<DocumentsResponse>

    @GET("api/receipts/{id}/download")
    suspend fun downloadReceipt(@Path("id") receiptId: String): Response<ResponseBody>

    @GET("api/member/complaints")
    suspend fun getComplaints(): Response<MemberComplaintsResponse>

    @POST("api/member/complaints")
    suspend fun submitComplaint(@Body request: SubmitComplaintRequest): Response<SubmitComplaintResponse>
}
