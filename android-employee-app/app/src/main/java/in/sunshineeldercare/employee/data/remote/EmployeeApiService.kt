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

    // Emergency incident dispatch endpoints
    @GET("api/employee/emergency/active")
    @Headers("Accept: application/json")
    suspend fun getActiveEmergency(): Response<ActiveEmergencyResponse>

    @POST("api/employee/emergency/arrival")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun recordEmergencyArrival(
        @Body request: RecordArrivalRequest
    ): Response<RecordArrivalResponse>

    // Duty Management endpoints
    @GET("api/employee/duty/status")
    @Headers("Accept: application/json")
    suspend fun getDutyStatus(): Response<DutyStatusResponse>

    @POST("api/employee/duty/start")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun startDuty(
        @Body request: StartDutyRequest = StartDutyRequest()
    ): Response<DutyStatusResponse>

    @POST("api/employee/duty/end")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun endDuty(
        @Body request: EndDutyRequest = EndDutyRequest()
    ): Response<DutyStatusResponse>

    @GET("api/employee/duty/history")
    @Headers("Accept: application/json")
    suspend fun getDutyHistory(): Response<DutyHistoryResponse>

    // Employee SOS endpoint
    @POST("api/employee/emergency/sos")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun triggerSos(
        @Body request: EmployeeSosRequest = EmployeeSosRequest()
    ): Response<EmployeeSosResponse>

    // Universal Events endpoint
    @GET("api/employee/events")
    @Headers("Accept: application/json")
    suspend fun getEvents(): Response<EmployeeEventsResponse>

    // Leave Application endpoints
    @POST("api/employee/leave")
    @Headers("Accept: application/json", "Content-Type: application/json")
    suspend fun applyLeave(
        @Body request: ApplyLeaveRequest
    ): Response<GenericApiResponse>

    @GET("api/employee/leave")
    @Headers("Accept: application/json")
    suspend fun getLeaveHistory(): Response<LeaveListResponse>
}
