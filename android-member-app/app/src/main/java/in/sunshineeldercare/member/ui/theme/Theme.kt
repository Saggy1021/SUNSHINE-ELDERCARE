package `in`.sunshineeldercare.member.ui.theme

import android.app.Activity
import androidx.compose.material3.ButtonColors
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColorScheme = lightColorScheme(
    primary = NavyDark,
    onPrimary = Color.White,
    primaryContainer = NavyLight,
    onPrimaryContainer = GoldLight,
    secondary = GoldPrimary,
    onSecondary = Color.White,
    secondaryContainer = GoldMuted,
    onSecondaryContainer = NavyDark,
    tertiary = EmeraldActive,
    background = IvoryBackground,
    onBackground = TextPrimary,
    surface = CardBackground,
    onSurface = TextPrimary,
    error = SosRed,
    onError = Color.White
)

/**
 * Standard button styling with guaranteed contrast across all Android versions.
 */
@Composable
fun navyButtonColors(
    containerColor: Color = NavyDark,
    contentColor: Color = Color.White,
    disabledContainerColor: Color = NavyDark.copy(alpha = 0.5f),
    disabledContentColor: Color = Color.White.copy(alpha = 0.6f)
): ButtonColors = ButtonDefaults.buttonColors(
    containerColor = containerColor,
    contentColor = contentColor,
    disabledContainerColor = disabledContainerColor,
    disabledContentColor = disabledContentColor
)

@Composable
fun goldButtonColors(
    containerColor: Color = GoldPrimary,
    contentColor: Color = Color.White,
    disabledContainerColor: Color = GoldPrimary.copy(alpha = 0.5f),
    disabledContentColor: Color = Color.White.copy(alpha = 0.6f)
): ButtonColors = ButtonDefaults.buttonColors(
    containerColor = containerColor,
    contentColor = contentColor,
    disabledContainerColor = disabledContainerColor,
    disabledContentColor = disabledContentColor
)

@Composable
fun sosRedButtonColors(
    containerColor: Color = SosRed,
    contentColor: Color = Color.White,
    disabledContainerColor: Color = SosRed.copy(alpha = 0.5f),
    disabledContentColor: Color = Color.White.copy(alpha = 0.6f)
): ButtonColors = ButtonDefaults.buttonColors(
    containerColor = containerColor,
    contentColor = contentColor,
    disabledContainerColor = disabledContainerColor,
    disabledContentColor = disabledContentColor
)

@Composable
fun SunshineTheme(
    content: @Composable () -> Unit
) {
    val colorScheme = LightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = NavyDark.toArgb()
            window.navigationBarColor = NavyDark.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
