package `in`.sunshineeldercare.employee.ui.screens.detail

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.sunshineeldercare.employee.ui.components.StatusBadge
import `in`.sunshineeldercare.employee.ui.components.TimePickerDialog
import `in`.sunshineeldercare.employee.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun VisitDetailScreen(
    visitId: String,
    onNavigateBack: () -> Unit,
    viewModel: VisitDetailViewModel = viewModel(
        factory = object : androidx.lifecycle.ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : androidx.lifecycle.ViewModel> create(modelClass: Class<T>): T {
                return VisitDetailViewModel(visitId) as T
            }
        }
    )
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    var showArrivalPicker by remember { mutableStateOf(false) }
    var showDeparturePicker by remember { mutableStateOf(false) }

    if (showArrivalPicker) {
        TimePickerDialog(
            title = "Set Actual Arrival Time",
            onDismiss = { showArrivalPicker = false },
            onConfirm = { time ->
                showArrivalPicker = false
                viewModel.setArrival(time)
            }
        )
    }

    if (showDeparturePicker) {
        TimePickerDialog(
            title = "Set Actual Departure Time",
            onDismiss = { showDeparturePicker = false },
            onConfirm = { time ->
                showDeparturePicker = false
                viewModel.setDeparture(time)
            }
        )
    }

    if (uiState.showCompleteConfirmation) {
        AlertDialog(
            onDismissRequest = { viewModel.dismissCompleteDialog() },
            title = {
                Text(
                    text = "Complete Care Visit",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold, color = DeepNavy)
                )
            },
            text = {
                Text(
                    text = "Are you sure you want to mark this visit as COMPLETED? Once completed, your arrival, departure and work report will be submitted to Admin.",
                    style = MaterialTheme.typography.bodyMedium.copy(color = Slate700)
                )
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.completeVisit() },
                    colors = ButtonDefaults.buttonColors(containerColor = StatusCompleted)
                ) {
                    Text("Confirm & Complete", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { viewModel.dismissCompleteDialog() }) {
                    Text("Cancel", color = Slate600)
                }
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Care Visit Details",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = DeepNavy
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = DeepNavy
                        )
                    }
                },
                actions = {
                    uiState.visit?.let {
                        StatusBadge(status = it.status, modifier = Modifier.padding(end = 12.dp))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Slate50
    ) { paddingValues ->
        val visit = uiState.visit

        if (visit == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = DeepNavy)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Success Banner
                if (!uiState.successMessage.isNullOrBlank()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(StatusCompletedBg)
                            .padding(12.dp)
                    ) {
                        Text(
                            text = uiState.successMessage!!,
                            color = StatusCompleted,
                            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium)
                        )
                    }
                }

                // Error Banner
                if (!uiState.errorMessage.isNullOrBlank()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(StatusCancelledBg)
                            .padding(12.dp)
                    ) {
                        Text(
                            text = uiState.errorMessage!!,
                            color = StatusCancelled,
                            style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium)
                        )
                    }
                }

                // Card 1: Care Recipient & Household
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "MEMBER INFORMATION",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Slate500,
                                    letterSpacing = 0.5.sp
                                )
                            )

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(Slate100)
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = visit.memberId,
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = DeepNavy
                                    )
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = visit.primaryMemberName,
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = DeepNavy,
                                fontSize = 18.sp
                            )
                        )

                        if (!visit.spouseName.isNullOrBlank() && visit.spouseName != "—") {
                            Text(
                                text = "Spouse: ${visit.spouseName}",
                                style = MaterialTheme.typography.bodySmall.copy(
                                    color = Slate600
                                ),
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))
                        HorizontalDivider(color = Slate100, thickness = 1.dp)
                        Spacer(modifier = Modifier.height(14.dp))

                        // Phone Action
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.Phone, contentDescription = null, tint = GoldPrimary, modifier = Modifier.size(18.dp))
                                Text(
                                    text = visit.primaryMobile,
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        color = Slate800,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                )
                            }

                            FilledTonalButton(
                                onClick = {
                                    val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                                        data = Uri.parse("tel:${visit.primaryMobile.replace(" ", "")}")
                                    }
                                    context.startActivity(dialIntent)
                                },
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Call, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Call", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Address Action
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.Top,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Icon(Icons.Default.LocationOn, contentDescription = null, tint = Slate400, modifier = Modifier.size(18.dp).padding(top = 2.dp))
                                Text(
                                    text = visit.serviceAddress,
                                    style = MaterialTheme.typography.bodySmall.copy(color = Slate600)
                                )
                            }

                            Spacer(modifier = Modifier.width(8.dp))

                            FilledTonalButton(
                                onClick = {
                                    val mapIntent = Intent(Intent.ACTION_VIEW).apply {
                                        data = Uri.parse("geo:0,0?q=${Uri.encode(visit.serviceAddress)}")
                                    }
                                    context.startActivity(mapIntent)
                                },
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Directions, contentDescription = null, modifier = Modifier.size(14.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Map", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }

                // Card 2: Scheduled Window
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "SCHEDULED VISIT WINDOW",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Slate500,
                                letterSpacing = 0.5.sp
                            )
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.Event, contentDescription = null, tint = GoldPrimary, modifier = Modifier.size(18.dp))
                            Text(
                                text = "${visit.scheduledDate} • ${visit.scheduledWindowDisplay}",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = DeepNavy
                                )
                            )
                        }
                    }
                }

                // Card 3: Actual Execution Times
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "ACTUAL VISIT EXECUTION",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Slate500,
                                letterSpacing = 0.5.sp
                            )
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // Actual Arrival Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Actual Arrival",
                                    style = MaterialTheme.typography.bodySmall.copy(color = Slate600)
                                )
                                Text(
                                    text = uiState.arrivalInput.ifBlank { visit.actualArrivalDisplay ?: "Not recorded" },
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = if (!visit.actualArrivalDisplay.isNullOrBlank() || uiState.arrivalInput.isNotBlank()) DeepNavy else Slate400
                                    )
                                )
                            }

                            if (!uiState.isCompleted) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    OutlinedButton(
                                        onClick = { viewModel.recordCurrentTimeToArrival() },
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text("Now", fontSize = 11.sp)
                                    }

                                    Button(
                                        onClick = { showArrivalPicker = true },
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                                    ) {
                                        Text("Set", fontSize = 11.sp)
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))
                        HorizontalDivider(color = Slate100, thickness = 1.dp)
                        Spacer(modifier = Modifier.height(12.dp))

                        // Actual Departure Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "Actual Departure",
                                    style = MaterialTheme.typography.bodySmall.copy(color = Slate600)
                                )
                                Text(
                                    text = uiState.departureInput.ifBlank { visit.actualDepartureDisplay ?: "Not recorded" },
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.Bold,
                                        color = if (!visit.actualDepartureDisplay.isNullOrBlank() || uiState.departureInput.isNotBlank()) DeepNavy else Slate400
                                    )
                                )
                            }

                            if (!uiState.isCompleted) {
                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    OutlinedButton(
                                        onClick = { viewModel.recordCurrentTimeToDeparture() },
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Text("Now", fontSize = 11.sp)
                                    }

                                    Button(
                                        onClick = { showDeparturePicker = true },
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = DeepNavy)
                                    ) {
                                        Text("Set", fontSize = 11.sp)
                                    }
                                }
                            }
                        }

                        // Completed at timestamp
                        if (!visit.completedAt.isNullOrBlank()) {
                            Spacer(modifier = Modifier.height(12.dp))
                            HorizontalDivider(color = Slate100, thickness = 1.dp)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Completed on: ${visit.completedAt}",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = StatusCompleted,
                                    fontWeight = FontWeight.SemiBold
                                )
                            )
                        }
                    }
                }

                // Card 4: Work Performed Report
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "WORK PERFORMED REPORT",
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = Slate500,
                                letterSpacing = 0.5.sp
                            )
                        )

                        Spacer(modifier = Modifier.height(10.dp))

                        if (uiState.isCompleted) {
                            Text(
                                text = visit.workDescription.orEmpty().ifBlank { "No description recorded." },
                                style = MaterialTheme.typography.bodyMedium.copy(color = Slate800)
                            )
                        } else {
                            OutlinedTextField(
                                value = uiState.workDescriptionInput,
                                onValueChange = { viewModel.onWorkDescriptionChange(it) },
                                placeholder = {
                                    Text("Enter detailed notes on care provided, vitals checked, member feedback, or observations...")
                                },
                                minLines = 4,
                                maxLines = 10,
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = DeepNavy,
                                    cursorColor = DeepNavy
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            Button(
                                onClick = { viewModel.saveWorkDescription() },
                                enabled = !uiState.isSavingWorkDescription && uiState.workDescriptionInput.isNotBlank(),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = DeepNavyLight),
                                modifier = Modifier.align(Alignment.End)
                            ) {
                                if (uiState.isSavingWorkDescription) {
                                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                                } else {
                                    Text("Save Work Report", fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }

                // Card 5: Complete Visit Action
                if (!uiState.isCompleted) {
                    Button(
                        onClick = { viewModel.showCompleteDialog() },
                        enabled = uiState.canComplete && !uiState.isCompleting,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = StatusCompleted),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                    ) {
                        if (uiState.isCompleting) {
                            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                        } else {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Complete Care Visit",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                        }
                    }

                    if (!uiState.canComplete) {
                        Text(
                            text = "To complete: Record arrival time, departure time, and work description report.",
                            style = MaterialTheme.typography.bodySmall.copy(
                                color = Slate500,
                                fontSize = 11.sp
                            ),
                            modifier = Modifier.padding(horizontal = 4.dp)
                        )
                    }
                } else {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = StatusCompletedBg)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = StatusCompleted)
                            Column {
                                Text(
                                    text = "Care Visit Completed",
                                    style = MaterialTheme.typography.titleSmall.copy(
                                        color = StatusCompleted,
                                        fontWeight = FontWeight.Bold
                                    )
                                )
                                Text(
                                    text = "All records have been synchronized with Sunshine Eldercare Admin Portal.",
                                    style = MaterialTheme.typography.bodySmall.copy(color = Slate700)
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}
