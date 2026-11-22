package `in`.sunshineeldercare.employee.ui.screens.home

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.sunshineeldercare.employee.R
import `in`.sunshineeldercare.employee.data.remote.model.CommunityEventDto
import `in`.sunshineeldercare.employee.data.remote.model.EmployeeSosIncidentDto
import `in`.sunshineeldercare.employee.data.remote.model.LeaveRequestDto
import `in`.sunshineeldercare.employee.ui.components.StatusBadge
import `in`.sunshineeldercare.employee.ui.theme.*
import `in`.sunshineeldercare.employee.util.EmergencyDispatchMonitor

private const val EMERGENCY_HELPLINE = "03340585515"
private const val DISPLAY_HELPLINE = "033-40585515"

/**
 * Normalizes any date string into strict DD/MM/YYYY format.
 * Guarantees zero raw timestamps, ISO strings, or milliseconds are exposed to employees.
 */
fun formatDisplayDmy(dateStr: String?): String {
    if (dateStr.isNullOrBlank()) return ""
    val trimmed = dateStr.trim()
    // Already DD/MM/YYYY
    if (Regex("^\\d{2}/\\d{2}/\\d{4}$").matches(trimmed)) return trimmed
    // YYYY-MM-DD
    if (Regex("^\\d{4}-\\d{2}-\\d{2}").containsMatchIn(trimmed)) {
        val parts = trimmed.substring(0, 10).split("-")
        if (parts.size == 3) {
            return "${parts[2]}/${parts[1]}/${parts[0]}"
        }
    }
    // Parse ISO or Instant
    return try {
        val instant = java.time.Instant.parse(trimmed)
        val zdt = instant.atZone(java.time.ZoneId.of("Asia/Kolkata"))
        String.format(java.util.Locale.US, "%02d/%02d/%04d", zdt.dayOfMonth, zdt.monthValue, zdt.year)
    } catch (_: Exception) {
        try {
            val ld = java.time.LocalDate.parse(trimmed.substring(0, 10))
            String.format(java.util.Locale.US, "%02d/%02d/%04d", ld.dayOfMonth, ld.monthValue, ld.year)
        } catch (_: Exception) {
            trimmed
        }
    }
}

@Composable
fun HomeScreen(
    onNavigateToToday: () -> Unit,
    onNavigateToUpcoming: () -> Unit,
    onVisitClick: (String) -> Unit,
    onEmergencyClick: (String) -> Unit = {},
    viewModel: HomeViewModel = viewModel()
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val activeEmergency by EmergencyDispatchMonitor.activeAssignment.collectAsState()

    // Dialog state
    var showEndDutyDialog by remember { mutableStateOf(false) }
    var showSosConfirmDialog by remember { mutableStateOf(false) }
    var showSafetyConfirmDialog by remember { mutableStateOf(false) }
    var showLeaveDialog by remember { mutableStateOf(false) }

    // Leave list expansion state
    var showAllLeaves by remember { mutableStateOf(false) }

    // Leave form state with formatted display (DD/MM/YYYY) and normalized backend (YYYY-MM-DD)
    var leaveStartDateDisplay by remember { mutableStateOf("") }
    var leaveEndDateDisplay by remember { mutableStateOf("") }
    var leaveStartDateBackend by remember { mutableStateOf("") }
    var leaveEndDateBackend by remember { mutableStateOf("") }
    var leaveReason by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .verticalScroll(rememberScrollState())
    ) {
        // Official Header: Logo on left, compact Duty switch on far right (Zero refresh button)
        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color.White,
            shadowElevation = 2.dp
        ) {
            Column {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.sunshine_logo),
                        contentDescription = "Sunshine Eldercare",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .height(40.dp)
                            .weight(1f, fill = false)
                    )

                    // Compact Duty ON/OFF Switch (Replaces previous refresh button location)
                    DutyToggleSwitch(
                        isOnDuty = uiState.isOnDuty,
                        isLoading = uiState.isDutyLoading,
                        onToggle = {
                            if (uiState.isOnDuty) {
                                showEndDutyDialog = true
                            } else {
                                viewModel.startDuty()
                            }
                        }
                    )
                }
                HorizontalDivider(color = Slate100, thickness = 1.dp)
            }
        }

        // Active Emergency Dispatch Banner (From EmergencyOS dispatching this staff member)
        activeEmergency?.let { emg ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp)
                    .clickable { onEmergencyClick(emg.id) },
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFFEF2F2),
                border = BorderStroke(1.5.dp, Color(0xFFDC2626)),
                shadowElevation = 4.dp
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFDC2626)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Color.White, modifier = Modifier.size(24.dp))
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "🚨 EMERGENCY DISPATCH: ${emg.incidentNumber}",
                            color = Color(0xFFDC2626),
                            fontWeight = FontWeight.Black,
                            fontSize = 13.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Member: ${emg.member?.name ?: emg.callerName ?: "Member"} | ${emg.classification}",
                            color = DeepNavy,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp
                        )
                        Text(
                            text = "Tap to open assignment and navigate",
                            color = Slate600,
                            fontSize = 11.sp
                        )
                    }
                    Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = Color(0xFFDC2626), modifier = Modifier.size(20.dp))
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // -------------------------------------------------------------
        // SECTION 1: EMPLOYEE EMERGENCY SOS (VISUALLY & FUNCTIONALLY IDENTICAL TO MEMBER APP)
        // -------------------------------------------------------------
        if (uiState.activeSosIncident != null) {
            // Active Emergency Incident Panel (Emergency Active • Command Center Connected)
            ActiveSosIncidentCard(
                incident = uiState.activeSosIncident!!,
                isResolving = uiState.isResolvingSos,
                onCallHelpline = {
                    launchEmergencyDialer(context, EMERGENCY_HELPLINE)
                },
                onEndEmergency = {
                    showSafetyConfirmDialog = true
                },
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        } else {
            // Standard Idle SOS Presentation (Large Circular Red Button with Concentric Rings)
            CircularSosCard(
                isSending = uiState.isSosSending,
                onSosClick = {
                    showSosConfirmDialog = true
                },
                onHelplineClick = {
                    launchEmergencyDialer(context, EMERGENCY_HELPLINE)
                },
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Stats Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Today's Visits Stat Card
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "TODAY'S VISITS",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = Slate500,
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = uiState.todayVisits.size.toString(),
                            style = MaterialTheme.typography.headlineMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = DeepNavy
                            )
                        )
                    }
                }

                // Pending Stat Card
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "PENDING",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = StatusInProgress,
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = uiState.pendingCount.toString(),
                            style = MaterialTheme.typography.headlineMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = StatusInProgress
                            )
                        )
                    }
                }

                // Completed Stat Card
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "COMPLETED",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = StatusCompleted,
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = uiState.completedCount.toString(),
                            style = MaterialTheme.typography.headlineMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = StatusCompleted
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Next Scheduled Visit Card
            Text(
                text = "Next Scheduled Visit",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = DeepNavy
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            val nextVisit = uiState.nextVisit
            if (nextVisit != null) {
                val isEmergency = nextVisit.isEmergency
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isEmergency) Color(0xFFFEF2F2) else Color.White
                    ),
                    border = BorderStroke(
                        1.dp,
                        if (isEmergency) Color(0xFFFCA5A5) else Slate100
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = nextVisit.primaryMemberName,
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = if (isEmergency) Color(0xFF991B1B) else DeepNavy
                                )
                            )
                            StatusBadge(status = nextVisit.status)
                        }

                        Spacer(modifier = Modifier.height(6.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Schedule,
                                contentDescription = null,
                                tint = if (isEmergency) Color(0xFFDC2626) else Slate400,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "${nextVisit.scheduledDate} • ${nextVisit.scheduledStartTime} - ${nextVisit.scheduledEndTime}",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = if (isEmergency) Color(0xFF991B1B) else Slate600,
                                    fontWeight = if (isEmergency) FontWeight.Bold else FontWeight.Normal
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.LocationOn,
                                contentDescription = null,
                                tint = Slate400,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = nextVisit.serviceAddress,
                                style = MaterialTheme.typography.bodySmall.copy(color = Slate600),
                                maxLines = 2
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = { onVisitClick(nextVisit.id) },
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isEmergency) Color(0xFFDC2626) else DeepNavy
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = if (isEmergency) "Respond to Code Red" else "Open Visit Execution",
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            } else {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = StatusCompleted,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "No pending visits for today",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                color = Slate700
                            )
                        )
                        Text(
                            text = "All your visits for today are completed or none are scheduled.",
                            style = MaterialTheme.typography.bodySmall.copy(color = Slate500),
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Operations & Leaves Section
            Text(
                text = "Operations & Leaves",
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = DeepNavy
                )
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = onNavigateToToday,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.CalendarToday,
                        contentDescription = null,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Today (${uiState.todayVisits.size})", fontSize = 12.sp)
                }

                OutlinedButton(
                    onClick = onNavigateToUpcoming,
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Upcoming", fontSize = 12.sp)
                }

                OutlinedButton(
                    onClick = { showLeaveDialog = true },
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 8.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.DateRange,
                        contentDescription = null,
                        tint = GoldPrimary,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Leave", fontSize = 12.sp)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // -------------------------------------------------------------
            // SECTION 4: MY LEAVE REQUESTS (DIRECTLY BELOW OPERATIONS & LEAVES)
            // -------------------------------------------------------------
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "My Leave Requests",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = DeepNavy
                    )
                )
                if (uiState.leaveRequests.isNotEmpty()) {
                    Text(
                        text = "${uiState.leaveRequests.size} total",
                        style = MaterialTheme.typography.bodySmall.copy(color = Slate500)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            val displayedLeaves = if (showAllLeaves) {
                uiState.leaveRequests
            } else {
                uiState.leaveRequests.take(3)
            }

            if (uiState.leaveRequests.isEmpty()) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, Slate100),
                    shadowElevation = 1.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(18.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            imageVector = Icons.Default.EventNote,
                            contentDescription = null,
                            tint = Slate400,
                            modifier = Modifier.size(28.dp)
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "No leave requests submitted yet",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                color = Slate700
                            )
                        )
                        Text(
                            text = "Tap 'Leave' above to submit an application using the calendar.",
                            style = MaterialTheme.typography.bodySmall.copy(color = Slate500),
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    for (leave in displayedLeaves) {
                        LeaveRequestCard(request = leave)
                    }

                    if (uiState.leaveRequests.size > 3) {
                        TextButton(
                            onClick = { showAllLeaves = !showAllLeaves },
                            modifier = Modifier.align(Alignment.CenterHorizontally)
                        ) {
                            Text(
                                text = if (showAllLeaves) "Show less" else "View older leave requests (${uiState.leaveRequests.size - 3} more)",
                                color = DeepNavy,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Universal Upcoming Events Section
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Upcoming Events & Activities",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = DeepNavy
                    )
                )
                Text(
                    text = "${uiState.upcomingEvents.size} scheduled",
                    style = MaterialTheme.typography.bodySmall.copy(color = Slate500)
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            if (uiState.upcomingEvents.isEmpty()) {
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color.White,
                    border = BorderStroke(1.dp, Slate100),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "No upcoming community or staff events scheduled right now.",
                            style = MaterialTheme.typography.bodySmall.copy(color = Slate500)
                        )
                    }
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    uiState.upcomingEvents.take(5).forEach { ev ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color.White,
                            shadowElevation = 1.dp,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(DeepNavy),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Event,
                                        contentDescription = null,
                                        tint = GoldPrimary,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }

                                Column(modifier = Modifier.weight(1f)) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                                    ) {
                                        Text(
                                            text = ev.title,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = DeepNavy
                                        )
                                        if (ev.audience == "EMPLOYEES_ONLY") {
                                            Surface(
                                                shape = RoundedCornerShape(4.dp),
                                                color = Color(0xFFFEF3C7)
                                            ) {
                                                Text(
                                                    text = "STAFF",
                                                    color = Color(0xFFB45309),
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Black,
                                                    modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
                                                )
                                            }
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "${formatDisplayDmy(ev.eventDate)} • ${ev.startTime}${if (!ev.endTime.isNullOrBlank()) " - ${ev.endTime}" else ""}",
                                        fontSize = 11.sp,
                                        color = Slate600
                                    )
                                    if (ev.venue.isNotBlank()) {
                                        Text(
                                            text = ev.venue,
                                            fontSize = 10.sp,
                                            color = Slate400,
                                            maxLines = 1
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // -------------------------------------------------------------
    // DIALOGS & CONFIRMATIONS
    // -------------------------------------------------------------

    // End Duty Shift Confirmation Dialog
    if (showEndDutyDialog) {
        AlertDialog(
            onDismissRequest = { showEndDutyDialog = false },
            icon = {
                Icon(
                    imageVector = Icons.Default.Schedule,
                    contentDescription = null,
                    tint = GoldPrimary,
                    modifier = Modifier.size(36.dp)
                )
            },
            title = {
                Text(
                    text = "End Duty Shift?",
                    fontWeight = FontWeight.Bold,
                    color = DeepNavy
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to end your current duty shift?\n\nYour active session duration will be recorded on the server and synchronized with the Admin Attendance roster.",
                    style = MaterialTheme.typography.bodyMedium.copy(color = Slate600)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showEndDutyDialog = false
                        viewModel.endDuty()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                ) {
                    Text("Confirm End Duty", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showEndDutyDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Trigger SOS Confirmation Dialog (Explicit user confirmation before sending)
    if (showSosConfirmDialog) {
        Dialog(onDismissRequest = { showSosConfirmDialog = false }) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
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
                            contentDescription = "Emergency Alert",
                            tint = Color(0xFFDC2626),
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Confirm Emergency SOS",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Black,
                            color = DeepNavy,
                            textAlign = TextAlign.Center
                        )
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "Are you sure you want to trigger an emergency SOS?\n\nThis will immediately notify the Sunshine Emergency Command Center, transmit your field location, and dispatch emergency response assistance.",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = Slate600,
                            textAlign = TextAlign.Center,
                            lineHeight = 22.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = {
                            showSosConfirmDialog = false
                            viewModel.triggerSos("Employee SOS button triggered from mobile app") { success, msg ->
                                Toast.makeText(
                                    context,
                                    msg ?: if (success) "Emergency SOS Alert Dispatched" else "Failed to dispatch SOS",
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFDC2626),
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PhoneInTalk,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Confirm & Send SOS",
                            fontWeight = FontWeight.Bold,
                            fontSize = 15.sp
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedButton(
                        onClick = { showSosConfirmDialog = false },
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Text(
                            text = "Cancel",
                            color = Slate600,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }
    }

    // Safety Confirmation Dialog ("I Am Safe / End Emergency")
    if (showSafetyConfirmDialog && uiState.activeSosIncident != null) {
        val incident = uiState.activeSosIncident!!
        Dialog(onDismissRequest = { showSafetyConfirmDialog = false }) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFDEF7EC)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Confirm Safe",
                            tint = Color(0xFF059669),
                            modifier = Modifier.size(36.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Confirm Safety & End Emergency",
                        style = MaterialTheme.typography.titleLarge.copy(
                            fontWeight = FontWeight.Black,
                            color = DeepNavy,
                            textAlign = TextAlign.Center
                        )
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = "Are you sure you want to end this active emergency?\n\nThis will communicate to Sunshine EmergencyOS that you are safe and close Incident #${incident.incidentNumber}. The incident record and response history will be preserved in audit records.",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            color = Slate600,
                            textAlign = TextAlign.Center,
                            lineHeight = 22.sp
                        )
                    )

                    Spacer(modifier = Modifier.height(24.dp))

                    Button(
                        onClick = {
                            showSafetyConfirmDialog = false
                            viewModel.resolveSos(incident.id) { success, msg ->
                                Toast.makeText(
                                    context,
                                    msg ?: if (success) "Emergency closed successfully" else "Failed to close emergency",
                                    Toast.LENGTH_LONG
                                ).show()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF059669),
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Confirm Safety & Close Emergency", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedButton(
                        onClick = { showSafetyConfirmDialog = false },
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                    ) {
                        Text("Cancel", color = Slate700, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
    }

    // Apply Leave Dialog (Native Calendar Date Pickers with DD/MM/YYYY formatting)
    if (showLeaveDialog) {
        val calendar = java.util.Calendar.getInstance()
        val currYear = calendar.get(java.util.Calendar.YEAR)
        val currMonth = calendar.get(java.util.Calendar.MONTH)
        val currDay = calendar.get(java.util.Calendar.DAY_OF_MONTH)

        val startDatePicker = android.app.DatePickerDialog(
            context,
            { _, year, month, dayOfMonth ->
                leaveStartDateDisplay = String.format(java.util.Locale.US, "%02d/%02d/%04d", dayOfMonth, month + 1, year)
                leaveStartDateBackend = String.format(java.util.Locale.US, "%04d-%02d-%02d", year, month + 1, dayOfMonth)
            },
            currYear,
            currMonth,
            currDay
        )

        val endDatePicker = android.app.DatePickerDialog(
            context,
            { _, year, month, dayOfMonth ->
                leaveEndDateDisplay = String.format(java.util.Locale.US, "%02d/%02d/%04d", dayOfMonth, month + 1, year)
                leaveEndDateBackend = String.format(java.util.Locale.US, "%04d-%02d-%02d", year, month + 1, dayOfMonth)
            },
            currYear,
            currMonth,
            currDay
        )

        AlertDialog(
            onDismissRequest = { showLeaveDialog = false },
            title = { Text("Apply for Leave", fontWeight = FontWeight.Bold, color = DeepNavy) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Select your requested leave dates from the calendar:",
                        fontSize = 12.sp,
                        color = Slate600
                    )

                    // Start Date Picker Field
                    OutlinedCard(
                        onClick = { startDatePicker.show() },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("Start Date", fontSize = 11.sp, color = Slate600)
                                Text(
                                    text = if (leaveStartDateDisplay.isNotBlank()) leaveStartDateDisplay else "Select Start Date",
                                    fontSize = 14.sp,
                                    fontWeight = if (leaveStartDateDisplay.isNotBlank()) FontWeight.Bold else FontWeight.Normal,
                                    color = if (leaveStartDateDisplay.isNotBlank()) DeepNavy else Slate600
                                )
                            }
                            Icon(Icons.Default.DateRange, contentDescription = "Pick Start Date", tint = GoldPrimary)
                        }
                    }

                    // End Date Picker Field
                    OutlinedCard(
                        onClick = { endDatePicker.show() },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("End Date", fontSize = 11.sp, color = Slate600)
                                Text(
                                    text = if (leaveEndDateDisplay.isNotBlank()) leaveEndDateDisplay else "Select End Date",
                                    fontSize = 14.sp,
                                    fontWeight = if (leaveEndDateDisplay.isNotBlank()) FontWeight.Bold else FontWeight.Normal,
                                    color = if (leaveEndDateDisplay.isNotBlank()) DeepNavy else Slate600
                                )
                            }
                            Icon(Icons.Default.DateRange, contentDescription = "Pick End Date", tint = GoldPrimary)
                        }
                    }

                    OutlinedTextField(
                        value = leaveReason,
                        onValueChange = { leaveReason = it },
                        label = { Text("Reason for Leave") },
                        placeholder = { Text("e.g. Medical, personal, urgent work") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (leaveStartDateBackend.isBlank() || leaveEndDateBackend.isBlank()) {
                            Toast.makeText(context, "Please select both start and end dates", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        if (leaveEndDateBackend < leaveStartDateBackend) {
                            Toast.makeText(context, "End date cannot be earlier than start date", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        if (leaveReason.trim().isBlank()) {
                            Toast.makeText(context, "Please provide a reason for leave", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        showLeaveDialog = false
                        viewModel.applyLeave(leaveStartDateBackend, leaveEndDateBackend, leaveReason.trim()) { success, msg ->
                            Toast.makeText(context, msg ?: if (success) "Leave Submitted" else "Error", Toast.LENGTH_LONG).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                ) {
                    Text("Submit Application")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showLeaveDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

/**
 * Standard Idle SOS Presentation — Identical to Member App.
 * Clean white card, rounded corners (24.dp), 24/7 Assistance heading,
 * large circular red SOS button with concentric translucent ambient pulse rings,
 * action text, and Helpline phone badge.
 */
@Composable
fun CircularSosCard(
    isSending: Boolean,
    onSosClick: () -> Unit,
    onHelplineClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    // Ambient pulse ring animation matching Member App
    val infiniteTransition = rememberInfiniteTransition(label = "SosPulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = if (isSending) 1.25f else 1.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(if (isSending) 600 else 1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "PulseScale"
    )

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 20.dp, horizontal = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header Pill: 24/7 EMERGENCY ASSISTANCE
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Color(0xFFFEE2E2))
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = null,
                        tint = Color(0xFFDC2626),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.size(6.dp))
                    Text(
                        text = if (isSending) "EMERGENCY SOS • DISPATCHING NOW" else "24/7 EMERGENCY ASSISTANCE",
                        color = Color(0xFFDC2626),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Large Circular Button with Subtle Concentric Pulse Rings
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
                        .background(Color(0x33DC2626))
                )

                // Outer border ring
                Box(
                    modifier = Modifier
                        .size(106.dp)
                        .clip(CircleShape)
                        .background(Color(0x22DC2626))
                        .border(2.dp, Color(0x66DC2626), CircleShape)
                )

                // Inner Main Circular SOS Button
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier
                        .size(94.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(listOf(Color(0xFFDC2626), Color(0xFF991B1B)))
                        )
                        .border(4.dp, Color(0xFFFDFBF7), CircleShape)
                        .clickable(enabled = !isSending) {
                            onSosClick()
                        }
                ) {
                    if (isSending) {
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
                    } else {
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

            Spacer(modifier = Modifier.height(14.dp))

            // Action Label
            Text(
                text = if (isSending) "CONNECTING TO EMERGENCY COMMAND CENTER..." else "TAP FOR IMMEDIATE EMERGENCY ASSISTANCE",
                color = if (isSending) Color(0xFF991B1B) else DeepNavy,
                fontSize = 13.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 0.5.sp,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Phone Number Badge
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFFFEF2F2))
                    .border(1.dp, Color(0xFFFECACA), RoundedCornerShape(8.dp))
                    .clickable { onHelplineClick() }
                    .padding(horizontal = 12.dp, vertical = 6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Phone,
                        contentDescription = null,
                        tint = Color(0xFFDC2626),
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.size(6.dp))
                    Text(
                        text = "Helpline: $DISPLAY_HELPLINE",
                        color = Color(0xFFDC2626),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FontFamily.Monospace
                    )
                }
            }
        }
    }
}

/**
 * Prominent Active Emergency Panel — Identical to Member App.
 * Displays live incident status, incident number, helpline call button,
 * and "I Am Safe / End Emergency" button.
 */
@Composable
fun ActiveSosIncidentCard(
    incident: EmployeeSosIncidentDto,
    isResolving: Boolean,
    onCallHelpline: () -> Unit,
    onEndEmergency: () -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = Color(0xFFFEF2F2),
        border = BorderStroke(1.5.dp, Color(0xFFFECACA)),
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(18.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header badge: EMERGENCY ACTIVE • COMMAND CENTER CONNECTED
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Color(0xFFFEE2E2))
                    .border(1.dp, Color(0xFFFCA5A5), RoundedCornerShape(50))
                    .padding(horizontal = 12.dp, vertical = 5.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Sensors,
                    contentDescription = null,
                    tint = Color(0xFFDC2626),
                    modifier = Modifier.size(16.dp)
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "EMERGENCY ACTIVE • COMMAND CENTER CONNECTED",
                    color = Color(0xFF991B1B),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 0.5.sp
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Incident number
            Text(
                text = "Incident #${incident.incidentNumber}",
                color = Color(0xFFDC2626),
                fontSize = 16.sp,
                fontWeight = FontWeight.ExtraBold,
                fontFamily = FontFamily.Monospace
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Your field emergency has been registered with Sunshine EmergencyOS. Care coordinators and response teams are actively responding.",
                style = MaterialTheme.typography.bodySmall.copy(
                    color = Slate600,
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                ),
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Spacer(modifier = Modifier.height(14.dp))

            // Primary Action: Call Helpline
            Button(
                onClick = onCallHelpline,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFDC2626),
                    contentColor = Color.White
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp)
            ) {
                Icon(Icons.Default.PhoneInTalk, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Call Helpline: $DISPLAY_HELPLINE", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Secondary Action: "I Am Safe / End Emergency"
            OutlinedButton(
                onClick = onEndEmergency,
                enabled = !isResolving,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Color(0xFFCBD5E1)),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp)
            ) {
                if (isResolving) {
                    CircularProgressIndicator(
                        color = Color(0xFF059669),
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Closing Emergency...", color = Slate700, fontSize = 13.sp)
                } else {
                    Icon(
                        imageVector = Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = Color(0xFF059669),
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "I Am Safe / End Emergency",
                        color = DeepNavy,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp
                    )
                }
            }
        }
    }
}

/**
 * Clean Leave Request Card for the Home Dashboard.
 * Strictly formats all dates as DD/MM/YYYY with zero raw timestamps.
 */
@Composable
fun LeaveRequestCard(
    request: LeaveRequestDto,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = BorderStroke(1.dp, Slate100),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // 1. Leave status badge
                val (badgeBg, badgeTextColor) = when (request.status.uppercase()) {
                    "APPROVED" -> Color(0xFFDEF7EC) to Color(0xFF03543F)
                    "REJECTED" -> Color(0xFFFDE8E8) to Color(0xFF9B1C1C)
                    "CANCELLED" -> Color(0xFFF1F5F9) to Color(0xFF475569)
                    else -> Color(0xFFFEF08A) to Color(0xFF713F12) // PENDING amber
                }

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = badgeBg
                ) {
                    Text(
                        text = request.status.uppercase(),
                        color = badgeTextColor,
                        fontWeight = FontWeight.Black,
                        fontSize = 11.sp,
                        letterSpacing = 0.5.sp,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                    )
                }

                if (request.totalDays > 0) {
                    Text(
                        text = "${request.totalDays} ${if (request.totalDays == 1) "day" else "days"}",
                        color = Slate500,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // 2. From date
            Text(
                text = "From: ${formatDisplayDmy(request.startDateDisplay ?: request.startDate)}",
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = DeepNavy
            )

            // 3. To date
            Text(
                text = "To: ${formatDisplayDmy(request.endDateDisplay ?: request.endDate)}",
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = DeepNavy
            )

            // 4. Applied date
            Text(
                text = "Applied: ${formatDisplayDmy(request.appliedAtDisplay ?: request.appliedAt ?: request.createdAt)}",
                fontSize = 12.sp,
                color = Slate500,
                modifier = Modifier.padding(top = 2.dp)
            )

            // 5. Reason if present
            if (request.reason.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Slate50,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Reason: ${request.reason}",
                        fontSize = 11.sp,
                        color = Slate700,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                    )
                }
            }

            if (!request.adminRemarks.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Admin Note: ${request.adminRemarks}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = if (request.status.uppercase() == "REJECTED") Color(0xFFDC2626) else Color(0xFF059669)
                )
            }
        }
    }
}

/**
 * Compact, modern horizontal toggle switch for Duty ON/OFF.
 * Positioned on the right of the header bar.
 */
@Composable
fun DutyToggleSwitch(
    isOnDuty: Boolean,
    isLoading: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    val trackWidth = 88.dp
    val trackHeight = 30.dp
    val thumbSize = 22.dp
    val thumbPadding = 4.dp

    val trackColor by animateColorAsState(
        targetValue = if (isOnDuty) Color(0xFF059669) else Color(0xFFE2E8F0),
        animationSpec = tween(250),
        label = "trackColor"
    )

    val thumbOffset by animateDpAsState(
        targetValue = if (isOnDuty) trackWidth - thumbSize - thumbPadding else thumbPadding,
        animationSpec = tween(250),
        label = "thumbOffset"
    )

    Surface(
        shape = RoundedCornerShape(15.dp),
        color = trackColor,
        border = BorderStroke(
            1.dp,
            if (isOnDuty) Color(0xFF047857) else Color(0xFFCBD5E1)
        ),
        modifier = modifier
            .width(trackWidth)
            .height(trackHeight)
            .clip(RoundedCornerShape(15.dp))
            .clickable(
                enabled = !isLoading,
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                onToggle()
            }
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.CenterStart
        ) {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = if (isOnDuty) Arrangement.Start else Arrangement.End
            ) {
                Text(
                    text = if (isOnDuty) "ON DUTY" else "OFF DUTY",
                    color = if (isOnDuty) Color.White else Color(0xFF475569),
                    fontWeight = FontWeight.Bold,
                    fontSize = 9.sp,
                    letterSpacing = 0.5.sp
                )
            }

            Box(
                modifier = Modifier
                    .offset(x = thumbOffset)
                    .size(thumbSize)
                    .clip(CircleShape)
                    .background(Color.White),
                contentAlignment = Alignment.Center
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = if (isOnDuty) Color(0xFF059669) else Color(0xFF64748B),
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(12.dp)
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(7.dp)
                            .clip(CircleShape)
                            .background(if (isOnDuty) Color(0xFF059669) else Color(0xFF94A3B8))
                    )
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
