package `in`.sunshineeldercare.member.ui.components

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import `in`.sunshineeldercare.member.ui.theme.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.OpenInNew
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.sunshineeldercare.member.data.model.DashboardMembershipDto
import `in`.sunshineeldercare.member.ui.theme.BorderGold
import `in`.sunshineeldercare.member.ui.theme.CardBackground
import `in`.sunshineeldercare.member.ui.theme.EmeraldActive
import `in`.sunshineeldercare.member.ui.theme.EmeraldBg
import `in`.sunshineeldercare.member.ui.theme.GoldLight
import `in`.sunshineeldercare.member.ui.theme.GoldPrimary
import `in`.sunshineeldercare.member.ui.theme.IvoryBackground
import `in`.sunshineeldercare.member.ui.theme.NavyDark
import `in`.sunshineeldercare.member.ui.theme.NavyLight
import `in`.sunshineeldercare.member.ui.theme.TextSecondary

private const val OFFICIAL_RENEWAL_URL = "https://www.sunshineeldercare.in/dashboard/renew"

@Composable
fun ActiveMembershipCard(
    membership: DashboardMembershipDto?,
    memberId: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Header with Gradient
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(NavyLight, NavyDark)))
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(GoldPrimary)
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = membership?.category ?: "Single Elder Care",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "•  ${membership?.status ?: "ACTIVE"}",
                                fontSize = 11.sp,
                                color = GoldLight,
                                fontWeight = FontWeight.Bold
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Text(
                            text = membership?.planName ?: "Comprehensive Elder Care Package",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    }

                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "MEMBER ID",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF94A3B8),
                            letterSpacing = 0.5.sp
                        )
                        Text(
                            text = memberId,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            fontFamily = FontFamily.Monospace,
                            color = IvoryBackground
                        )
                    }
                }
            }

            // Body
            Column(modifier = Modifier.padding(16.dp)) {
                // Dates and Days Remaining
                Row(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "START DATE", fontSize = 10.sp, color = TextSecondary, fontWeight = FontWeight.SemiBold)
                        Text(
                            text = formatDate(membership?.startDate),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = NavyDark
                        )
                    }

                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "EXPIRY DATE", fontSize = 10.sp, color = TextSecondary, fontWeight = FontWeight.SemiBold)
                        Text(
                            text = formatDate(membership?.endDate),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = NavyDark
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Days Remaining Pill
                val days = membership?.daysRemaining ?: 0
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(IvoryBackground)
                        .border(1.dp, BorderGold, RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 10.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (days > 0) "$days Days of Active Coverage Remaining" else "Coverage Renewal Due",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = NavyDark
                            )
                            Text(
                                text = "24/7 care desk and emergency protocol coverage active",
                                fontSize = 10.sp,
                                color = TextSecondary
                            )
                        }

                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (days > 30) EmeraldBg else Color(0xFFFEF3C7))
                                .border(1.dp, if (days > 30) Color(0xFFA7F3D0) else Color(0xFFFDE68A), RoundedCornerShape(8.dp))
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = if (days > 0) "${days}d" else "Expired",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (days > 30) EmeraldActive else Color(0xFFB45309)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                // Entitlements List
                Text(
                    text = "INCLUDED SERVICES & ENTITLEMENTS",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = NavyDark,
                    letterSpacing = 0.5.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                val services = membership?.services ?: emptyList()
                if (services.isNotEmpty()) {
                    services.forEach { svc ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 3.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = null,
                                tint = EmeraldActive,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = svc.serviceName,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = NavyDark
                                )
                                svc.serviceNote?.let { note ->
                                    Text(
                                        text = note,
                                        fontSize = 10.sp,
                                        color = TextSecondary
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Official Renewal Action
                Button(
                    onClick = { launchOfficialRenewal(context) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = goldButtonColors()
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "Renew Membership",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Icon(
                            imageVector = Icons.Default.OpenInNew,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Directs to official Sunshine Eldercare renewal and Razorpay payment portal",
                    fontSize = 10.sp,
                    color = TextSecondary,
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                )
            }
        }
    }
}

private fun formatDate(isoDate: String?): String {
    if (isoDate.isNullOrBlank()) return "Active"
    return try {
        isoDate.substring(0, 10)
    } catch (_: Exception) {
        isoDate
    }
}

private fun launchOfficialRenewal(context: Context) {
    try {
        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
        customTabsIntent.launchUrl(context, Uri.parse(OFFICIAL_RENEWAL_URL))
    } catch (e: Exception) {
        val browserIntent = android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(OFFICIAL_RENEWAL_URL)).apply {
            flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(browserIntent)
    }
}
