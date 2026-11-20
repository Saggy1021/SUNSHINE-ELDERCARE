package `in`.sunshineeldercare.member

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import `in`.sunshineeldercare.member.ui.navigation.AppNavigation
import `in`.sunshineeldercare.member.ui.theme.SunshineTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            SunshineTheme {
                AppNavigation()
            }
        }
    }
}
