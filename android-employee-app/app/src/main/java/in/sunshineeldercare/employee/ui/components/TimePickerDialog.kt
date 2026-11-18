package `in`.sunshineeldercare.employee.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import `in`.sunshineeldercare.employee.ui.theme.DeepNavy
import `in`.sunshineeldercare.employee.ui.theme.GoldPrimary
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimePickerDialog(
    title: String = "Select Time",
    initialHour: Int = 9,
    initialMinute: Int = 30,
    onDismiss: () -> Unit,
    onConfirm: (formattedTime: String) -> Unit
) {
    val timePickerState = rememberTimePickerState(
        initialHour = initialHour,
        initialMinute = initialMinute,
        is24Hour = false
    )

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.White,
            tonalElevation = 6.dp,
            modifier = Modifier.width(IntrinsicSize.Min)
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    color = DeepNavy,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                )

                TimePicker(
                    state = timePickerState,
                    colors = TimePickerDefaults.colors(
                        clockDialColor = Color(0xFFF1F5F9),
                        selectorColor = GoldPrimary,
                        containerColor = Color.White
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    TextButton(onClick = onDismiss) {
                        Text("Cancel", color = DeepNavy)
                    }

                    Spacer(modifier = Modifier.width(8.dp))

                    Button(
                        onClick = {
                            val hour24 = timePickerState.hour
                            val minute = timePickerState.minute
                            val amPm = if (hour24 >= 12) "PM" else "AM"
                            val hour12 = when {
                                hour24 == 0 -> 12
                                hour24 > 12 -> hour24 - 12
                                else -> hour24
                            }
                            val formatted = String.format(Locale.US, "%02d:%02d %s", hour12, minute, amPm)
                            onConfirm(formatted)
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = DeepNavy
                        )
                    ) {
                        Text("Set Time", color = Color.White)
                    }
                }
            }
        }
    }
}
