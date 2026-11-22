package `in`.sunshineeldercare.member.service

import android.content.Context
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import `in`.sunshineeldercare.member.data.repository.SosDeliveryStatus
import `in`.sunshineeldercare.member.data.repository.SosOutboxManager

class SosDeliveryWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val TAG = "SosDeliveryWorker"

    override suspend fun getForegroundInfo(): ForegroundInfo {
        val channelId = EmergencyLocationService.CHANNEL_ID
        val notification = NotificationCompat.Builder(applicationContext, channelId)
            .setContentTitle("Emergency SOS Dispatch")
            .setContentText("Connecting to Sunshine Emergency Command Center...")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .build()
        return ForegroundInfo(NOTIFICATION_ID, notification)
    }

    override suspend fun doWork(): Result {
        val requestId = inputData.getString("requestId")
        Log.i(TAG, "Executing durable SOS delivery for requestId: $requestId (attempt: $runAttemptCount)")

        val currentItem = SosOutboxManager.getOrLoadCurrentSos(applicationContext)
        if (currentItem == null || currentItem.status == SosDeliveryStatus.DELIVERED) {
            Log.i(TAG, "SOS is already delivered or dismissed. Worker terminating successfully.")
            return Result.success()
        }

        val targetItem = if (!requestId.isNullOrBlank() && currentItem.requestId != requestId) {
            currentItem.copy(requestId = requestId)
        } else {
            currentItem
        }

        val result = SosOutboxManager.executeDeliveryNetworkCall(applicationContext, targetItem, timeoutMs = 20000L)

        return if (result.first) {
            Log.i(TAG, "Durable SOS background delivery succeeded.")
            Result.success()
        } else {
            Log.w(TAG, "Durable SOS background delivery failed: ${result.second}. Will retry.")
            if (runAttemptCount < 15) {
                Result.retry()
            } else {
                Log.e(TAG, "Maximum retry attempts reached for SOS delivery.")
                Result.failure()
            }
        }
    }

    companion object {
        private const val NOTIFICATION_ID = 9993
    }
}
