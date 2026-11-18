package `in`.sunshineeldercare.employee.data.repository

import `in`.sunshineeldercare.employee.data.local.dao.VisitDao
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import `in`.sunshineeldercare.employee.data.remote.EmployeeApiService
import `in`.sunshineeldercare.employee.data.remote.model.*
import kotlinx.coroutines.flow.Flow
import org.json.JSONObject
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

class VisitsRepository(
    private val apiService: EmployeeApiService,
    private val visitDao: VisitDao
) {

    fun getTodayDate(): String {
        val zdt = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"))
        return zdt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
    }

    fun getTodayVisits(): Flow<List<VisitEntity>> {
        return visitDao.getTodayVisits(getTodayDate())
    }

    fun getUpcomingVisits(): Flow<List<VisitEntity>> {
        return visitDao.getUpcomingVisits(getTodayDate())
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
        } catch (e: Exception) {
            Result.failure(e)
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
        } catch (e: Exception) {
            Result.failure(e)
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
        } catch (e: Exception) {
            Result.failure(e)
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
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun completeVisit(
        visitId: String,
        workDescription: String? = null
    ): Result<EmployeeVisitDto> {
        return try {
            val response = apiService.completeVisit(
                visitId = visitId,
                request = CompleteVisitRequest(workDescription = workDescription)
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
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun clearCache() {
        visitDao.clearAll()
    }

    private fun parseErrorMessage(errorBody: String?): String {
        if (errorBody.isNullOrBlank()) return "An unexpected error occurred. Please try again."
        return try {
            val json = JSONObject(errorBody)
            json.optString("message", json.optString("error", "Error communicating with server"))
        } catch (_: Exception) {
            "Network error. Please verify your connection."
        }
    }
}
