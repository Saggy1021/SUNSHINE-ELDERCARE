package `in`.sunshineeldercare.member.data.repository

import `in`.sunshineeldercare.member.data.api.ApiClient
import `in`.sunshineeldercare.member.data.api.ApiErrorParser
import `in`.sunshineeldercare.member.data.model.DashboardResponse
import `in`.sunshineeldercare.member.data.model.DocumentsResponse
import `in`.sunshineeldercare.member.data.model.ProfileResponse
import `in`.sunshineeldercare.member.data.model.ProfileUpdateRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MemberRepository {

    private val api = ApiClient.service

    suspend fun getDashboard(): Result<DashboardResponse> = withContext(Dispatchers.IO) {
        try {
            val res = api.getDashboard()
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(res.body()!!)
            } else {
                val errorMsg = if (res.isSuccessful) {
                    res.body()?.error ?: "Failed to fetch dashboard"
                } else {
                    ApiErrorParser.parse(res, "Failed to fetch dashboard")
                }
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            val msg = ApiErrorParser.mapThrowable(e, "Failed to load dashboard data.")
            Result.failure(Exception(msg))
        }
    }

    suspend fun getProfile(): Result<ProfileResponse> = withContext(Dispatchers.IO) {
        try {
            val res = api.getProfile()
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(res.body()!!)
            } else {
                val errorMsg = if (res.isSuccessful) {
                    res.body()?.error ?: "Failed to fetch profile"
                } else {
                    ApiErrorParser.parse(res, "Failed to fetch profile")
                }
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            val msg = ApiErrorParser.mapThrowable(e, "Failed to load profile.")
            Result.failure(Exception(msg))
        }
    }

    suspend fun updateProfile(request: ProfileUpdateRequest): Result<String> = withContext(Dispatchers.IO) {
        try {
            val res = api.updateProfile(request)
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(res.body()?.message ?: "Profile updated successfully")
            } else {
                val errorMsg = if (res.isSuccessful) {
                    res.body()?.error ?: "Failed to save profile changes"
                } else {
                    ApiErrorParser.parse(res, "Failed to save profile changes")
                }
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            val msg = ApiErrorParser.mapThrowable(e, "Failed to update profile.")
            Result.failure(Exception(msg))
        }
    }

    suspend fun getDocuments(): Result<DocumentsResponse> = withContext(Dispatchers.IO) {
        try {
            val res = api.getDocuments()
            if (res.isSuccessful && res.body()?.success == true) {
                Result.success(res.body()!!)
            } else {
                val errorMsg = if (res.isSuccessful) {
                    res.body()?.error ?: "Failed to load documents"
                } else {
                    ApiErrorParser.parse(res, "Failed to load documents")
                }
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Exception) {
            val msg = ApiErrorParser.mapThrowable(e, "Failed to load documents.")
            Result.failure(Exception(msg))
        }
    }
}
