package `in`.sunshineeldercare.employee.data.remote

import `in`.sunshineeldercare.employee.data.remote.model.*
import retrofit2.Response
import retrofit2.http.*

interface EmployeeApiService {

    // Auth endpoints
    @POST("api/employee/auth/initiate-activation")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun initiateActivation(
        @Body request: InitiateActivationRequest
    ): Response<InitiateActivationResponse>

    @POST("api/employee/auth/verify-activation")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun verifyActivation(
        @Body request: VerifyActivationRequest
    ): Response<VerifyActivationResponse>

    @POST("api/employee/auth/set-password")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun setPassword(
        @Body request: SetPasswordRequest
    ): Response<SetPasswordResponse>

    @POST("api/employee/auth/login")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun login(
        @Body request: LoginRequest
    ): Response<LoginResponse>

    @GET("api/employee/auth/me")
    @Headers("Accept: application/json")
    suspend fun getMe(): Response<MeResponse>

    @POST("api/employee/auth/logout")
    @Headers("Accept: application/json")
    suspend fun logout(): Response<LogoutResponse>

    // Visit endpoints
    @GET("api/employee/visits")
    @Headers("Accept: application/json")
    suspend fun getVisits(
        @Query("filter") filter: String? = null
    ): Response<VisitsListResponse>

    @GET("api/employee/visits/{id}")
    @Headers("Accept: application/json")
    suspend fun getVisitById(
        @Path("id") visitId: String
    ): Response<VisitDetailsResponse>

    @PATCH("api/employee/visits/{id}/time")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun updateVisitTime(
        @Path("id") visitId: String,
        @Body request: UpdateTimeRequest
    ): Response<UpdateTimeResponse>

    @PATCH("api/employee/visits/{id}/work-description")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun updateWorkDescription(
        @Path("id") visitId: String,
        @Body request: UpdateWorkDescriptionRequest
    ): Response<UpdateWorkDescriptionResponse>

    @POST("api/employee/visits/{id}/complete")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun completeVisit(
        @Path("id") visitId: String,
        @Body request: CompleteVisitRequest
    ): Response<CompleteVisitResponse>
}
