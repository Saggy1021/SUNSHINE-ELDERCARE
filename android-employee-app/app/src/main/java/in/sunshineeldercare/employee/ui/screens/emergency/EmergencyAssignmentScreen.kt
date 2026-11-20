package `in`.sunshineeldercare.employee.ui.screens.emergency

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.remote.model.EmergencyAssignmentDto
import `in`.sunshineeldercare.employee.data.remote.model.RecordArrivalRequest
import `in`.sunshineeldercare.employee.ui.theme.*
import `in`.sunshineeldercare.employee.util.EmergencyDispatchMonitor
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmergencyAssignmentScreen(
    incidentId: String,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val activeAssignment by EmergencyDispatchMonitor.activeAssignment.collectAsState()

    var assignment by remember { mutableStateOf<EmergencyAssignmentDto?>(activeAssignment) }
    var isLoading by remember { mutableStateOf(false) }
    var isRecordingArrival by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var arrivalSuccessMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(incidentId, activeAssignment) {
        if (activeAssignment?.id == incidentId) {
            assignment = activeAssignment
        } else {
            // Fetch directly from API
            isLoading = true
            try {
                val res = SunshineEmployeeApp.instance.apiService.getActiveEmergency()
                if (res.isSuccessful && res.body()?.hasAssignment == true) {
                    assignment = res.body()?.assignment
                }
            } catch (e: Exception) {
                errorMessage = e.message
            } finally {
                isLoading = false
            }
        }
    }

    fun recordArrival() {
        val curAssignment = assignment ?: return
        isRecordingArrival = true
        errorMessage = null

        scope.launch {
            try {
                val response = SunshineEmployeeApp.instance.apiService.recordEmergencyArrival(
                    RecordArrivalRequest(incidentId = curAssignment.id)
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    arrivalSuccessMessage = "Arrival on scene recorded successfully."
                    EmergencyDispatchMonitor.refreshNow(context)
                } else {
                    errorMessage = response.body()?.error ?: "Failed to record arrival."
                }
            } catch (e: Exception) {
                errorMessage = "Network error: ${e.message}"
            } finally {
                isRecordingArrival = false
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Emergency Assignment",
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = StatusCancelled // Deep Red
                )
            )
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = StatusCancelled)
            }
        } else if (assignment == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = StatusCompleted, modifier = Modifier.size(56.dp))
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("No Active Emergency Assignment", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("This incident has been resolved or reassigned.", color = Slate600)
                    Spacer(modifier = Modifier.height(20.dp))
                    Button(onClick = onBack, colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)) {
                        Text("Return to Dashboard")
                    }
                }
            }
        } else {
            val item = assignment!!
            val memberName = item.member?.name ?: item.callerName ?: "Sunshine Member"
            val phone = item.member?.phone ?: item.callerPhone
            val address = item.member?.address ?: item.address ?: "Address on file"
            val isArrived = item.status == "RESPONDER_ON_SCENE"

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Slate50)
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp)
            ) {
                // Header Alert Banner
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(StatusCancelled),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = Color.White, modifier = Modifier.size(28.dp))
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column {
                            Text(
                                text = item.incidentNumber,
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = DeepNavy)
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Surface(
                                    color = StatusCancelled,
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = item.classification,
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Surface(
                                    color = if (isArrived) StatusCompleted else StatusInProgress,
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = if (isArrived) "ON SCENE" else "DISPATCHED",
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Feedback notices
                if (errorMessage != null) {
                    Surface(
                        color = Color(0xFFFEF2F2),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                    ) {
                        Text(text = errorMessage!!, color = StatusCancelled, fontSize = 13.sp, modifier = Modifier.padding(12.dp))
                    }
                }

                if (arrivalSuccessMessage != null) {
                    Surface(
                        color = StatusCompletedBg,
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFA7F3D0)),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp)
                    ) {
                        Text(text = arrivalSuccessMessage!!, color = StatusCompleted, fontSize = 13.sp, modifier = Modifier.padding(12.dp))
                    }
                }

                // Member Details Card
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Text(
                            text = "MEMBER INFORMATION",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Slate500,
                                letterSpacing = 1.sp
                            )
                        )
                        Spacer(modifier = Modifier.height(12.dp))

                        Text(text = memberName, style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold, color = DeepNavy))
                        if (!item.member?.memberId.isNullOrBlank()) {
                            Text(text = "Member ID: ${item.member!!.memberId}", style = MaterialTheme.typography.bodyMedium.copy(color = GoldPrimary, fontWeight = FontWeight.SemiBold))
                        }
                        if (!item.member?.bloodGroup.isNullOrBlank()) {
                            Text(text = "Blood Group: ${item.member!!.bloodGroup}", style = MaterialTheme.typography.bodySmall.copy(color = Slate600))
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                        HorizontalDivider(color = Slate200)
                        Spacer(modifier = Modifier.height(16.dp))

                        // Phone & Direct Call Action
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Contact Number", style = MaterialTheme.typography.labelSmall.copy(color = Slate500))
                                Text(phone ?: "Not available", style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Bold, color = DeepNavy))
                            }
                            if (!phone.isNullOrBlank()) {
                                Button(
                                    onClick = { launchDialer(context, phone) },
                                    colors = ButtonDefaults.buttonColors(containerColor = StatusCompleted),
                                    shape = RoundedCornerShape(10.dp)
                                ) {
                                    Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Call Member", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))
                        HorizontalDivider(color = Slate200)
                        Spacer(modifier = Modifier.height(16.dp))

                        // Address & Navigation
                        Text("Response Location", style = MaterialTheme.typography.labelSmall.copy(color = Slate500))
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(address, style = MaterialTheme.typography.bodyMedium.copy(color = DeepNavy, fontWeight = FontWeight.Medium))
                        if (!item.member?.landmark.isNullOrBlank()) {
                            Text("Landmark: ${item.member!!.landmark}", style = MaterialTheme.typography.bodySmall.copy(color = Slate600))
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        OutlinedButton(
                            onClick = { launchNavigation(context, item.latitude, item.longitude, address) },
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Navigation, contentDescription = null, tint = DeepNavy, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("Open in Google Maps / Navigation", color = DeepNavy, fontWeight = FontWeight.Bold)
                        }

                        if (!item.dispatchNotes.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("Dispatch Instructions", style = MaterialTheme.typography.labelSmall.copy(color = Slate500))
                            Spacer(modifier = Modifier.height(4.dp))
                            Surface(
                                color = Slate50,
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = item.dispatchNotes,
                                    style = MaterialTheme.typography.bodySmall.copy(color = Slate700),
                                    modifier = Modifier.padding(10.dp)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Action: Mark Arrived On Scene
                if (!isArrived) {
                    Button(
                        onClick = { recordArrival() },
                        enabled = !isRecordingArrival,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = StatusCompleted),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(54.dp)
                    ) {
                        if (isRecordingArrival) {
                            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(22.dp))
                        } else {
                            Icon(Icons.Default.LocationOn, contentDescription = null)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("I HAVE ARRIVED ON SCENE", fontSize = 16.sp, fontWeight = FontWeight.Black)
                        }
                    }
                } else {
                    Surface(
                        color = StatusCompletedBg,
                        border = androidx.compose.foundation.BorderStroke(2.dp, Color(0xFFA7F3D0)),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = StatusCompleted, modifier = Modifier.size(28.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text("RESPONDER ON SCENE RECORDED", fontWeight = FontWeight.Black, color = StatusCompleted, fontSize = 14.sp)
                                Text("EmergencyOS operator has been updated.", color = Slate600, fontSize = 12.sp)
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}

private fun launchDialer(context: Context, phone: String) {
    try {
        val intent = Intent(Intent.ACTION_DIAL).apply {
            data = Uri.parse("tel:$phone")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    } catch (_: Exception) {}
}

private fun launchNavigation(context: Context, lat: Double?, lon: Double?, address: String) {
    try {
        val uri = if (lat != null && lon != null) {
            Uri.parse("geo:$lat,$lon?q=$lat,$lon(Emergency+Location)")
        } else {
            Uri.parse("geo:0,0?q=${Uri.encode(address)}")
        }
        val intent = Intent(Intent.ACTION_VIEW, uri).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
    } catch (_: Exception) {}
}
