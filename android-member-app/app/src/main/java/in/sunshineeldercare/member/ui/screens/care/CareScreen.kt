package `in`.sunshineeldercare.member.ui.screens.care

import `in`.sunshineeldercare.member.ui.theme.*

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonOutline
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.sunshineeldercare.member.ui.theme.CardBackground
import `in`.sunshineeldercare.member.ui.theme.EmeraldActive
import `in`.sunshineeldercare.member.ui.theme.EmeraldBg
import `in`.sunshineeldercare.member.ui.theme.GoldPrimary
import `in`.sunshineeldercare.member.ui.theme.IvoryBackground
import `in`.sunshineeldercare.member.ui.theme.NavyDark
import `in`.sunshineeldercare.member.ui.theme.TextSecondary

private const val HELPLINE_PHONE = "03340585515"
private const val HELPLINE_DISPLAY = "033-40585515"

@Composable
fun CareScreen(
    viewModel: CareViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IvoryBackground)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Text(
                text = "CARE OPERATIONS",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = GoldPrimary,
                letterSpacing = 1.sp
            )

            Text(
                text = "Care Tracking & Services",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Serif,
                color = NavyDark
            )

            Text(
                text = "Review your enrolled healthcare benefits, assigned care staff, and scheduled visit logs.",
                fontSize = 12.sp,
                color = TextSecondary,
                lineHeight = 16.sp
            )

            Spacer(modifier = Modifier.height(18.dp))

            // --- Section 1: Assigned Care Staff ---
            Text(
                text = "ASSIGNED CARE STAFF",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = GoldPrimary,
                letterSpacing = 1.sp
            )

            Spacer(modifier = Modifier.height(10.dp))

            val upcomingVisits = state.data?.assignedVisits?.filter {
                it.status == "SCHEDULED" || it.status == "IN_PROGRESS"
            } ?: emptyList()

            if (upcomingVisits.isNotEmpty()) {
                upcomingVisits.forEach { visit ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = CardBackground),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            // Top Row: Scheduled Date/Time & Visit Status Badge
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.weight(1f, fill = false)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.CalendarMonth,
                                        contentDescription = null,
                                        tint = GoldPrimary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "${visit.displayDate} · ${visit.displayTime}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = NavyDark
                                    )
                                }

                                val isOngoing = visit.status == "IN_PROGRESS"
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (isOngoing) EmeraldBg else Color(0xFFF1F5F9))
                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Text(
                                        text = if (isOngoing) "IN PROGRESS" else "SCHEDULED",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isOngoing) EmeraldActive else Color(0xFF475569)
                                    )
                                }
                            }

                            HorizontalDivider(
                                modifier = Modifier.padding(vertical = 12.dp),
                                color = Color(0xFFF1F5F9)
                            )

                            val emp = visit.employee
                            if (emp != null && emp.name.isNotBlank()) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Employee Initials Badge
                                    val initials = emp.name.split(" ")
                                        .mapNotNull { it.firstOrNull()?.toString() }
                                        .take(2)
                                        .joinToString("")

                                    Box(
                                        modifier = Modifier
                                            .size(44.dp)
                                            .clip(CircleShape)
                                            .background(NavyDark),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = initials.ifBlank { "SE" },
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = GoldPrimary
                                        )
                                    }

                                    Spacer(modifier = Modifier.width(12.dp))

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = emp.name,
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = NavyDark
                                        )
                                        Text(
                                            text = emp.designation.ifBlank { "Care Professional" },
                                            fontSize = 11.sp,
                                            color = TextSecondary
                                        )
                                        if (!emp.contactNumber.isNullOrBlank()) {
                                            Text(
                                                text = emp.contactNumber,
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = GoldPrimary,
                                                fontFamily = FontFamily.Monospace
                                            )
                                        }
                                    }

                                    if (!emp.contactNumber.isNullOrBlank()) {
                                        Button(
                                            onClick = {
                                                val intent = Intent(
                                                    Intent.ACTION_DIAL,
                                                    Uri.parse("tel:${emp.contactNumber}")
                                                )
                                                context.startActivity(intent)
                                            },
                                            colors = navyButtonColors(),
                                            shape = RoundedCornerShape(10.dp),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Phone,
                                                contentDescription = "Call",
                                                tint = Color.White,
                                                modifier = Modifier.size(13.dp)
                                            )
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(
                                                text = "Call",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                        }
                                    }
                                }
                            } else {
                                // No caregiver assigned yet to this scheduled visit
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFFF1F5F9)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.PersonOutline,
                                            contentDescription = null,
                                            tint = Color(0xFF64748B),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }

                                    Spacer(modifier = Modifier.width(12.dp))

                                    Column {
                                        Text(
                                            text = "Care professional not yet assigned.",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = NavyDark
                                        )
                                        Text(
                                            text = "Care coordination team will allocate your dedicated professional prior to the visit.",
                                            fontSize = 10.sp,
                                            color = TextSecondary,
                                            lineHeight = 14.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // No upcoming visits currently scheduled
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = CardBackground),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(Color(0xFFF1F5F9)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.PersonOutline,
                                contentDescription = null,
                                tint = Color(0xFF64748B),
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        Spacer(modifier = Modifier.width(12.dp))

                        Column {
                            Text(
                                text = "Care professional not yet assigned.",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = NavyDark
                            )
                            Text(
                                text = "No active care visits are currently scheduled on your membership profile.",
                                fontSize = 11.sp,
                                color = TextSecondary,
                                lineHeight = 15.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // --- Enrolled Plan Services Card (Preserved) ---
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    val planName = state.data?.membership?.planName ?: "Care Package"
                    Text(
                        text = "ENROLLED SERVICES ($planName)",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = NavyDark,
                        letterSpacing = 0.5.sp
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    val services = state.data?.membership?.services ?: emptyList()
                    if (services.isNotEmpty()) {
                        services.forEach { svc ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
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
                                        Text(text = note, fontSize = 10.sp, color = TextSecondary)
                                    }
                                }
                            }
                        }
                    } else {
                        Text(
                            text = "Standard eldercare benefits and 24/7 telephonic care coordination active on your profile.",
                            fontSize = 11.sp,
                            color = TextSecondary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // --- Schedule Physician / Attendant Visit Card ---
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(imageVector = Icons.Default.CalendarMonth, contentDescription = null, tint = GoldPrimary)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Schedule Physician or Attendant Visit",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = NavyDark
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Need to reschedule a routine checkup or request an extra medical escort? Contact the care coordination desk at $HELPLINE_DISPLAY.",
                        fontSize = 11.sp,
                        color = TextSecondary,
                        lineHeight = 16.sp
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$HELPLINE_PHONE"))
                            context.startActivity(intent)
                        },
                        colors = navyButtonColors(),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Phone, contentDescription = null, tint = Color.White, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Call Care Coordinator", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                }
            }

            Spacer(modifier = Modifier.height(80.dp))
        }

        if (state.isLoading && state.data == null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = GoldPrimary)
            }
        }
    }
}
