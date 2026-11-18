package `in`.sunshineeldercare.employee.data.repository

import android.util.Log
import `in`.sunshineeldercare.employee.data.local.dao.VisitDao
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import `in`.sunshineeldercare.employee.data.remote.EmployeeApiService
import `in`.sunshineeldercare.employee.data.remote.model.*
import kotlinx.coroutines.flow.Flow
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class VisitsRepository(
    private val apiService: EmployeeApiService,
    private val visitDao: VisitDao
) {

    fun getTodayDateFormatted(): String {
        return try {
            val zdt = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"))
            zdt.format(DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH))
        } catch (_: Throwable) {
            val sdf = SimpleDateFormat("dd MMM yyyy", Locale.ENGLISH)
            sdf.timeZone = TimeZone.getTimeZone("Asia/Kolkata")
            sdf.format(Date())
        }
    }

    fun getTodayDateIso(): String {
        return try {
            val zdt = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"))
            zdt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd", Locale.ENGLISH))
        } catch (_: Throwable) {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.ENGLISH)
            sdf.timeZone = TimeZone.getTimeZone("Asia/Kolkata")
            sdf.format(Date())
        }
    }

    fun getTodayVisits(): Flow<List<VisitEntity>> {
        return visitDao.getTodayVisits(getTodayDateFormatted(), getTodayDateIso())
    }

    fun getUpcomingVisits(): Flow<List<VisitEntity>> {
        return visitDao.getUpcomingVisits(getTodayDateFormatted(), getTodayDateIso())
    }

    fun getCompletedVisits(): Flow<List<VisitEntity>> {
        return visitDao.getCompletedVisits()
    }

    fun getAllVisits(): Flow<List<VisitEntity>> {
        return visitDao.getAllVisits()
    }

    fun getVisitById(visitId: String): Flow<VisitEntity?> {
        return visitDao.getVisitById(visitId)
    }

    suspend fun syncVisits(filter: String = "all"): Result<List<EmployeeVisitDto>> {
        return try {
            val response = apiService.getVisits(filter = filter)
            if (response.isSuccessful && response.body() != null) {
                val visits = response.body()!!.visits
                val entities = visits.map { VisitEntity.fromDto(it) }
                visitDao.insertAll(entities)
                Result.success(visits)
            } else {
                val errorMsg = parseErrorMessage(response.errorBody()?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Throwable) {
            Log.e("VisitsRepository", "Error syncing visits", e)
            Result.failure(Exception(e.message ?: "Failed to sync visits with server", e))
        }
    }

    suspend fun fetchVisitDetails(visitId: String): Result<EmployeeVisitDto> {
        return try {
            val response = apiService.getVisitById(visitId)
            if (response.isSuccessful && response.body()?.visit != null) {
                val visitDto = response.body()!!.visit!!
                visitDao.insert(VisitEntity.fromDto(visitDto))
                Result.success(visitDto)
            } else {
                val errorMsg = parseErrorMessage(response.errorBody()?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Throwable) {
            Log.e("VisitsRepository", "Error fetching visit details for $visitId", e)
            Result.failure(Exception(e.message ?: "Failed to fetch visit details", e))
        }
    }

    suspend fun updateTime(
        visitId: String,
        actualArrival: String? = null,
        actualDeparture: String? = null
    ): Result<EmployeeVisitDto> {
        return try {
            val response = apiService.updateVisitTime(
                visitId = visitId,
                request = UpdateTimeRequest(
                    actualArrival = actualArrival,
                    actualDeparture = actualDeparture
                )
            )
            if (response.isSuccessful && response.body() != null) {
                val updatedVisit = response.body()!!.visit
                if (updatedVisit != null) {
                    visitDao.insert(VisitEntity.fromDto(updatedVisit))
                    Result.success(updatedVisit)
                } else {
                    fetchVisitDetails(visitId)
                }
            } else {
                val errorMsg = parseErrorMessage(response.errorBody()?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Throwable) {
            Log.e("VisitsRepository", "Error updating visit time", e)
            Result.failure(Exception(e.message ?: "Failed to update visit time", e))
        }
    }

    suspend fun updateWorkDescription(
        visitId: String,
        workDescription: String
    ): Result<EmployeeVisitDto> {
        return try {
            val response = apiService.updateWorkDescription(
                visitId = visitId,
                request = UpdateWorkDescriptionRequest(workDescription = workDescription)
            )
            if (response.isSuccessful && response.body() != null) {
                val updatedVisit = response.body()!!.visit
                if (updatedVisit != null) {
                    visitDao.insert(VisitEntity.fromDto(updatedVisit))
                    Result.success(updatedVisit)
                } else {
                    fetchVisitDetails(visitId)
                }
            } else {
                val errorMsg = parseErrorMessage(response.errorBody()?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Throwable) {
            Log.e("VisitsRepository", "Error updating work description", e)
            Result.failure(Exception(e.message ?: "Failed to update work description", e))
        }
    }

    suspend fun completeVisit(
        visitId: String,
        workDescription: String? = null,
        actualArrival: String? = null,
        actualDeparture: String? = null
    ): Result<EmployeeVisitDto> {
        return try {
            val response = apiService.completeVisit(
                visitId = visitId,
                request = CompleteVisitRequest(
                    workDescription = workDescription,
                    actualArrival = actualArrival,
                    actualDeparture = actualDeparture
                )
            )
            if (response.isSuccessful && response.body() != null) {
                val completedVisit = response.body()!!.visit
                if (completedVisit != null) {
                    visitDao.insert(VisitEntity.fromDto(completedVisit))
                    Result.success(completedVisit)
                } else {
                    fetchVisitDetails(visitId)
                }
            } else {
                val errorMsg = parseErrorMessage(response.errorBody()?.string())
                Result.failure(Exception(errorMsg))
            }
        } catch (e: Throwable) {
            Log.e("VisitsRepository", "Error completing visit", e)
            Result.failure(Exception(e.message ?: "Failed to mark visit completed", e))
        }
    }

    suspend fun clearCache() {
        try {
            visitDao.clearAll()
        } catch (e: Throwable) {
            Log.e("VisitsRepository", "Error clearing visits cache", e)
        }
    }

    private fun parseErrorMessage(errorBody: String?): String {
        if (errorBody.isNullOrBlank()) return "An unexpected error occurred while communicating with the server."
        return try {
            val json = JSONObject(errorBody)
            json.optString("message", json.optString("error", "Error processing request"))
        } catch (_: Throwable) {
            "Error processing visit data. Please check your network connection."
        }
    }
}
