# Sunshine Eldercare Member App ProGuard Rules
-keepattributes *Annotation*
-keepclassmembers class * {
    @org.jetbrains.annotations.* <fields>;
    @org.jetbrains.annotations.* <methods>;
}
-keepclassmembers class in.sunshineeldercare.member.data.model.** { *; }

