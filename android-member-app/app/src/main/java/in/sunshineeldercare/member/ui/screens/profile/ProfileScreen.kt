package `in`.sunshineeldercare.member.ui.screens.profile

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.filled.CardMembership
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Save
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.sunshineeldercare.member.ui.theme.BorderGold
import `in`.sunshineeldercare.member.ui.theme.CardBackground
import `in`.sunshineeldercare.member.ui.theme.EmeraldActive
import `in`.sunshineeldercare.member.ui.theme.EmeraldBg
import `in`.sunshineeldercare.member.ui.theme.GoldLight
import `in`.sunshineeldercare.member.ui.theme.GoldPrimary
import `in`.sunshineeldercare.member.ui.theme.IvoryBackground
import `in`.sunshineeldercare.member.ui.theme.NavyDark
import `in`.sunshineeldercare.member.ui.theme.SosRed
import `in`.sunshineeldercare.member.ui.theme.TextMuted
import `in`.sunshineeldercare.member.ui.theme.TextPrimary
import `in`.sunshineeldercare.member.ui.theme.TextSecondary
import `in`.sunshineeldercare.member.ui.theme.navyButtonColors
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

private const val FORGOT_PASSWORD_URL = "https://www.sunshineeldercare.in/forgot-password"

@Composable
fun ProfileScreen(
    onLoggedOut: () -> Unit,
    viewModel: ProfileViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    var isEditingContact by remember { mutableStateOf(false) }
    var isEditingCare by remember { mutableStateOf(false) }

    // Contact form fields
    var phone by remember { mutableStateOf("") }
    var alternatePhone by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var landmark by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }

    // Care form fields
    var bloodGroup by remember { mutableStateOf("") }
    var medicalConditions by remember { mutableStateOf("") }
    var hospital by remember { mutableStateOf("") }
    var emergencyName by remember { mutableStateOf("") }
    var emergencyPhone by remember { mutableStateOf("") }
    var emergencyRelation by remember { mutableStateOf("") }

    LaunchedEffect(state.profile) {
        state.profile?.let { p ->
            phone = p.phone
            alternatePhone = p.alternatePhone
            address = p.addressLine1
            landmark = p.nearestLandmark
            city = p.city
            bloodGroup = p.bloodGroup
            medicalConditions = p.medicalConditions
            hospital = p.hospitalPreference
            emergencyName = p.emergencyContactName
            emergencyPhone = p.emergencyContactPhone
            emergencyRelation = p.emergencyContactRelation
        }
    }

    LaunchedEffect(state.isLoggedOut) {
        if (state.isLoggedOut) {
            onLoggedOut()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(IvoryBackground)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Text(
                text = "PERSONAL MEMBERSHIP FILE",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = GoldPrimary,
                letterSpacing = 1.sp
            )

            Text(
                text = "Member Profile",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Serif,
                color = NavyDark
            )

            Text(
                text = "Authoritative membership records, contact details and registered emergency information. Saved changes synchronize directly with Sunshine Eldercare.",
                fontSize = 12.sp,
                color = TextSecondary,
                lineHeight = 16.sp
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Success Confirmation Banner
            state.saveMessage?.let { msg ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(EmeraldBg)
                        .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = EmeraldActive,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = msg,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = EmeraldActive
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Error Alert Banner
            state.error?.let { err ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFFEF2F2))
                        .border(1.dp, Color(0xFFFECACA), RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = null,
                            tint = SosRed,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = err,
                            fontSize = 12.sp,
                            color = SosRed,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // ==========================================
            // CARD 1: MEMBER IDENTITY & MEMBERSHIP
            // ==========================================
            val profile = state.profile
            val salutation = profile?.salutation?.trim()?.ifEmpty { "Mr" } ?: "Mr"
            val fullName = profile?.let {
                val combined = listOf(it.salutation, it.firstName, it.lastName)
                    .filter { s -> s.isNotBlank() }
                    .joinToString(" ")
                    .trim()
                if (combined.isNotBlank()) combined else it.name.ifBlank { "Sunshine Member" }
            } ?: "Sunshine Member"

            val memberId = profile?.memberId?.ifBlank { "SECD1000TAAM" } ?: "SECD1000TAAM"
            val registeredEmail = profile?.email?.trim()?.ifBlank { "Not provided" } ?: "Not provided"

            val initials = fullName
                .split(" ")
                .filter { it.isNotBlank() }
                .take(2)
                .mapNotNull { it.firstOrNull()?.uppercaseChar() }
                .joinToString("")
                .ifEmpty { "SM" }

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(54.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(NavyDark)
                                .border(1.5.dp, GoldPrimary, RoundedCornerShape(14.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = initials,
                                color = GoldLight,
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Serif
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = fullName,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Bold,
                                color = NavyDark
                            )

                            Spacer(modifier = Modifier.height(2.dp))

                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .clickable {
                                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                        val clip = ClipData.newPlainText("Member ID", memberId)
                                        clipboard.setPrimaryClip(clip)
                                        Toast.makeText(context, "Member ID copied: $memberId", Toast.LENGTH_SHORT).show()
                                    }
                            ) {
                                Text(
                                    text = memberId,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    fontFamily = FontFamily.Monospace,
                                    color = GoldPrimary
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Icon(
                                    imageVector = Icons.Default.ContentCopy,
                                    contentDescription = "Copy Member ID",
                                    tint = GoldPrimary,
                                    modifier = Modifier.size(13.dp)
                                )
                            }

                            Spacer(modifier = Modifier.height(4.dp))

                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(EmeraldBg)
                                    .padding(horizontal = 8.dp, vertical = 2.dp)
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.Shield,
                                        contentDescription = null,
                                        tint = EmeraldActive,
                                        modifier = Modifier.size(11.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = "ACTIVE • Verified Member",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = EmeraldActive
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    HorizontalDivider(color = Color(0xFFF1F5F9))
                    Spacer(modifier = Modifier.height(10.dp))

                    ProfileItem(
                        label = "REGISTERED LOGIN EMAIL",
                        value = registeredEmail
                    )

                    val membershipName = profile?.membershipName?.ifBlank { "Shield Shine — Single (12 Months)" } ?: "Shield Shine — Single (12 Months)"
                    ProfileItem(
                        label = "MEMBERSHIP PLAN & TYPE",
                        value = membershipName
                    )

                    val formattedValidity = formatValidityDates(profile?.membershipStartDate, profile?.membershipEndDate)
                    ProfileItem(
                        label = "MEMBERSHIP VALIDITY DATES",
                        value = formattedValidity
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ==========================================
            // CARD 2: CONTACT DETAILS
            // ==========================================
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Phone,
                            contentDescription = null,
                            tint = GoldPrimary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "CONTACT DETAILS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = NavyDark,
                            letterSpacing = 0.5.sp,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedButton(
                            onClick = {
                                isEditingContact = !isEditingContact
                                if (isEditingContact) isEditingCare = false
                            },
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, GoldPrimary),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 2.dp)
                        ) {
                            Icon(
                                imageVector = if (isEditingContact) Icons.Default.Close else Icons.Default.Edit,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = NavyDark
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isEditingContact) "Cancel" else "Edit Contact",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = NavyDark
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (isEditingContact) {
                        OutlinedTextField(
                            value = phone,
                            onValueChange = { phone = it },
                            label = { Text("Primary Phone Number") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = alternatePhone,
                            onValueChange = { alternatePhone = it },
                            label = { Text("Alternate Phone Number (Optional)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = address,
                            onValueChange = { address = it },
                            label = { Text("Registered Service / Residential Address") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = landmark,
                            onValueChange = { landmark = it },
                            label = { Text("Nearest Landmark") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = city,
                            onValueChange = { city = it },
                            label = { Text("City") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Button(
                            onClick = {
                                viewModel.saveContactDetails(phone, alternatePhone, address, landmark, city)
                                isEditingContact = false
                            },
                            enabled = !state.isSaving,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = navyButtonColors()
                        ) {
                            if (state.isSaving) {
                                CircularProgressIndicator(
                                    color = Color.White,
                                    modifier = Modifier.size(18.dp),
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Default.Save,
                                    contentDescription = null,
                                    tint = GoldLight,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Save Contact Details to Sunshine",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    } else {
                        ProfileItem(
                            label = "PRIMARY MOBILE NUMBER",
                            value = profile?.phone?.ifBlank { null } ?: "Not provided"
                        )
                        ProfileItem(
                            label = "ALTERNATE MOBILE NUMBER",
                            value = profile?.alternatePhone?.ifBlank { null } ?: "Not provided"
                        )
                        ProfileItem(
                            label = "REGISTERED EMAIL",
                            value = registeredEmail
                        )
                        ProfileItem(
                            label = "COMPLETE SERVICE ADDRESS",
                            value = profile?.addressLine1?.ifBlank { null } ?: "Not provided"
                        )
                        ProfileItem(
                            label = "NEAREST LANDMARK",
                            value = profile?.nearestLandmark?.ifBlank { null } ?: "Not provided"
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ==========================================
            // CARD 3: CARE & EMERGENCY DETAILS
            // ==========================================
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.Favorite,
                            contentDescription = null,
                            tint = SosRed,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "CARE & EMERGENCY DETAILS",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = NavyDark,
                            letterSpacing = 0.5.sp,
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedButton(
                            onClick = {
                                isEditingCare = !isEditingCare
                                if (isEditingCare) isEditingContact = false
                            },
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, GoldPrimary),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 10.dp, vertical = 2.dp)
                        ) {
                            Icon(
                                imageVector = if (isEditingCare) Icons.Default.Close else Icons.Default.Edit,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = NavyDark
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (isEditingCare) "Cancel" else "Edit Care Details",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = NavyDark
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (isEditingCare) {
                        OutlinedTextField(
                            value = emergencyName,
                            onValueChange = { emergencyName = it },
                            label = { Text("Emergency Contact Name") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = emergencyPhone,
                            onValueChange = { emergencyPhone = it },
                            label = { Text("Emergency Contact Phone") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = emergencyRelation,
                            onValueChange = { emergencyRelation = it },
                            label = { Text("Relationship (e.g. Son, Daughter, Family)") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = hospital,
                            onValueChange = { hospital = it },
                            label = { Text("Preferred SOS Hospital") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = bloodGroup,
                            onValueChange = { bloodGroup = it },
                            label = { Text("Blood Group (e.g. O+, B+, A+)") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = medicalConditions,
                            onValueChange = { medicalConditions = it },
                            label = { Text("Medical Conditions & Allergies") },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NavyDark,
                                unfocusedBorderColor = BorderGold,
                                focusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp)
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Button(
                            onClick = {
                                viewModel.saveCareDetails(bloodGroup, medicalConditions, hospital, emergencyName, emergencyPhone, emergencyRelation)
                                isEditingCare = false
                            },
                            enabled = !state.isSaving,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = navyButtonColors()
                        ) {
                            if (state.isSaving) {
                                CircularProgressIndicator(
                                    color = Color.White,
                                    modifier = Modifier.size(18.dp),
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Default.Save,
                                    contentDescription = null,
                                    tint = GoldLight,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Save Care Details to Sunshine",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    } else {
                        val emergencySummary = if (!profile?.emergencyContactName.isNullOrBlank()) {
                            val contactParts = mutableListOf<String>()
                            contactParts.add(profile!!.emergencyContactName)
                            if (profile.emergencyContactPhone.isNotBlank()) {
                                contactParts.add("(${profile.emergencyContactPhone})")
                            }
                            if (profile.emergencyContactRelation.isNotBlank()) {
                                contactParts.add("• ${profile.emergencyContactRelation}")
                            }
                            contactParts.joinToString(" ")
                        } else {
                            "Not provided"
                        }

                        ProfileItem(
                            label = "PRIMARY EMERGENCY CONTACT",
                            value = emergencySummary
                        )
                        ProfileItem(
                            label = "PREFERRED SOS HOSPITAL",
                            value = profile?.hospitalPreference?.ifBlank { null } ?: "Not provided"
                        )
                        ProfileItem(
                            label = "BLOOD GROUP",
                            value = profile?.bloodGroup?.ifBlank { null } ?: "Not provided"
                        )
                        ProfileItem(
                            label = "MEDICAL CONDITIONS & ALLERGIES",
                            value = profile?.medicalConditions?.ifBlank { null } ?: "Not provided"
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ==========================================
            // CARD 4: PASSWORD & SECURITY MANAGEMENT
            // ==========================================
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = null,
                            tint = NavyDark,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Password & Security Management",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = NavyDark
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Your password is tied to your verified Sunshine Eldercare account. To update credentials or security settings, access the official web security portal.",
                        fontSize = 11.sp,
                        color = TextSecondary,
                        lineHeight = 16.sp
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(FORGOT_PASSWORD_URL)).apply {
                                flags = Intent.FLAG_ACTIVITY_NEW_TASK
                            }
                            context.startActivity(intent)
                        },
                        colors = navyButtonColors(),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp)
                    ) {
                        Text(
                            text = "Change Password on Website",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.OpenInNew,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ==========================================
            // SIGN OUT BUTTON
            // ==========================================
            Button(
                onClick = { viewModel.logout() },
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFFFEF2F2),
                    contentColor = SosRed
                ),
                shape = RoundedCornerShape(14.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA)),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ExitToApp,
                    contentDescription = null,
                    tint = SosRed
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Sign Out of Member App",
                    color = SosRed,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
            }

            Spacer(modifier = Modifier.height(80.dp))
        }

        if (state.isLoading && state.profile == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = GoldPrimary)
            }
        }
    }
}

@Composable
private fun ProfileItem(label: String, value: String) {
    val isMissing = value.equals("Not provided", ignoreCase = true)
    Column(modifier = Modifier.padding(vertical = 5.dp)) {
        Text(
            text = label,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = TextSecondary,
            letterSpacing = 0.5.sp
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = value,
            fontSize = 13.sp,
            fontWeight = if (isMissing) FontWeight.Normal else FontWeight.SemiBold,
            color = if (isMissing) TextMuted else NavyDark
        )
        Spacer(modifier = Modifier.height(4.dp))
        HorizontalDivider(color = Color(0xFFF1F5F9))
    }
}

private fun formatValidityDates(startDate: String?, endDate: String?): String {
    if (startDate.isNullOrBlank() && endDate.isNullOrBlank()) {
        return "Not provided"
    }
    val inFormatter = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    val outFormatter = SimpleDateFormat("dd MMM yyyy", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("Asia/Kolkata")
    }

    val startStr = try {
        if (!startDate.isNullOrBlank()) {
            val clean = if (startDate.length >= 19) startDate.substring(0, 19) else startDate
            inFormatter.parse(clean)?.let { outFormatter.format(it) } ?: startDate
        } else null
    } catch (_: Exception) {
        startDate
    }

    val endStr = try {
        if (!endDate.isNullOrBlank()) {
            val clean = if (endDate.length >= 19) endDate.substring(0, 19) else endDate
            inFormatter.parse(clean)?.let { outFormatter.format(it) } ?: endDate
        } else null
    } catch (_: Exception) {
        endDate
    }

    return when {
        startStr != null && endStr != null -> "$startStr – $endStr"
        startStr != null -> "From $startStr"
        endStr != null -> "Until $endStr"
        else -> "Not provided"
    }
}
