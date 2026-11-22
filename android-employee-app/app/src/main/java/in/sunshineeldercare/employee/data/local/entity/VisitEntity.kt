package `in`.sunshineeldercare.employee.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import `in`.sunshineeldercare.employee.data.remote.model.EmployeeVisitDto

@Entity(tableName = "visits")
data class VisitEntity(
    @PrimaryKey
    val id: String,
    val memberId: String,
    val primaryMemberName: String,
    val spouseName: String? = null,
    val primaryMobile: String,
    val serviceAddress: String,
    val scheduledDate: String,
    val scheduledStartTime: String,
    val scheduledEndTime: String,
    val scheduledWindowDisplay: String,
    val actualArrivalDisplay: String? = null,
    val actualDepartureDisplay: String? = null,
    val workDescription: String? = null,
    val status: String,
    val completedAt: String? = null,
    val isEmergency: Boolean = false,
    val emergencyClassification: String? = null,
    val lastSyncedAt: Long = System.currentTimeMillis()
) {
    fun toDto(): EmployeeVisitDto {
        return EmployeeVisitDto(
            id = id,
            memberId = memberId,
            primaryMemberName = primaryMemberName,
            spouseName = spouseName,
            primaryMobile = primaryMobile,
            serviceAddress = serviceAddress,
            scheduledDate = scheduledDate,
            scheduledStartTime = scheduledStartTime,
            scheduledEndTime = scheduledEndTime,
            scheduledWindowDisplay = scheduledWindowDisplay,
            actualArrivalDisplay = actualArrivalDisplay,
            actualDepartureDisplay = actualDepartureDisplay,
            workDescription = workDescription,
            status = status,
            completedAt = completedAt,
            isEmergency = isEmergency,
            emergencyClassification = emergencyClassification
        )
    }

    companion object {
        fun fromDto(dto: EmployeeVisitDto, timestamp: Long = System.currentTimeMillis()): VisitEntity {
            return VisitEntity(
                id = dto.id,
                memberId = dto.memberId,
                primaryMemberName = dto.primaryMemberName,
                spouseName = dto.spouseName,
                primaryMobile = dto.primaryMobile,
                serviceAddress = dto.serviceAddress,
                scheduledDate = dto.scheduledDate,
                scheduledStartTime = dto.scheduledStartTime,
                scheduledEndTime = dto.scheduledEndTime,
                scheduledWindowDisplay = dto.scheduledWindowDisplay,
                actualArrivalDisplay = dto.actualArrivalDisplay,
                actualDepartureDisplay = dto.actualDepartureDisplay,
                workDescription = dto.workDescription,
                status = dto.status,
                completedAt = dto.completedAt,
                isEmergency = dto.isEmergency,
                emergencyClassification = dto.emergencyClassification,
                lastSyncedAt = timestamp
            )
        }
    }
}
