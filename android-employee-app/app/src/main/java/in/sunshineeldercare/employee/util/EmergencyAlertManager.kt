package `in`.sunshineeldercare.employee.util

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import `in`.sunshineeldercare.employee.MainActivity
import `in`.sunshineeldercare.employee.data.remote.model.EmergencyAssignmentDto
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.sin

object EmergencyAlertManager {

    private const val TAG = "EmergencyAlertManager"
    const val CHANNEL_ID = "emergency_dispatch_channel"
    const val NOTIFICATION_ID = 8882

    private var lastAlertedIncidentId: String? = null

    fun initNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Emergency Dispatches",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Critical emergency dispatch alerts from EmergencyOS"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 800)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }

    /**
     * Alerts the responder when a new emergency is assigned.
     * Guaranteed to sound once per distinct incident assignment.
     */
    fun notifyAssignment(context: Context, assignment: EmergencyAssignmentDto) {
        if (assignment.id == lastAlertedIncidentId) {
            // Already alerted for this incident
            return
        }
        lastAlertedIncidentId = assignment.id

        Log.w(TAG, "Triggering emergency buzzer and alert for incident: ${assignment.incidentNumber}")

        // 1. Play high-priority buzzer alarm asynchronously
        playAudibleBuzzer(context)

        // 2. Vibrate device
        vibrateDevice(context)

        // 3. Post heads-up notification
        postNotification(context, assignment)
    }

    fun clearAlert(context: Context) {
        lastAlertedIncidentId = null
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.cancel(NOTIFICATION_ID)
    }

    private fun postNotification(context: Context, assignment: EmergencyAssignmentDto) {
        val intent = Intent(context, MainActivity::class.java).apply {
            putExtra("extra_incident_id", assignment.id)
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val memberName = assignment.member?.name ?: assignment.callerName ?: "Sunshine Member"
        val locationText = assignment.address ?: "Address on file"

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("🚨 EMERGENCY DISPATCH: ${assignment.incidentNumber}")
            .setContentText("PRIORITY: ${assignment.classification} — $memberName")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("EMERGENCY ASSIGNMENT RECEIVED\n\nIncident: ${assignment.incidentNumber}\nPriority: ${assignment.classification}\nMember: $memberName\nLocation: $locationText\nNotes: ${assignment.dispatchNotes ?: "Immediate response required"}")
            )
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.notify(NOTIFICATION_ID, notification)
    }

    /**
     * Synthesizes and plays a 960Hz / 770Hz emergency siren buzzer tone
     * matching EmergencyOS audio alerts directly.
     */
    private fun playAudibleBuzzer(context: Context) {
        CoroutineScope(Dispatchers.Default).launch {
            try {
                val sampleRate = 44100
                val durationMs = 1500 // 1.5 second burst
                val numSamples = (sampleRate * (durationMs / 1000.0)).toInt()
                val samples = ShortArray(numSamples)

                // Alternate between 960Hz and 770Hz every 250ms
                for (i in 0 until numSamples) {
                    val t = i.toDouble() / sampleRate
                    val freq = if ((t % 0.5) < 0.25) 960.0 else 770.0
                    val angle = 2.0 * Math.PI * freq * t
                    // Square wave approximation with slight softening for loud volume
                    val wave = if (sin(angle) >= 0) 0.85 else -0.85
                    samples[i] = (wave * Short.MAX_VALUE).toInt().toShort()
                }

                val audioTrack = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    AudioTrack.Builder()
                        .setAudioAttributes(
                            AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        )
                        .setAudioFormat(
                            AudioFormat.Builder()
                                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                                .setSampleRate(sampleRate)
                                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                                .build()
                        )
                        .setBufferSizeInBytes(samples.size * 2)
                        .setTransferMode(AudioTrack.MODE_STATIC)
                        .build()
                } else {
                    @Suppress("DEPRECATION")
                    AudioTrack(
                        AudioManager.STREAM_ALARM,
                        sampleRate,
                        AudioFormat.CHANNEL_OUT_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        samples.size * 2,
                        AudioTrack.MODE_STATIC
                    )
                }

                audioTrack.write(samples, 0, samples.size)
                audioTrack.play()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to play synthesized audio buzzer", e)
            }
        }
    }

    private fun vibrateDevice(context: Context) {
        try {
            val pattern = longArrayOf(0, 500, 200, 500, 200, 800)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createWaveform(pattern, -1))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(pattern, -1)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Vibration failed", e)
        }
    }
}
