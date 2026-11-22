package `in`.sunshineeldercare.employee.ui.screens.home

import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.sunshineeldercare.employee.R
import `in`.sunshineeldercare.employee.ui.components.StatusBadge
import `in`.sunshineeldercare.employee.ui.theme.*
import `in`.sunshineeldercare.employee.util.EmergencyDispatchMonitor

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
    var showLeaveDialog by remember { mutableStateOf(false) }

    // Leave form state
    var leaveStartDate by remember { mutableStateOf("") }
    var leaveEndDate by remember { mutableStateOf("") }
    var leaveReason by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Slate50)
            .verticalScroll(rememberScrollState())
    ) {
        // Official Header with Duty Controller
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
                            .height(44.dp)
                            .weight(1f, fill = false)
                    )

                    // Duty ON/OFF Controller & Refresh
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (uiState.isDutyLoading) {
                            CircularProgressIndicator(
                                color = GoldPrimary,
                                strokeWidth = 2.dp,
                                modifier = Modifier.size(24.dp)
                            )
                        } else if (uiState.isOnDuty) {
                            // ON DUTY Pill
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = Color(0xFFECFDF5),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF10B981)),
                                modifier = Modifier.clickable { showEndDutyDialog = true }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF10B981))
                                    )
                                    Text(
                                        text = "ON DUTY (${uiState.formattedTodayDuty})",
                                        color = Color(0xFF065F46),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "End Duty",
                                        tint = Color(0xFF047857),
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            }
                        } else {
                            // START DUTY Button
                            Button(
                                onClick = { viewModel.startDuty() },
                                shape = RoundedCornerShape(20.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = DeepNavy,
                                    contentColor = Color.White
                                ),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                modifier = Modifier.height(34.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.PlayArrow,
                                        contentDescription = null,
                                        tint = GoldPrimary,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Text(
                                        text = "START DUTY",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }

                        // Refresh Button
                        IconButton(
                            onClick = { viewModel.refresh() },
                            enabled = !uiState.isRefreshing,
                            modifier = Modifier.size(36.dp)
                        ) {
                            if (uiState.isRefreshing) {
                                CircularProgressIndicator(
                                    color = GoldPrimary,
                                    strokeWidth = 2.dp,
                                    modifier = Modifier.size(18.dp)
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Default.Refresh,
                                    contentDescription = "Refresh Visits",
                                    tint = DeepNavy,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
                HorizontalDivider(color = Slate100, thickness = 1.dp)
            }
        }

        // Active Emergency Dispatch Banner (From EmergencyOS)
        activeEmergency?.let { emg ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp)
                    .clickable { onEmergencyClick(emg.id) },
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFFFEF2F2),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFDC2626)),
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

        // Dedicated Employee SOS Emergency Bar
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 6.dp)
                .clickable { showSosConfirmDialog = true },
            shape = RoundedCornerShape(12.dp),
            color = Color(0xFFFFF1F2),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFDA4AF))
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFE11D48)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Campaign,
                            contentDescription = "SOS",
                            tint = Color.White,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                    Column {
                        Text(
                            text = "EMPLOYEE EMERGENCY SOS",
                            color = Color(0xFF9F1239),
                            fontWeight = FontWeight.Black,
                            fontSize = 12.sp
                        )
                        Text(
                            text = "Tap to trigger instant operations & safety alert",
                            color = Slate600,
                            fontSize = 10.sp
                        )
                    }
                }
                Icon(
                    imageVector = Icons.Default.Shield,
                    contentDescription = null,
                    tint = Color(0xFFE11D48),
                    modifier = Modifier.size(18.dp)
                )
            }
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

            if (uiState.nextVisit != null) {
                val next = uiState.nextVisit!!
                val isEmergency = next.isEmergency
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onVisitClick(next.id) },
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isEmergency) Color(0xFFFEF2F2) else Color.White
                    ),
                    border = if (isEmergency) androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFDC2626)) else null,
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (isEmergency) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(Color(0xFFDC2626))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = "🚨 CODE RED",
                                            color = Color.White,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 10.sp
                                        )
                                    }
                                    Text(
                                        text = next.memberId,
                                        style = MaterialTheme.typography.labelSmall.copy(
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFFDC2626)
                                        )
                                    )
                                }
                            } else {
                                Text(
                                    text = next.memberId,
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = DeepNavy
                                    )
                                )
                            }
                            StatusBadge(status = next.status)
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = next.primaryMemberName,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = DeepNavy,
                                fontSize = 17.sp
                            )
                        )

                        if (!next.spouseName.isNullOrBlank() && next.spouseName != "—") {
                            Text(
                                text = "Spouse: ${next.spouseName}",
                                style = MaterialTheme.typography.bodySmall.copy(color = Slate600),
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.AccessTime,
                                contentDescription = null,
                                tint = if (isEmergency) Color(0xFFDC2626) else GoldPrimary,
                                modifier = Modifier.size(16.dp)
                            )
                            Text(
                                text = "${next.scheduledDate} • ${next.scheduledWindowDisplay}",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = if (isEmergency) Color(0xFFDC2626) else Slate700,
                                    fontWeight = FontWeight.SemiBold
                                )
                            )
                        }

                        Spacer(modifier = Modifier.height(6.dp))

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
                                text = next.serviceAddress,
                                style = MaterialTheme.typography.bodySmall.copy(color = Slate600),
                                maxLines = 2
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Button(
                            onClick = { onVisitClick(next.id) },
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

            // Quick Navigation & Action Buttons
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
                    border = androidx.compose.foundation.BorderStroke(1.dp, Slate100),
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
                                // Event Icon Pill
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
                                        modifier = Modifier.size(20.dp)
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
                                            color = DeepNavy,
                                            fontSize = 14.sp
                                        )
                                        if (ev.audience == "EMPLOYEES_ONLY") {
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(4.dp))
                                                    .background(Color(0xFFEFF6FF))
                                                    .padding(horizontal = 4.dp, vertical = 1.dp)
                                            ) {
                                                Text(
                                                    text = "Staff Only",
                                                    color = Color(0xFF1D4ED8),
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "${ev.eventDate} • ${ev.startTime} • ${ev.venue}",
                                        color = Slate600,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // End Duty Dialog
    if (showEndDutyDialog) {
        AlertDialog(
            onDismissRequest = { showEndDutyDialog = false },
            title = { Text("End Duty Shift?", fontWeight = FontWeight.Bold) },
            text = {
                Text(
                    "You have been on duty for ${uiState.formattedTodayDuty} today. Are you sure you want to end your shift?"
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showEndDutyDialog = false
                        viewModel.endDuty()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("End Duty")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showEndDutyDialog = false }) {
                    Text("Continue Shift")
                }
            }
        )
    }

    // Emergency SOS Confirmation Dialog (Mandatory Confirmation - Zero Auto Activation)
    if (showSosConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showSosConfirmDialog = false },
            icon = {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = null,
                    tint = Color(0xFFDC2626),
                    modifier = Modifier.size(36.dp)
                )
            },
            title = {
                Text(
                    "Confirm Emergency SOS Alert",
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF9F1239)
                )
            },
            text = {
                Text(
                    "⚠️ This will immediately notify Care Operations and initiate a Code Red emergency dispatch incident with your current location. Only trigger this during real emergencies.",
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showSosConfirmDialog = false
                        viewModel.triggerSos("Employee SOS button triggered from mobile app") { success, msg ->
                            Toast.makeText(context, msg ?: if (success) "SOS Alert Dispatched" else "Failed to dispatch SOS", Toast.LENGTH_LONG).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                ) {
                    Text("TRIGGER SOS NOW", fontWeight = FontWeight.Black)
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showSosConfirmDialog = false }) {
                    Text("Cancel")
                }
            }
        )
    }

    // Apply Leave Dialog
    if (showLeaveDialog) {
        AlertDialog(
            onDismissRequest = { showLeaveDialog = false },
            title = { Text("Apply for Leave", fontWeight = FontWeight.Bold, color = DeepNavy) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Enter your requested leave period (YYYY-MM-DD):", fontSize = 12.sp, color = Slate600)
                    OutlinedTextField(
                        value = leaveStartDate,
                        onValueChange = { leaveStartDate = it },
                        label = { Text("Start Date (e.g. 2026-11-25)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = leaveEndDate,
                        onValueChange = { leaveEndDate = it },
                        label = { Text("End Date (e.g. 2026-11-26)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = leaveReason,
                        onValueChange = { leaveReason = it },
                        label = { Text("Reason for Leave") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (leaveStartDate.isNotBlank() && leaveEndDate.isNotBlank() && leaveReason.isNotBlank()) {
                            showLeaveDialog = false
                            viewModel.applyLeave(leaveStartDate, leaveEndDate, leaveReason) { success, msg ->
                                Toast.makeText(context, msg ?: if (success) "Leave Submitted" else "Error", Toast.LENGTH_LONG).show()
                            }
                        } else {
                            Toast.makeText(context, "Please complete all fields", Toast.LENGTH_SHORT).show()
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
