package `in`.sunshineeldercare.member.service

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import `in`.sunshineeldercare.member.data.repository.SosDeliveryStatus
import `in`.sunshineeldercare.member.data.repository.SosOutboxManager

class SosDeliveryWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val TAG = "SosDeliveryWorker"

    override suspend fun doWork(): Result {
        val requestId = inputData.getString("requestId")
        Log.i(TAG, "Executing durable SOS delivery for requestId: $requestId (attempt: $runAttemptCount)")

        val currentItem = SosOutboxManager.currentSos.value
        if (currentItem == null || currentItem.status == SosDeliveryStatus.DELIVERED) {
            Log.i(TAG, "SOS is already delivered or dismissed. Worker terminating successfully.")
            return Result.success()
        }

        // If requestId doesn't match and not empty, use current item
        val targetItem = if (requestId.isNullOrBlank() || currentItem.requestId == requestId) {
            currentItem
        } else {
            currentItem
        }

        val result = SosOutboxManager.executeDeliveryNetworkCall(applicationContext, targetItem)

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
}
