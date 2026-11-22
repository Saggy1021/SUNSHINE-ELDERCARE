package `in`.sunshineeldercare.employee.ui.screens.home

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
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

                    // Duty ON/OFF Switch & Refresh
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
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

        // Dedicated Employee SOS Emergency Section (Matching Member App Design & State)
        if (uiState.activeSosIncident != null) {
            val incident = uiState.activeSosIncident!!
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFFFEF2F2),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFFECACA))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
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
                        )
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:03340585515"))
                            context.startActivity(intent)
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFDC2626),
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                    ) {
                        Icon(Icons.Default.PhoneInTalk, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Call Helpline: 033-40585515", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    }
                }
            }
        } else {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA)),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(Color(0xFFDC2626))
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "24/7 FIELD EMERGENCY ASSISTANCE",
                                color = Color(0xFFDC2626),
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp,
                                letterSpacing = 0.5.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = "Field Operations SOS",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = DeepNavy
                        )
                        Text(
                            text = "Instant Code Red dispatch & safety alert",
                            fontSize = 11.sp,
                            color = Slate600
                        )
                    }

                    Button(
                        onClick = { showSosConfirmDialog = true },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFFDC2626),
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        modifier = Modifier.height(40.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PhoneInTalk,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("SOS", fontWeight = FontWeight.Black, fontSize = 13.sp)
                    }
                }
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

    // Emergency SOS Confirmation Dialog (Exact Member App Visual Quality & Safety Dialog)
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
                        text = "Are you sure you want to trigger an emergency SOS?\n\nThis will immediately notify the Sunshine Emergency Command Center, transmit your live location, and initiate Code Red emergency dispatch assistance.",
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
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
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

    // Apply Leave Dialog (Native Calendar Date Pickers with DD/MM/YYYY formatting)
    if (showLeaveDialog) {
        val calendar = java.util.Calendar.getInstance()
        val currYear = calendar.get(java.util.Calendar.YEAR)
        val currMonth = calendar.get(java.util.Calendar.MONTH)
        val currDay = calendar.get(java.util.Calendar.DAY_OF_MONTH)

        val startDatePicker = android.app.DatePickerDialog(
            context,
            { _, year, month, dayOfMonth ->
                leaveStartDateDisplay = String.format("%02d/%02d/%04d", dayOfMonth, month + 1, year)
                leaveStartDateBackend = String.format("%04d-%02d-%02d", year, month + 1, dayOfMonth)
            },
            currYear,
            currMonth,
            currDay
        )

        val endDatePicker = android.app.DatePickerDialog(
            context,
            { _, year, month, dayOfMonth ->
                leaveEndDateDisplay = String.format("%02d/%02d/%04d", dayOfMonth, month + 1, year)
                leaveEndDateBackend = String.format("%04d-%02d-%02d", year, month + 1, dayOfMonth)
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
 * Modern, polished horizontal toggle switch for Duty ON/OFF.
 * Large, comfortable mobile touch target with smooth animations.
 */
@Composable
fun DutyToggleSwitch(
    isOnDuty: Boolean,
    isLoading: Boolean,
    onToggle: () -> Unit,
    modifier: Modifier = Modifier
) {
    val trackWidth = 126.dp
    val trackHeight = 34.dp
    val thumbSize = 26.dp
    val thumbPadding = 4.dp

    val trackColor by androidx.compose.animation.animateColorAsState(
        targetValue = if (isOnDuty) Color(0xFF059669) else Color(0xFFE2E8F0),
        animationSpec = androidx.compose.animation.core.tween(250),
        label = "trackColor"
    )

    val thumbOffset by androidx.compose.animation.core.animateDpAsState(
        targetValue = if (isOnDuty) trackWidth - thumbSize - thumbPadding else thumbPadding,
        animationSpec = androidx.compose.animation.core.tween(250),
        label = "thumbOffset"
    )

    Surface(
        shape = RoundedCornerShape(17.dp),
        color = trackColor,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isOnDuty) Color(0xFF047857) else Color(0xFFCBD5E1)
        ),
        modifier = modifier
            .width(trackWidth)
            .height(trackHeight)
            .clip(RoundedCornerShape(17.dp))
            .clickable(
                enabled = !isLoading,
                interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
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
                    .padding(horizontal = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = if (isOnDuty) Arrangement.Start else Arrangement.End
            ) {
                Text(
                    text = if (isOnDuty) "ON DUTY" else "OFF DUTY",
                    color = if (isOnDuty) Color.White else Color(0xFF475569),
                    fontWeight = FontWeight.Bold,
                    fontSize = 10.sp,
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
                        modifier = Modifier.size(14.dp)
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .clip(CircleShape)
                            .background(if (isOnDuty) Color(0xFF059669) else Color(0xFF94A3B8))
                    )
                }
            }
        }
    }
}
