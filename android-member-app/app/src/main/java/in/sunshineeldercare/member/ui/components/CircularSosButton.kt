package `in`.sunshineeldercare.member.ui.components

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.location.LocationManager
import android.net.Uri
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import `in`.sunshineeldercare.member.data.api.ApiClient
import `in`.sunshineeldercare.member.data.model.SosTriggerRequest
import `in`.sunshineeldercare.member.service.EmergencyLocationService
import `in`.sunshineeldercare.member.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val EMERGENCY_HELPLINE = "03340585515"
private const val DISPLAY_HELPLINE = "033-40585515"

@Composable
fun CircularSosButton(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var showConfirmDialog by remember { mutableStateOf(false) }
    var isSubmittingSos by remember { mutableStateOf(false) }
    var activeIncidentNumber by remember { mutableStateOf<String?>(null) }
    var activeIncidentId by remember { mutableStateOf<String?>(null) }
    var sosError by remember { mutableStateOf<String?>(null) }
    var showActiveEmergencyDialog by remember { mutableStateOf(false) }

    // Pulsing animation for ambient emergency ring
    val infiniteTransition = rememberInfiniteTransition(label = "SosPulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "PulseScale"
    )

    fun triggerSosWorkflow() {
        isSubmittingSos = true
        sosError = null

        coroutineScope.launch {
            try {
                // Obtain best available initial GPS location
                var lat: Double? = null
                var lon: Double? = null
                var acc: Float? = null

                try {
                    val locManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
                    @SuppressLint("MissingPermission")
                    val lastGps = locManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                        ?: locManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                    if (lastGps != null) {
                        lat = lastGps.latitude
                        lon = lastGps.longitude
                        acc = lastGps.accuracy
                    }
                } catch (_: Exception) {}

                val response = withContext(Dispatchers.IO) {
                    ApiClient.service.triggerSos(
                        SosTriggerRequest(
                            triggerSource = "MEMBER_APP_SOS",
                            latitude = lat,
                            longitude = lon,
                            accuracy = acc,
                            notes = "Emergency SOS triggered by member via Android Member App"
                        )
                    )
                }

                isSubmittingSos = false

                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    activeIncidentId = body.incidentId
                    activeIncidentNumber = body.incidentNumber
                    showConfirmDialog = false
                    showActiveEmergencyDialog = true

                    // Start background GPS streaming foreground service
                    if (!body.incidentId.isNullOrBlank()) {
                        EmergencyLocationService.start(
                            context,
                            body.incidentId,
                            body.incidentNumber ?: "Active Incident"
                        )
                    }
                } else {
                    val err = response.body()?.error ?: "Failed to connect to EmergencyOS. Please call the helpline immediately."
                    sosError = err
                }
            } catch (e: Exception) {
                isSubmittingSos = false
                sosError = "Network error: ${e.message}. Calling helpline directly."
                launchEmergencyDialer(context, EMERGENCY_HELPLINE)
            }
        }
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 20.dp, horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header Pill
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Color(0xFFFEE2E2))
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = null,
                        tint = SosRed,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.size(6.dp))
                    Text(
                        text = "24/7 EMERGENCY ASSISTANCE",
                        color = SosRed,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Prominent Circular Button with Ambient Pulse Ring
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier.size(116.dp)
            ) {
                // Outer soft pulse ring
                Box(
                    modifier = Modifier
                        .size(116.dp)
                        .scale(pulseScale)
                        .clip(CircleShape)
                        .background(Color(0x33DC2626))
                )

                // Outer border ring
                Box(
                    modifier = Modifier
                        .size(104.dp)
                        .clip(CircleShape)
                        .background(Color(0x22DC2626))
                        .border(2.dp, Color(0x66DC2626), CircleShape)
                )

                // Inner Main Circular SOS Button
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(92.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                listOf(SosRed, SosRedDark)
                            )
                        )
                        .border(4.dp, IvoryBackground, CircleShape)
                        .clickable {
                            showConfirmDialog = true
                        }
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.PhoneInTalk,
                            contentDescription = "Emergency SOS",
                            tint = Color.White,
                            modifier = Modifier.size(24.dp)
                        )
                        Text(
                            text = "SOS",
                            color = Color.White,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 2.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Clear Senior Action Label
            Text(
                text = "TAP FOR EMERGENCY ASSISTANCE",
                color = NavyDark,
                fontSize = 14.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 0.5.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Prominent Phone Number Badge (Direct dial fallback)
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFFFEF2F2))
                    .border(1.dp, Color(0xFFFECACA), RoundedCornerShape(8.dp))
                    .clickable { launchEmergencyDialer(context, EMERGENCY_HELPLINE) }
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Phone,
                        contentDescription = null,
                        tint = SosRed,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.size(6.dp))
                    Text(
                        text = "Helpline: $DISPLAY_HELPLINE",
                        color = SosRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }

    // Confirmation Dialog before launching emergency
    if (showConfirmDialog) {
        Dialog(onDismissRequest = { if (!isSubmittingSos) showConfirmDialog = false }) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFFEE2E2)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Warning,
                            contentDescription = null,
                            tint = SosRed,
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Trigger Emergency SOS?",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Bold,
                            color = NavyDark
                        )
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = "This will immediately notify Sunshine Eldercare's 24/7 Emergency Command Center, transmit your live GPS location, and dispatch emergency responders.",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextSecondary,
                            textAlign = TextAlign.Center,
                            lineHeight = 20.sp
                        )
                    )

                    if (sosError != null) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = sosError!!,
                            color = SosRed,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            textAlign = TextAlign.Center
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = { triggerSosWorkflow() },
                        enabled = !isSubmittingSos,
                        colors = ButtonDefaults.buttonColors(containerColor = SosRed),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        if (isSubmittingSos) {
                            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Connecting EmergencyOS...", color = Color.White, fontWeight = FontWeight.Bold)
                        } else {
                            Text("YES, TRIGGER SOS NOW", color = Color.White, fontWeight = FontWeight.Black)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedButton(
                        onClick = { launchEmergencyDialer(context, EMERGENCY_HELPLINE) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Icon(Icons.Default.Phone, contentDescription = null, tint = SosRed, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Call Helpline ($DISPLAY_HELPLINE)", color = NavyDark, fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    TextButton(
                        onClick = { showConfirmDialog = false },
                        enabled = !isSubmittingSos
                    ) {
                        Text("Cancel", color = TextSecondary)
                    }
                }
            }
        }
    }

    // Active Emergency In Progress Dialog
    if (showActiveEmergencyDialog) {
        Dialog(onDismissRequest = { showActiveEmergencyDialog = false }) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFDC2626)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Sensors,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(40.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "EMERGENCY ACTIVE",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Black,
                            color = SosRed,
                            letterSpacing = 1.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Surface(
                        color = Color(0xFFFEF2F2),
                        shape = RoundedCornerShape(8.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA))
                    ) {
                        Text(
                            text = "Incident #${activeIncidentNumber ?: "REGISTERED"}",
                            color = SosRedDark,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "Your emergency has been received by EmergencyOS. Live GPS location streaming is active so our response team can navigate directly to you.",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = TextSecondary,
                            textAlign = TextAlign.Center,
                            lineHeight = 20.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    Button(
                        onClick = { launchEmergencyDialer(context, EMERGENCY_HELPLINE) },
                        colors = ButtonDefaults.buttonColors(containerColor = NavyDark),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        Icon(Icons.Default.PhoneInTalk, contentDescription = null, tint = GoldLight)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Speak with Operator ($DISPLAY_HELPLINE)", fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedButton(
                        onClick = {
                            // Stop emergency streaming service
                            EmergencyLocationService.stop(context)
                            showActiveEmergencyDialog = false
                        },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Text("I Am Safe / End Tracking", color = TextSecondary)
                    }
                }
            }
        }
    }
}

private fun launchEmergencyDialer(context: Context, phoneNumber: String) {
    val intent = Intent(Intent.ACTION_DIAL).apply {
        data = Uri.parse("tel:$phoneNumber")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
    }
    context.startActivity(intent)
}
