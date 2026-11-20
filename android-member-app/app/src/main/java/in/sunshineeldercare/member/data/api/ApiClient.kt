package `in`.sunshineeldercare.member.data.api

import android.content.Context
import `in`.sunshineeldercare.member.AppConfig
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    val PRODUCTION_URL: String = AppConfig.DEFAULT_API_URL

    var baseUrl: String = PRODUCTION_URL
        private set

    fun getReceiptDownloadUrl(receiptId: String): String {
        val base = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"
        return "${base}api/receipts/$receiptId/download"
    }

    private val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
        coerceInputValues = true
    }

    private lateinit var okHttpClient: OkHttpClient
    private lateinit var retrofit: Retrofit
    lateinit var service: MobileApiService
        private set

    fun init(context: Context, url: String = baseUrl) {
        baseUrl = if (url.endsWith("/")) url else "$url/"

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        okHttpClient = OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor())
            .addInterceptor(ApiResponseInterceptor())
            .addInterceptor(logging)
            .retryOnConnectionFailure(true)
            .connectionPool(okhttp3.ConnectionPool(5, 5, TimeUnit.MINUTES))
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        val contentType = "application/json".toMediaType()

        retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory(contentType))
            .build()

        service = retrofit.create(MobileApiService::class.java)
    }
}
