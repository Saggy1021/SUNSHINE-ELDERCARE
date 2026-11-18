package `in`.sunshineeldercare.employee.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String) {
    object Login : Screen("login")
    object Activation : Screen("activation")
    object Main : Screen("main")
    object VisitDetail : Screen("visit_detail/{visitId}") {
        fun createRoute(visitId: String) = "visit_detail/$visitId"
    }
}

sealed class BottomTab(
    val route: String,
    val title: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    object Home : BottomTab("tab_home", "Home", Icons.Filled.Home, Icons.Outlined.Home)
    object Today : BottomTab("tab_today", "Today", Icons.Filled.CalendarToday, Icons.Outlined.CalendarToday)
    object Upcoming : BottomTab("tab_upcoming", "Upcoming", Icons.Filled.Schedule, Icons.Outlined.Schedule)
    object Completed : BottomTab("tab_completed", "Completed", Icons.Filled.CheckCircle, Icons.Outlined.CheckCircle)
    object Profile : BottomTab("tab_profile", "Profile", Icons.Filled.Person, Icons.Outlined.Person)

    companion object {
        val items = listOf(Home, Today, Upcoming, Completed, Profile)
    }
}
