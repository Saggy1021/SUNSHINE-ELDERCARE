package `in`.sunshineeldercare.member.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import `in`.sunshineeldercare.member.data.security.SecureSessionManager
import `in`.sunshineeldercare.member.ui.components.BottomNavBar
import `in`.sunshineeldercare.member.ui.components.MemberDrawerContent
import `in`.sunshineeldercare.member.ui.components.MobileTopAppBar
import `in`.sunshineeldercare.member.ui.screens.activation.MemberActivationScreen
import `in`.sunshineeldercare.member.ui.screens.care.CareScreen
import `in`.sunshineeldercare.member.ui.screens.dashboard.DashboardScreen
import `in`.sunshineeldercare.member.ui.screens.documents.DocumentsScreen
import `in`.sunshineeldercare.member.ui.screens.login.LoginScreen
import `in`.sunshineeldercare.member.ui.screens.onboarding.LocationOnboardingScreen
import `in`.sunshineeldercare.member.ui.screens.onboarding.isOnboardingCompleted
import `in`.sunshineeldercare.member.ui.screens.profile.ProfileScreen
import `in`.sunshineeldercare.member.ui.screens.renew.RenewScreen
import `in`.sunshineeldercare.member.ui.screens.splash.SplashScreen
import kotlinx.coroutines.launch

@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController()
) {
    val context = LocalContext.current
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route ?: Screen.Splash.route

    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    val unadornedRoutes = listOf(
        Screen.Splash.route,
        Screen.Login.route,
        Screen.Activation.route,
        Screen.LocationOnboarding.route
    )
    val showChrome = currentRoute !in unadornedRoutes

    fun navigateAfterAuth() {
        val dest = if (!isOnboardingCompleted(context)) {
            Screen.LocationOnboarding.route
        } else {
            Screen.Dashboard.route
        }
        navController.navigate(dest) {
            popUpTo(Screen.Login.route) { inclusive = true }
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = showChrome,
        drawerContent = {
            if (showChrome) {
                MemberDrawerContent(
                    memberName = SecureSessionManager.getMemberName() ?: "Sunshine Member",
                    memberId = SecureSessionManager.getMemberId() ?: "SEC/MEMBER",
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(Screen.Dashboard.route) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    onLogout = {
                        SecureSessionManager.clearSession()
                        scope.launch { drawerState.close() }
                        navController.navigate(Screen.Login.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onClose = { scope.launch { drawerState.close() } }
                )
            }
        }
    ) {
        Scaffold(
            topBar = {
                if (showChrome) {
                    MobileTopAppBar(
                        onMenuClick = { scope.launch { drawerState.open() } }
                    )
                }
            },
            bottomBar = {
                if (showChrome) {
                    BottomNavBar(
                        currentRoute = currentRoute,
                        onNavigate = { route ->
                            navController.navigate(route) {
                                popUpTo(Screen.Dashboard.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }
            }
        ) { innerPadding ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(if (showChrome) innerPadding else PaddingValues(0.dp))
            ) {
                NavHost(
                    navController = navController,
                    startDestination = Screen.Splash.route
                ) {
                    composable(Screen.Splash.route) {
                        SplashScreen(
                            onNavigateToDashboard = {
                                navigateAfterAuth()
                            },
                            onNavigateToLogin = {
                                navController.navigate(Screen.Login.route) {
                                    popUpTo(Screen.Splash.route) { inclusive = true }
                                }
                            }
                        )
                    }
                    composable(Screen.Login.route) {
                        LoginScreen(
                            onLoginSuccess = {
                                navigateAfterAuth()
                            },
                            onNavigateToActivation = {
                                navController.navigate(Screen.Activation.route)
                            }
                        )
                    }
                    composable(Screen.Activation.route) {
                        MemberActivationScreen(
                            onActivationComplete = {
                                navigateAfterAuth()
                            },
                            onBackToLogin = {
                                navController.popBackStack()
                            }
                        )
                    }
                    composable(Screen.LocationOnboarding.route) {
                        LocationOnboardingScreen(
                            onContinue = {
                                navController.navigate(Screen.Dashboard.route) {
                                    popUpTo(Screen.LocationOnboarding.route) { inclusive = true }
                                }
                            }
                        )
                    }
                    composable(Screen.Dashboard.route) {
                        DashboardScreen(
                            onNavigate = { route -> navController.navigate(route) }
                        )
                    }
                    composable(Screen.Care.route) {
                        CareScreen()
                    }
                    composable(Screen.Documents.route) {
                        DocumentsScreen()
                    }
                    composable(Screen.Profile.route) {
                        ProfileScreen(
                            onLoggedOut = {
                                navController.navigate(Screen.Login.route) {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                        )
                    }
                    composable(Screen.Renew.route) {
                        RenewScreen()
                    }
                }
            }
        }
    }
}
