package `in`.sunshineeldercare.employee

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.navigation.compose.rememberNavController
import `in`.sunshineeldercare.employee.ui.navigation.NavGraph
import `in`.sunshineeldercare.employee.ui.navigation.Screen
import `in`.sunshineeldercare.employee.ui.screens.crash.CrashRecoveryScreen
import `in`.sunshineeldercare.employee.ui.theme.SunshineEmployeeTheme
import `in`.sunshineeldercare.employee.util.CrashInfo
import `in`.sunshineeldercare.employee.util.CrashReporter

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val pendingCrash = CrashReporter.getLastCrash(this)

        setContent {
            SunshineEmployeeTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    var crashState by remember { mutableStateOf<CrashInfo?>(pendingCrash) }
                    var resetKey by remember { mutableStateOf(0) }

                    if (crashState != null) {
                        CrashRecoveryScreen(
                            crashInfo = crashState!!,
                            onDismissAndRetry = {
                                crashState = null
                            },
                            onResetComplete = {
                                crashState = null
                                resetKey++
                            }
                        )
                    } else {
                        key(resetKey) {
                            val navController = rememberNavController()
                            val pendingIncidentId = intent?.getStringExtra("extra_incident_id")

                            LaunchedEffect(pendingIncidentId) {
                                if (!pendingIncidentId.isNullOrBlank() && SunshineEmployeeApp.instance.tokenManager.isLoggedIn) {
                                    navController.navigate(Screen.EmergencyDetail.createRoute(pendingIncidentId))
                                }
                            }

                            NavGraph(navController = navController)
                        }
                    }
                }
            }
        }
    }
}
