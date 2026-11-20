package `in`.sunshineeldercare.member

/**
 * Global application network configuration.
 * Configures the active API endpoint for Android builds.
 */
object AppConfig {
    // Production website endpoint
    const val PROD_API_URL = "https://www.sunshineeldercare.in/"

    // Active production URL for release builds
    val DEFAULT_API_URL: String = PROD_API_URL
}
