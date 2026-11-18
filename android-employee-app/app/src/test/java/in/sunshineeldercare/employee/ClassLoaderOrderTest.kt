package `in`.sunshineeldercare.employee

import `in`.sunshineeldercare.employee.ui.navigation.BottomTab
import org.junit.Test

class ClassLoaderOrderTest {
    @Test
    fun testHomeFirstLoading() {
        // Access Home first, exactly like MainScreen does
        val home = BottomTab.Home
        println("Home accessed: $home")
        val items = BottomTab.items
        println("Items after Home: $items")
        for ((index, item) in items.withIndex()) {
            println("Item $index: $item")
        }
    }
}
