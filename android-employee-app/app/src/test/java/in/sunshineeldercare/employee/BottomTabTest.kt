package `in`.sunshineeldercare.employee

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import `in`.sunshineeldercare.employee.ui.navigation.BottomTab
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class BottomTabTest {
    @Test
    fun testBottomTabInitializationAndIcons() {
        val items = BottomTab.items
        assertEquals(5, items.size)
        items.forEach { tab ->
            println("Testing tab: ${tab.title}")
            assertNotNull("selectedIcon must not be null for ${tab.title}", tab.selectedIcon)
            assertNotNull("unselectedIcon must not be null for ${tab.title}", tab.unselectedIcon)
            println("Tab ${tab.title} icons: ${tab.selectedIcon.name}, ${tab.unselectedIcon.name}")
        }
    }

    @Test
    fun testHomeScreenIcons() {
        assertNotNull(Icons.Default.Refresh)
        assertNotNull(Icons.Default.AccessTime)
        assertNotNull(Icons.Default.LocationOn)
        assertNotNull(Icons.Default.CheckCircle)
        assertNotNull(Icons.Default.CalendarToday)
        assertNotNull(Icons.Default.Schedule)
    }
}
