package `in`.sunshineeldercare.member

import android.app.Application
import `in`.sunshineeldercare.member.data.api.ApiClient
import `in`.sunshineeldercare.member.data.repository.AuthRepository
import `in`.sunshineeldercare.member.data.security.SecureSessionManager

class SunshineMemberApp : Application() {

    lateinit var authRepository: AuthRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        // Initialize Android Keystore-backed secure session manager
        SecureSessionManager.init(this)
        // Initialize networking
        ApiClient.init(this)
        authRepository = AuthRepository()
    }

    companion object {
        lateinit var instance: SunshineMemberApp
            private set
    }
}
