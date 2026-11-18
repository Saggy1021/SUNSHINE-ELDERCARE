package `in`.sunshineeldercare.employee.ui.screens.crash

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.data.local.AppDatabase
import `in`.sunshineeldercare.employee.ui.theme.*
import `in`.sunshineeldercare.employee.util.CrashInfo
import `in`.sunshineeldercare.employee.util.CrashReporter

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CrashRecoveryScreen(
    crashInfo: CrashInfo,
    onDismissAndRetry: () -> Unit,
    onResetComplete: () -> Unit
) {
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Diagnostics & Recovery",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = DeepNavy
                        )
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.White)
            )
        },
        containerColor = Slate50
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Warning Banner
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.BugReport,
                        contentDescription = "Crash Detected",
                        tint = StatusCancelled,
                        modifier = Modifier.size(32.dp)
                    )
                    Column {
                        Text(
                            text = "Crash Diagnostic Caught",
                            style = MaterialTheme.typography.titleSmall.copy(
                                fontWeight = FontWeight.Bold,
                                color = StatusCancelled
                            )
                        )
                        Text(
                            text = "An unexpected runtime exception was intercepted before Android could terminate the app.",
                            style = MaterialTheme.typography.bodySmall.copy(color = Slate700)
                        )
                    }
                }
            }

            // Error Summary Card
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "INCIDENT DETAILS",
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = Slate500
                        )
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Time:", style = MaterialTheme.typography.bodySmall.copy(color = Slate600))
                        Text(crashInfo.dateDisplay, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold, color = DeepNavy))
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Device:", style = MaterialTheme.typography.bodySmall.copy(color = Slate600))
                        Text(crashInfo.deviceInfo, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold, color = DeepNavy))
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Thread:", style = MaterialTheme.typography.bodySmall.copy(color = Slate600))
                        Text(crashInfo.threadName, style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.SemiBold, color = DeepNavy))
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp), color = Slate200)

                    Text(
                        text = "Exception: ${crashInfo.exceptionType}",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = StatusCancelled
                        )
                    )

                    if (crashInfo.message.isNotBlank()) {
                        Text(
                            text = crashInfo.message,
                            style = MaterialTheme.typography.bodySmall.copy(color = Slate800)
                        )
                    }
                }
            }

            // Stack Trace Box
            Text(
                text = "Complete Stack Trace",
                style = MaterialTheme.typography.titleSmall.copy(
                    fontWeight = FontWeight.Bold,
                    color = DeepNavy
                )
            )

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 120.dp, max = 240.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Slate900)
                    .border(1.dp, Slate700, RoundedCornerShape(8.dp))
                    .padding(12.dp)
                    .verticalScroll(rememberScrollState())
                    .horizontalScroll(rememberScrollState())
            ) {
                Text(
                    text = crashInfo.stackTrace,
                    style = MaterialTheme.typography.bodySmall.copy(
                        fontFamily = FontFamily.Monospace,
                        fontSize = 11.sp,
                        color = Color(0xFFF1F5F9),
                        lineHeight = 15.sp
                    )
                )
            }

            // Action Buttons
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Copy Button
                OutlinedButton(
                    onClick = {
                        val fullReport = buildString {
                            append("Sunshine Employee App - Crash Diagnostic\n")
                            append("Timestamp: ${crashInfo.dateDisplay}\n")
                            append("Device: ${crashInfo.deviceInfo}\n")
                            append("Thread: ${crashInfo.threadName}\n")
                            append("Exception: ${crashInfo.exceptionType}\n")
                            append("Message: ${crashInfo.message}\n\n")
                            append("Stack Trace:\n${crashInfo.stackTrace}")
                        }
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("Sunshine Crash Log", fullReport))
                        Toast.makeText(context, "Full crash report copied to clipboard", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Copy Diagnostic Log")
                }

                // Reset App Button
                Button(
                    onClick = {
                        // Clear Token, Clear DB, Clear Crash Info
                        SunshineEmployeeApp.instance.tokenManager.clear()
                        AppDatabase.clearDatabase(context)
                        CrashReporter.clearCrash(context)
                        Toast.makeText(context, "App session and database cache reset cleanly", Toast.LENGTH_LONG).show()
                        onResetComplete()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = StatusCancelled)
                ) {
                    Icon(Icons.Default.DeleteForever, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Reset App & Clear Cache", fontWeight = FontWeight.Bold)
                }

                // Dismiss & Retry
                FilledTonalButton(
                    onClick = {
                        CrashReporter.clearCrash(context)
                        onDismissAndRetry()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Dismiss & Continue to App")
                }
            }
        }
    }
}
