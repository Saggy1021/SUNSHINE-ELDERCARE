package `in`.sunshineeldercare.member.service

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import `in`.sunshineeldercare.member.MainActivity
import `in`.sunshineeldercare.member.data.api.ApiClient
import `in`.sunshineeldercare.member.data.model.TelemetryRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class EmergencyLocationService : Service(), LocationListener {

    private val TAG = "EmergencyLocService"
    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    private var locationManager: LocationManager? = null
    private var activeIncidentId: String? = null
    private var activeIncidentNumber: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == ACTION_STOP) {
            stopTelemetryService()
            return START_NOT_STICKY
        }

        activeIncidentId = intent?.getStringExtra(EXTRA_INCIDENT_ID)
        activeIncidentNumber = intent?.getStringExtra(EXTRA_INCIDENT_NUMBER) ?: "Active Incident"

        if (activeIncidentId.isNullOrBlank()) {
            Log.e(TAG, "No incidentId provided to EmergencyLocationService. Stopping.")
            stopSelf()
            return START_NOT_STICKY
        }

        // Start as foreground service with high importance notification
        val notification = buildForegroundNotification(activeIncidentNumber!!)
        startForeground(NOTIFICATION_ID, notification)

        startLocationTracking()
        return START_REDELIVER_INTENT
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Emergency Live Location Sharing",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifies when your live GPS location is being shared with emergency responders"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(incidentNumber: String): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Sunshine Emergency SOS Active")
            .setContentText("Sharing live GPS with EmergencyOS ($incidentNumber)")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .build()
    }

    @SuppressLint("MissingPermission")
    private fun startLocationTracking() {
        try {
            locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager

            val hasGps = locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) ?: false
            val hasNetwork = locationManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) ?: false

            if (hasGps) {
                locationManager?.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    5000L, // 5 seconds
                    3f,    // 3 meters
                    this
                )
            }

            if (hasNetwork) {
                locationManager?.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    5000L,
                    3f,
                    this
                )
            }

            // Immediately send last known location if available
            val lastKnown = if (hasGps) {
                locationManager?.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            } else if (hasNetwork) {
                locationManager?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            } else null

            lastKnown?.let { onLocationChanged(it) }

            Log.i(TAG, "Started location updates for emergency incident: $activeIncidentId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start location updates", e)
        }
    }

    override fun onLocationChanged(location: Location) {
        val incidentId = activeIncidentId ?: return

        serviceScope.launch {
            try {
                Log.d(TAG, "Sending GPS update: ${location.latitude}, ${location.longitude}")
                val response = ApiClient.service.sendTelemetry(
                    TelemetryRequest(
                        incidentId = incidentId,
                        latitude = location.latitude,
                        longitude = location.longitude,
                        accuracy = location.accuracy
                    )
                )

                if (response.code() == 410 || response.body()?.trackingActive == false) {
                    Log.i(TAG, "Emergency incident is resolved or cancelled (HTTP 410). Ceasing location updates.")
                    stopTelemetryService()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send telemetry update", e)
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}

    private fun stopTelemetryService() {
        try {
            locationManager?.removeUpdates(this)
        } catch (e: Exception) {
            Log.e(TAG, "Error removing location updates", e)
        }
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
        try {
            locationManager?.removeUpdates(this)
        } catch (_: Exception) {}
        Log.i(TAG, "EmergencyLocationService destroyed.")
    }

    companion object {
        const val CHANNEL_ID = "emergency_location_channel"
        const val NOTIFICATION_ID = 9991
        const val EXTRA_INCIDENT_ID = "extra_incident_id"
        const val EXTRA_INCIDENT_NUMBER = "extra_incident_number"
        const val ACTION_STOP = "action_stop_emergency_telemetry"

        fun start(context: Context, incidentId: String, incidentNumber: String) {
            val intent = Intent(context, EmergencyLocationService::class.java).apply {
                putExtra(EXTRA_INCIDENT_ID, incidentId)
                putExtra(EXTRA_INCIDENT_NUMBER, incidentNumber)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, EmergencyLocationService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }
}
