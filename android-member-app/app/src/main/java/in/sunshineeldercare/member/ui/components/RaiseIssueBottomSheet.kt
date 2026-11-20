package `in`.sunshineeldercare.member.ui.components

import `in`.sunshineeldercare.member.ui.theme.*
import `in`.sunshineeldercare.member.data.model.MemberComplaintDto
import `in`.sunshineeldercare.member.data.repository.MemberRepository

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch

val COMPLAINT_CATEGORIES = listOf(
    "Service-related Complaints",
    "Staff-related Complaints",
    "Payment-related Issues",
    "Appointment-related Issues"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RaiseIssueSection(
    modifier: Modifier = Modifier,
    repository: MemberRepository = remember { MemberRepository() }
) {
    val scope = rememberCoroutineScope()
    var showSheet by remember { mutableStateOf(false) }
    var selectedCategory by remember { mutableStateOf(COMPLAINT_CATEGORIES[0]) }
    var subject by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }
    var submitError by remember { mutableStateOf<String?>(null) }
    var submittedMessage by remember { mutableStateOf<String?>(null) }

    // Complaints history state
    var complaints by remember { mutableStateOf<List<MemberComplaintDto>>(emptyList()) }
    var isLoadingComplaints by remember { mutableStateOf(false) }

    val refreshComplaints = {
        scope.launch {
            isLoadingComplaints = true
            val res = repository.getComplaints()
            res.onSuccess { list ->
                complaints = list
            }
            isLoadingComplaints = false
        }
    }

    LaunchedEffect(Unit) {
        refreshComplaints()
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = CardBackground),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(IvoryBackground)
                        .border(1.dp, BorderGold, RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Message,
                        contentDescription = null,
                        tint = GoldPrimary,
                        modifier = Modifier.size(18.dp)
                    )
                }

                Spacer(modifier = Modifier.width(10.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Raise an Issue or Complaint",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = NavyDark
                    )
                    Text(
                        text = "Dedicated Care Redressal & Support",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Text(
                text = "Encountering an issue with our care staff, scheduled visit, or invoice? Select a category below to report for priority resolution by the Sunshine Care Operations Desk.",
                fontSize = 11.sp,
                color = TextSecondary,
                lineHeight = 16.sp
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Category selector buttons
            COMPLAINT_CATEGORIES.forEach { category ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .defaultMinSize(minHeight = 44.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(IvoryBackground)
                        .border(1.dp, BorderGold, RoundedCornerShape(12.dp))
                        .clickable {
                            selectedCategory = category
                            submitError = null
                            showSheet = true
                        }
                        .padding(horizontal = 14.dp, vertical = 10.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(GoldPrimary)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = category,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = NavyDark
                        )
                    }
                }
            }

            // Success Notice after submission
            submittedMessage?.let { msg ->
                Spacer(modifier = Modifier.height(12.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFECFDF5))
                        .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = EmeraldActive,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = msg,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = EmeraldActive
                        )
                    }
                }
            }

            // Member's Submitted Tickets History Section
            Spacer(modifier = Modifier.height(18.dp))
            HorizontalDivider(color = Color(0xFFF1F5F9))
            Spacer(modifier = Modifier.height(14.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "YOUR SUBMITTED TICKETS",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = NavyDark,
                    letterSpacing = 0.5.sp,
                    modifier = Modifier.weight(1f)
                )

                if (isLoadingComplaints) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(14.dp),
                        strokeWidth = 2.dp,
                        color = GoldPrimary
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (complaints.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(IvoryBackground)
                        .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                        .padding(14.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "No open support tickets. Select a category above to submit a concern.",
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
            } else {
                complaints.forEach { cmp ->
                    val isResolved = cmp.status == "RESOLVED"
                    val isInProgress = cmp.status == "IN_PROGRESS"
                    val isNew = cmp.status == "NEW"

                    val statusLabel = when (cmp.status) {
                        "RESOLVED" -> "RESOLVED"
                        "IN_PROGRESS" -> "INVESTIGATING"
                        else -> "REVIEW PENDING"
                    }

                    val statusBg = when (cmp.status) {
                        "RESOLVED" -> EmeraldBg
                        "IN_PROGRESS" -> Color(0xFFEFF6FF)
                        else -> Color(0xFFFFFBEB)
                    }

                    val statusColor = when (cmp.status) {
                        "RESOLVED" -> EmeraldActive
                        "IN_PROGRESS" -> Color(0xFF1D4ED8)
                        else -> Color(0xFFB45309)
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(IvoryBackground)
                            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                            .padding(12.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = cmp.complaintNumber,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = NavyDark
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "• ${cmp.category}",
                                    fontSize = 10.sp,
                                    color = TextSecondary,
                                    modifier = Modifier.weight(1f)
                                )
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(50))
                                        .background(statusBg)
                                        .padding(horizontal = 7.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = statusLabel,
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = statusColor
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            Text(
                                text = cmp.subject,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = NavyDark
                            )

                            Text(
                                text = cmp.description,
                                fontSize = 11.sp,
                                color = TextSecondary,
                                lineHeight = 15.sp,
                                modifier = Modifier.padding(top = 2.dp)
                            )

                            // Official Admin Response Box
                            cmp.adminResponse?.let { resp ->
                                Spacer(modifier = Modifier.height(8.dp))
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(Color(0xFFECFDF5))
                                        .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(8.dp))
                                        .padding(8.dp)
                                ) {
                                    Column {
                                        Text(
                                            text = "CARE OPERATIONS DESK RESOLUTION",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = EmeraldActive,
                                            letterSpacing = 0.5.sp
                                        )
                                        Spacer(modifier = Modifier.height(2.dp))
                                        Text(
                                            text = resp,
                                            fontSize = 11.sp,
                                            color = Color(0xFF065F46),
                                            lineHeight = 15.sp
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

    // BOTTOM SHEET FORM FOR LOGGING NEW CONCERN
    if (showSheet) {
        val sheetState = rememberModalBottomSheetState()

        ModalBottomSheet(
            onDismissRequest = { if (!isSubmitting) showSheet = false },
            sheetState = sheetState,
            containerColor = CardBackground
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Member Redressal Desk",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = NavyDark,
                        modifier = Modifier.weight(1f)
                    )
                    IconButton(
                        onClick = {
                            scope.launch { sheetState.hide() }.invokeOnCompletion { showSheet = false }
                        },
                        enabled = !isSubmitting
                    ) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close")
                    }
                }

                Text(
                    text = "Category: $selectedCategory",
                    fontSize = 12.sp,
                    color = GoldPrimary,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = subject,
                    onValueChange = { subject = it },
                    label = { Text("Subject / Concern Title") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    enabled = !isSubmitting
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description & Observations") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 3,
                    maxLines = 5,
                    enabled = !isSubmitting
                )

                submitError?.let { err ->
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = err,
                        color = SosRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Button(
                    onClick = {
                        isSubmitting = true
                        submitError = null
                        scope.launch {
                            val res = repository.submitComplaint(selectedCategory, subject, description)
                            res.onSuccess { createdTicket ->
                                isSubmitting = false
                                submittedMessage = "Ticket ${createdTicket.complaintNumber} logged successfully. Our Care Officer will review and contact you."
                                subject = ""
                                description = ""
                                refreshComplaints()
                                sheetState.hide()
                                showSheet = false
                            }.onFailure { err ->
                                isSubmitting = false
                                submitError = err.message ?: "Failed to submit ticket. Please check your network."
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = navyButtonColors(),
                    enabled = subject.isNotBlank() && description.isNotBlank() && !isSubmitting
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Icon(imageVector = Icons.Default.Send, contentDescription = null, tint = GoldLight)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Submit Ticket for Review",
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}
