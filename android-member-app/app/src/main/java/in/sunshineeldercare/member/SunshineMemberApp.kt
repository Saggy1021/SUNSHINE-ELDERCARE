package `in`.sunshineeldercare.member

import android.app.Activity
import android.app.Application
import android.os.Bundle
import `in`.sunshineeldercare.member.data.api.ApiClient
import `in`.sunshineeldercare.member.data.repository.AuthRepository
import `in`.sunshineeldercare.member.data.repository.LiveRefreshManager
import `in`.sunshineeldercare.member.data.security.SecureSessionManager

class SunshineMemberApp : Application() {

    lateinit var authRepository: AuthRepository
        private set

    private var startedActivitiesCount = 0

    override fun onCreate() {
        super.onCreate()
        instance = this

        // Initialize Android Keystore-backed secure session manager
        SecureSessionManager.init(this)
        // Initialize networking
        ApiClient.init(this)
        authRepository = AuthRepository()

        // Register lifecycle callbacks for automatic 5-second foreground live refresh
        registerActivityLifecycleCallbacks(object : ActivityLifecycleCallbacks {
            override fun onActivityStarted(activity: Activity) {
                startedActivitiesCount++
                if (startedActivitiesCount == 1) {
                    LiveRefreshManager.onAppForegrounded()
                }
            }

            override fun onActivityStopped(activity: Activity) {
                startedActivitiesCount--
                if (startedActivitiesCount <= 0) {
                    startedActivitiesCount = 0
                    LiveRefreshManager.onAppBackgrounded()
                }
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
            override fun onActivityResumed(activity: Activity) {}
            override fun onActivityPaused(activity: Activity) {}
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
            override fun onActivityDestroyed(activity: Activity) {}
        })
    }

    companion object {
        lateinit var instance: SunshineMemberApp
            private set
    }
}
