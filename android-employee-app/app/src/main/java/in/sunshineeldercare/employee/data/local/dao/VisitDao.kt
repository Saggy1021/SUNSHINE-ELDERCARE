package `in`.sunshineeldercare.employee.data.local.dao

import androidx.room.*
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface VisitDao {

    @Query("SELECT * FROM visits ORDER BY scheduledDate ASC, scheduledStartTime ASC")
    fun getAllVisits(): Flow<List<VisitEntity>>

    @Query("SELECT * FROM visits WHERE (scheduledDate = :todayFormatted OR scheduledDate = :todayIso) ORDER BY scheduledStartTime ASC")
    fun getTodayVisits(todayFormatted: String, todayIso: String): Flow<List<VisitEntity>>

    @Query("SELECT * FROM visits WHERE (scheduledDate != :todayFormatted AND scheduledDate != :todayIso) AND status != 'COMPLETED' AND status != 'CANCELLED' ORDER BY scheduledDate ASC, scheduledStartTime ASC")
    fun getUpcomingVisits(todayFormatted: String, todayIso: String): Flow<List<VisitEntity>>

    @Query("SELECT * FROM visits WHERE status = 'COMPLETED' ORDER BY scheduledDate DESC, scheduledStartTime DESC")
    fun getCompletedVisits(): Flow<List<VisitEntity>>

    @Query("SELECT * FROM visits WHERE id = :visitId LIMIT 1")
    fun getVisitById(visitId: String): Flow<VisitEntity?>

    @Query("SELECT * FROM visits WHERE id = :visitId LIMIT 1")
    suspend fun getVisitByIdSync(visitId: String): VisitEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(visits: List<VisitEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(visit: VisitEntity)

    @Update
    suspend fun update(visit: VisitEntity)

    @Query("UPDATE visits SET actualArrivalDisplay = COALESCE(:arrival, actualArrivalDisplay), actualDepartureDisplay = COALESCE(:departure, actualDepartureDisplay), status = :newStatus WHERE id = :visitId")
    suspend fun updateTimes(visitId: String, arrival: String?, departure: String?, newStatus: String)

    @Query("UPDATE visits SET workDescription = :description WHERE id = :visitId")
    suspend fun updateWorkDescription(visitId: String, description: String)

    @Query("UPDATE visits SET status = 'COMPLETED', completedAt = :completedAt WHERE id = :visitId")
    suspend fun markCompleted(visitId: String, completedAt: String)

    @Query("DELETE FROM visits")
    suspend fun clearAll()
}
