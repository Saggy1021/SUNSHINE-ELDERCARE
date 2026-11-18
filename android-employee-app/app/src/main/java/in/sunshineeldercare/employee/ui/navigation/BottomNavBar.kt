package `in`.sunshineeldercare.employee.ui.navigation

import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import `in`.sunshineeldercare.employee.ui.theme.DeepNavy
import `in`.sunshineeldercare.employee.ui.theme.Slate400
import `in`.sunshineeldercare.employee.ui.theme.Slate600

@Composable
fun BottomNavBar(
    currentRoute: String,
    onTabSelected: (BottomTab) -> Unit
) {
    val tabs = remember {
        BottomTab.items.filterNotNull().filter { it.route.isNotBlank() }
    }

    NavigationBar(
        containerColor = Color.White,
        tonalElevation = 8.dp
    ) {
        tabs.forEach { tab ->
            val isSelected = currentRoute.isNotBlank() && currentRoute == tab.route

            NavigationBarItem(
                selected = isSelected,
                onClick = { onTabSelected(tab) },
                icon = {
                    Icon(
                        imageVector = if (isSelected) tab.selectedIcon else tab.unselectedIcon,
                        contentDescription = tab.title,
                        tint = if (isSelected) DeepNavy else Slate400
                    )
                },
                label = {
                    Text(
                        text = tab.title,
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) DeepNavy else Slate600
                        )
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = Color(0xFFF1F5F9),
                    selectedIconColor = DeepNavy,
                    unselectedIconColor = Slate400
                )
            )
        }
    }
}
