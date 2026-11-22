package `in`.sunshineeldercare.member.service

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import `in`.sunshineeldercare.member.data.repository.AppUpdateManager
import `in`.sunshineeldercare.member.data.repository.SosOutboxManager

class AppUpdateCheckWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    private val TAG = "AppUpdateCheckWorker"

    override suspend fun doWork(): Result {
        Log.i(TAG, "Running periodic app update check.")

        // Do not check or update if an emergency is active or pending
        if (SosOutboxManager.hasActiveOrPendingEmergency()) {
            Log.i(TAG, "Skipping periodic update check: emergency in progress.")
            return Result.success()
        }

        try {
            AppUpdateManager.checkForUpdates(isManual = false)
            return Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Periodic update check encountered error", e)
            return Result.retry()
        }
    }
}
