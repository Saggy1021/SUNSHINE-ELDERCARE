package `in`.sunshineeldercare.employee

import `in`.sunshineeldercare.employee.ui.navigation.BottomTab
import org.junit.Assert.*
import org.junit.Test

class BottomNavigationRegressionTest {

    @Test
    fun testAllTabsAreNonNullWhenAccessedDirectlyOrViaItems() {
        // Access Home first to verify circular initialization resolution
        val homeDirect = BottomTab.Home
        assertNotNull("BottomTab.Home must not be null", homeDirect)

        val items = BottomTab.items
        assertEquals("Bottom navigation must have exactly 5 tabs", 5, items.size)
        assertEquals(5, items.filterNotNull().size)

        items.forEachIndexed { index, tab ->
            assertNotNull("Tab at index $index must not be null", tab)
            assertTrue("Tab route at index $index must not be blank", tab.route.isNotBlank())
            assertTrue("Tab title at index $index must not be blank", tab.title.isNotBlank())
            assertNotNull("Tab selectedIcon must not be null", tab.selectedIcon)
            assertNotNull("Tab unselectedIcon must not be null", tab.unselectedIcon)
        }
    }

    @Test
    fun testAllTabsHaveUniqueAndNonEmptyRoutes() {
        val items = BottomTab.items
        val routes = items.map { it.route }
        assertEquals(5, routes.size)
        assertEquals("All bottom tab routes must be unique", 5, routes.distinct().size)

        val expectedRoutes = setOf("tab_home", "tab_today", "tab_upcoming", "tab_completed", "tab_profile")
        assertEquals(expectedRoutes, routes.toSet())
    }

    @Test
    fun testFromRouteWithValidRoutes() {
        assertSame(BottomTab.Home, BottomTab.fromRoute("tab_home"))
        assertSame(BottomTab.Today, BottomTab.fromRoute("tab_today"))
        assertSame(BottomTab.Upcoming, BottomTab.fromRoute("tab_upcoming"))
        assertSame(BottomTab.Completed, BottomTab.fromRoute("tab_completed"))
        assertSame(BottomTab.Profile, BottomTab.fromRoute("tab_profile"))

        // Case-insensitive matching
        assertSame(BottomTab.Home, BottomTab.fromRoute("TAB_HOME"))
        assertSame(BottomTab.Today, BottomTab.fromRoute("Tab_Today"))
    }

    @Test
    fun testFromRouteWithInvalidOrUnknownRoutesDefaultsToHome() {
        assertSame("Null route must default safely to Home", BottomTab.Home, BottomTab.fromRoute(null))
        assertSame("Empty route must default safely to Home", BottomTab.Home, BottomTab.fromRoute(""))
        assertSame("Whitespace route must default safely to Home", BottomTab.Home, BottomTab.fromRoute("   "))
        assertSame("Unknown route must default safely to Home", BottomTab.Home, BottomTab.fromRoute("non_existent_route"))
        assertSame("Corrupted route must default safely to Home", BottomTab.Home, BottomTab.fromRoute("/admin/unknown"))
    }

    @Test
    fun testNavigationStateRestoration() {
        // Simulate navigation state restoration: saving route and restoring tab
        val initialTab = BottomTab.Upcoming
        val savedStateRoute = initialTab.route

        val restoredTab = BottomTab.fromRoute(savedStateRoute)
        assertSame(BottomTab.Upcoming, restoredTab)
        assertEquals("Upcoming", restoredTab.title)
    }

    @Test
    fun testNoNullReachesRenderingPipeline() {
        val rawTabs: List<BottomTab?> = BottomTab.items
        val safeTabs = rawTabs.filterNotNull().filter { it.route.isNotBlank() }

        assertEquals(5, safeTabs.size)
        for (tab in safeTabs) {
            // Emulate BottomNavBar lambda execution
            val route = tab.route
            assertNotNull(route)
            assertTrue(route.isNotEmpty())

            val isSelectedForHome = "tab_home" == route
            val isSelectedForInvalid = "invalid_route" == route

            assertFalse(isSelectedForInvalid)
        }
    }
}
