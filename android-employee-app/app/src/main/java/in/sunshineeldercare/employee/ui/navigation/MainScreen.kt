package `in`.sunshineeldercare.employee.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import `in`.sunshineeldercare.employee.ui.screens.home.HomeScreen
import `in`.sunshineeldercare.employee.ui.screens.profile.ProfileScreen
import `in`.sunshineeldercare.employee.ui.screens.visits.CompletedVisitsScreen
import `in`.sunshineeldercare.employee.ui.screens.visits.TodayVisitsScreen
import `in`.sunshineeldercare.employee.ui.screens.visits.UpcomingVisitsScreen

@Composable
fun MainScreen(
    onVisitClick: (String) -> Unit,
    onLogout: () -> Unit
) {
    var currentTab by remember { mutableStateOf<BottomTab>(BottomTab.Home) }

    Scaffold(
        bottomBar = {
            BottomNavBar(
                currentRoute = currentTab.route,
                onTabSelected = { currentTab = it }
            )
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            when (currentTab) {
                BottomTab.Home -> HomeScreen(
                    onNavigateToToday = { currentTab = BottomTab.Today },
                    onNavigateToUpcoming = { currentTab = BottomTab.Upcoming },
                    onVisitClick = onVisitClick
                )
                BottomTab.Today -> TodayVisitsScreen(onVisitClick = onVisitClick)
                BottomTab.Upcoming -> UpcomingVisitsScreen(onVisitClick = onVisitClick)
                BottomTab.Completed -> CompletedVisitsScreen(onVisitClick = onVisitClick)
                BottomTab.Profile -> ProfileScreen(onLogoutComplete = onLogout)
            }
        }
    }
}
