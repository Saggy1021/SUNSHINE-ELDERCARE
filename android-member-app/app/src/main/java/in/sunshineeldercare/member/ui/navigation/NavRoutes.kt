package `in`.sunshineeldercare.member.ui.navigation

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object Activation : Screen("activation")
    object LocationOnboarding : Screen("location_onboarding")
    object Dashboard : Screen("dashboard")
    object Care : Screen("care")
    object Documents : Screen("documents")
    object Profile : Screen("profile")
    object Renew : Screen("renew")
}
