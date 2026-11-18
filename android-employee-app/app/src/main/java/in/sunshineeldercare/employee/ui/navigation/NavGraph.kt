package `in`.sunshineeldercare.employee.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import `in`.sunshineeldercare.employee.SunshineEmployeeApp
import `in`.sunshineeldercare.employee.ui.screens.auth.ActivationScreen
import `in`.sunshineeldercare.employee.ui.screens.auth.LoginScreen
import `in`.sunshineeldercare.employee.ui.screens.detail.VisitDetailScreen

@Composable
fun NavGraph(
    navController: NavHostController,
    startDestination: String = if (SunshineEmployeeApp.instance.tokenManager.isLoggedIn) {
        Screen.Main.route
    } else {
        Screen.Login.route
    }
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                },
                onNavigateToActivation = {
                    navController.navigate(Screen.Activation.route)
                }
            )
        }

        composable(Screen.Activation.route) {
            ActivationScreen(
                onNavigateBack = {
                    navController.popBackStack()
                },
                onActivationComplete = {
                    navController.navigate(Screen.Main.route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Main.route) {
            MainScreen(
                onVisitClick = { visitId ->
                    navController.navigate(Screen.VisitDetail.createRoute(visitId))
                },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Main.route) { inclusive = true }
                    }
                }
            )
        }

        composable(
            route = Screen.VisitDetail.route,
            arguments = listOf(
                navArgument("visitId") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val visitId = backStackEntry.arguments?.getString("visitId").orEmpty()
            VisitDetailScreen(
                visitId = visitId,
                onNavigateBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}
