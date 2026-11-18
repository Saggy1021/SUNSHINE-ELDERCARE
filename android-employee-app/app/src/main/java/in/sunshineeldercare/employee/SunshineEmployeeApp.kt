package `in`.sunshineeldercare.employee

import android.app.Application
import `in`.sunshineeldercare.employee.data.local.AppDatabase
import `in`.sunshineeldercare.employee.data.remote.EmployeeApiService
import `in`.sunshineeldercare.employee.data.remote.RetrofitClient
import `in`.sunshineeldercare.employee.data.repository.AuthRepository
import `in`.sunshineeldercare.employee.data.repository.VisitsRepository
import `in`.sunshineeldercare.employee.data.storage.SecureTokenManager

class SunshineEmployeeApp : Application() {

    lateinit var tokenManager: SecureTokenManager
        private set

    lateinit var database: AppDatabase
        private set

    lateinit var apiService: EmployeeApiService
        private set

    lateinit var authRepository: AuthRepository
        private set

    lateinit var visitsRepository: VisitsRepository
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        tokenManager = SecureTokenManager(this)
        database = AppDatabase.getInstance(this)
        apiService = RetrofitClient.create(tokenManager)
        authRepository = AuthRepository(apiService, tokenManager)
        visitsRepository = VisitsRepository(apiService, database.visitDao())
    }

    companion object {
        lateinit var instance: SunshineEmployeeApp
            private set
    }
}
