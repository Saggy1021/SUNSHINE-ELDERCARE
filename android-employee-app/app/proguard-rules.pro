# Proguard rules for Sunshine Employee App
-keepattributes *Annotation*
-keepclassmembers class * {
    @org.jetbrains.annotations.Nullable *;
    @org.jetbrains.annotations.NotNull *;
}
-keep class in.sunshineeldercare.employee.data.remote.model.** { *; }
-keep class in.sunshineeldercare.employee.data.local.entity.** { *; }
