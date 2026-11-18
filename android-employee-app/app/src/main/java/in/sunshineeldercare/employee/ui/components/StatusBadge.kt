package `in`.sunshineeldercare.employee.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.sunshineeldercare.employee.ui.theme.*

@Composable
fun StatusBadge(
    status: String,
    modifier: Modifier = Modifier
) {
    val (bg, text, label) = when (status.uppercase()) {
        "SCHEDULED" -> Triple(StatusScheduledBg, StatusScheduled, "SCHEDULED")
        "IN_PROGRESS" -> Triple(StatusInProgressBg, StatusInProgress, "IN PROGRESS")
        "COMPLETED" -> Triple(StatusCompletedBg, StatusCompleted, "COMPLETED")
        "CANCELLED" -> Triple(StatusCancelledBg, StatusCancelled, "CANCELLED")
        else -> Triple(Slate100, Slate600, status.uppercase())
    }

    Text(
        text = label,
        color = text,
        style = MaterialTheme.typography.labelSmall.copy(
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            letterSpacing = 0.5.sp
        ),
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 4.dp)
    )
}
