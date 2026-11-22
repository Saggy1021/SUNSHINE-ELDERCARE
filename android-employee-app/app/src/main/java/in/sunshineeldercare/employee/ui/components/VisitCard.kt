package `in`.sunshineeldercare.employee.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity
import `in`.sunshineeldercare.employee.ui.theme.*

@Composable
fun VisitCard(
    visit: VisitEntity,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isEmergency = visit.isEmergency

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isEmergency) Color(0xFFFEF2F2) else Color.White
        ),
        border = if (isEmergency) androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFFDC2626)) else null,
        elevation = CardDefaults.cardElevation(
            defaultElevation = 2.dp
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            // Header: Member ID / Emergency Badge & Status Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    if (isEmergency) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(Color(0xFFDC2626))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "🚨 CODE RED",
                                color = Color.White,
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontWeight = FontWeight.Black,
                                    fontSize = 10.sp
                                )
                            )
                        }
                    }
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(if (isEmergency) Color(0xFFFEE2E2) else Slate100)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = visit.memberId,
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontWeight = FontWeight.SemiBold,
                                color = if (isEmergency) Color(0xFFDC2626) else Slate700
                            )
                        )
                    }
                }

                StatusBadge(status = visit.status)
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Primary Member Name
            Text(
                text = visit.primaryMemberName,
                style = MaterialTheme.typography.titleMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = DeepNavy,
                    fontSize = 17.sp
                ),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            // Spouse Name
            if (!visit.spouseName.isNullOrBlank() && visit.spouseName != "—") {
                Text(
                    text = "Spouse: ${visit.spouseName}",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = Slate600
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = Slate100, thickness = 1.dp)
            Spacer(modifier = Modifier.height(10.dp))

            // Scheduled Time Window
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.AccessTime,
                    contentDescription = null,
                    tint = GoldPrimary,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = "${visit.scheduledDate} • ${visit.scheduledWindowDisplay}",
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = Slate700,
                        fontWeight = FontWeight.Medium
                    )
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Service Address
            Row(
                verticalAlignment = Alignment.Top,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.LocationOn,
                    contentDescription = null,
                    tint = Slate400,
                    modifier = Modifier.size(16.dp).padding(top = 2.dp)
                )
                Text(
                    text = visit.serviceAddress,
                    style = MaterialTheme.typography.bodySmall.copy(
                        color = Slate600
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )

                Icon(
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = "View Details",
                    tint = Slate400,
                    modifier = Modifier.size(18.dp)
                )
            }

            // Actual Execution summary if in progress or completed
            if (!visit.actualArrivalDisplay.isNullOrBlank() || !visit.actualDepartureDisplay.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(6.dp))
                        .background(Slate50)
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Actual: ${visit.actualArrivalDisplay ?: "--"} → ${visit.actualDepartureDisplay ?: "--"}",
                        style = MaterialTheme.typography.labelSmall.copy(
                            color = Slate700,
                            fontWeight = FontWeight.Medium
                        )
                    )
                    if (visit.status == "COMPLETED") {
                        Text(
                            text = "Done",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = StatusCompleted,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }
            }
        }
    }
}
