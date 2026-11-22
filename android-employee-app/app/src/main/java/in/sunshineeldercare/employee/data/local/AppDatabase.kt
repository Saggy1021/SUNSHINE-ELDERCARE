package `in`.sunshineeldercare.employee.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import `in`.sunshineeldercare.employee.data.local.dao.VisitDao
import `in`.sunshineeldercare.employee.data.local.entity.VisitEntity

@Database(entities = [VisitEntity::class], version = 3, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {

    abstract fun visitDao(): VisitDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "sunshine_employee_db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }

        fun clearDatabase(context: Context) {
            try {
                val db = getInstance(context)
                db.clearAllTables()
            } catch (_: Throwable) {
                try {
                    context.deleteDatabase("sunshine_employee_db")
                } catch (_: Throwable) {}
            }
        }
    }
}
