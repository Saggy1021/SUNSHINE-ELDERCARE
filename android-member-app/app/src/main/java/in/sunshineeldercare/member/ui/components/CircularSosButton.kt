package `in`.sunshineeldercare.member.ui.components

import android.content.Context
import android.content.Intent
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
import `in`.sunshineeldercare.member.data.repository.SosDeliveryStatus
import `in`.sunshineeldercare.member.data.repository.SosOutboxManager
import `in`.sunshineeldercare.member.ui.theme.*

private const val EMERGENCY_HELPLINE = "03340585515"
private const val DISPLAY_HELPLINE = "033-40585515"

@Composable
fun CircularSosButton(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val sosItem by SosOutboxManager.currentSos.collectAsState()

    var showActiveEmergencyDialog by remember { mutableStateOf(false) }

    val isSending = sosItem?.status == SosDeliveryStatus.SENDING || sosItem?.status == SosDeliveryStatus.QUEUED
    val isDelivered = sosItem?.status == SosDeliveryStatus.DELIVERED
    val isPendingRetry = sosItem?.status == SosDeliveryStatus.PENDING_RETRY
    val isFailed = sosItem?.status == SosDeliveryStatus.FAILED

    // Open active dialog when delivered
    LaunchedEffect(sosItem?.status) {
        if (isDelivered) {
            showActiveEmergencyDialog = true
        }
    }

    // Pulsing animation for ambient emergency ring
    val infiniteTransition = rememberInfiniteTransition(label = "SosPulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = when {
            isSending -> 1.25f
            isDelivered -> 1.18f
            isPendingRetry -> 1.20f
            else -> 1.12f
        },
        animationSpec = infiniteRepeatable(
            animation = tween(if (isSending) 600 else 1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "PulseScale"
    )

    fun handleSosClick() {
        if (isDelivered) {
            showActiveEmergencyDialog = true
            return
        }
        if (isSending) return

        SosOutboxManager.triggerSosImmediate(context) { _, _ -> }
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
                    .background(
                        when {
                            isDelivered -> Color(0xFFDCFCE7)
                            isPendingRetry -> Color(0xFFFEF3C7)
                            else -> Color(0xFFFEE2E2)
                        }
                    )
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = when {
                            isDelivered -> Icons.Default.CheckCircle
                            isPendingRetry -> Icons.Default.Sync
                            else -> Icons.Default.Shield
                        },
                        contentDescription = null,
                        tint = when {
                            isDelivered -> Color(0xFF15803D)
                            isPendingRetry -> Color(0xFFB45309)
                            else -> SosRed
                        },
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.size(6.dp))
                    Text(
                        text = when {
                            isDelivered -> "EMERGENCY ACTIVE • COMMAND CENTER CONNECTED"
                            isPendingRetry -> "EMERGENCY QUEUED • AUTO RETRYING"
                            else -> "24/7 EMERGENCY ASSISTANCE"
                        },
                        color = when {
                            isDelivered -> Color(0xFF15803D)
                            isPendingRetry -> Color(0xFFB45309)
                            else -> SosRed
                        },
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
                modifier = Modifier.size(120.dp)
            ) {
                // Outer soft pulse ring
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .scale(pulseScale)
                        .clip(CircleShape)
                        .background(
                            when {
                                isDelivered -> Color(0x3316A34A)
                                isPendingRetry -> Color(0x33D97706)
                                else -> Color(0x33DC2626)
                            }
                        )
                )

                // Outer border ring
                Box(
                    modifier = Modifier
                        .size(106.dp)
                        .clip(CircleShape)
                        .background(
                            when {
                                isDelivered -> Color(0x2216A34A)
                                isPendingRetry -> Color(0x22D97706)
                                else -> Color(0x22DC2626)
                            }
                        )
                        .border(
                            2.dp,
                            when {
                                isDelivered -> Color(0x6616A34A)
                                isPendingRetry -> Color(0x66D97706)
                                else -> Color(0x66DC2626)
                            },
                            CircleShape
                        )
                )

                // Inner Main Circular SOS Button (One-tap action)
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(94.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                when {
                                    isDelivered -> listOf(Color(0xFF16A34A), Color(0xFF15803D))
                                    isPendingRetry -> listOf(Color(0xFFD97706), Color(0xFFB45309))
                                    else -> listOf(SosRed, SosRedDark)
                                }
                            )
                        )
                        .border(4.dp, IvoryBackground, CircleShape)
                        .clickable(enabled = !isSending) {
                            handleSosClick()
                        }
                ) {
                    when {
                        isSending -> {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                CircularProgressIndicator(
                                    color = Color.White,
                                    modifier = Modifier.size(28.dp),
                                    strokeWidth = 3.dp
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "SENDING",
                                    color = Color.White,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 1.sp
                                )
                            }
                        }
                        isDelivered -> {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.Sensors,
                                    contentDescription = "Active Emergency",
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                                Text(
                                    text = "ACTIVE",
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = 1.5.sp
                                )
                            }
                        }
                        isPendingRetry -> {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.Sync,
                                    contentDescription = "Retrying SOS",
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                                Text(
                                    text = "RETRYING",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = 1.sp
                                )
                            }
                        }
                        else -> {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(
                                    imageVector = Icons.Default.PhoneInTalk,
                                    contentDescription = "Emergency SOS",
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                                Text(
                                    text = "SOS",
                                    color = Color.White,
                                    fontSize = 21.sp,
                                    fontWeight = FontWeight.Black,
                                    letterSpacing = 2.sp
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Clear Senior Action Label
            Text(
                text = when {
                    isSending -> "CONNECTING TO EMERGENCY COMMAND CENTER..."
                    isDelivered -> "EMERGENCY ACKNOWLEDGED (INCIDENT #${sosItem?.incidentNumber ?: "REGISTERED"})"
                    isPendingRetry -> "EMERGENCY QUEUED • RETRYING DISPATCH IN BACKGROUND"
                    isFailed -> "DELIVERY FAILED • PLEASE CALL HELPLINE DIRECTLY"
                    else -> "TAP FOR IMMEDIATE EMERGENCY ASSISTANCE"
                },
                color = when {
                    isDelivered -> Color(0xFF15803D)
                    isPendingRetry -> Color(0xFFB45309)
                    isSending -> SosRedDark
                    else -> NavyDark
                },
                fontSize = 13.sp,
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

    // Active Emergency In Progress Dialog
    if (showActiveEmergencyDialog && isDelivered) {
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
                            text = "Incident #${sosItem?.incidentNumber ?: "REGISTERED"}",
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
                        colors = navyButtonColors(),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PhoneInTalk,
                            contentDescription = null,
                            tint = GoldLight
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Speak with Operator ($DISPLAY_HELPLINE)",
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    OutlinedButton(
                        onClick = {
                            SosOutboxManager.dismissCurrentEmergency()
                            showActiveEmergencyDialog = false
                        },
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Text(
                            text = "I Am Safe / End Emergency",
                            color = TextSecondary,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }
}

private fun launchEmergencyDialer(context: Context, phoneNumber: String) {
    try {
        val intent = Intent(Intent.ACTION_DIAL).apply {
            data = Uri.parse("tel:$phoneNumber")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    } catch (_: Exception) {}
}
