package `in`.sunshineeldercare.member.ui.screens.activation

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.sunshineeldercare.member.ui.theme.*

@Composable
fun MemberActivationScreen(
    onActivationComplete: () -> Unit,
    onBackToLogin: () -> Unit,
    viewModel: MemberActivationViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    Scaffold(
        containerColor = IvoryBackground,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBackToLogin) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back to Sign In",
                        tint = NavyDark
                    )
                }
                Text(
                    text = "First-Time Member Activation",
                    style = MaterialTheme.typography.titleMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = NavyDark
                    )
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Step Progress Indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StepIndicator(step = 1, currentStep = when (uiState.step) {
                    MemberActivationStep.ENTER_ID -> 1
                    MemberActivationStep.ENTER_OTP -> 2
                    MemberActivationStep.SET_PASSWORD, MemberActivationStep.COMPLETE -> 3
                }, label = "Member ID")
                HorizontalDivider(modifier = Modifier.width(36.dp), color = BorderSubtle)
                StepIndicator(step = 2, currentStep = when (uiState.step) {
                    MemberActivationStep.ENTER_ID -> 1
                    MemberActivationStep.ENTER_OTP -> 2
                    MemberActivationStep.SET_PASSWORD, MemberActivationStep.COMPLETE -> 3
                }, label = "OTP")
                HorizontalDivider(modifier = Modifier.width(36.dp), color = BorderSubtle)
                StepIndicator(step = 3, currentStep = when (uiState.step) {
                    MemberActivationStep.ENTER_ID -> 1
                    MemberActivationStep.ENTER_OTP -> 2
                    MemberActivationStep.SET_PASSWORD, MemberActivationStep.COMPLETE -> 3
                }, label = "Password")
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Main Activation Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = CardBackground),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Feedback Messages
                    if (uiState.errorMessage != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = Color(0xFFFEF2F2),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 16.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.Error, contentDescription = null, tint = SosRed, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = uiState.errorMessage!!,
                                    color = SosRed,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }

                    if (uiState.successMessage != null) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = EmeraldBg,
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFA7F3D0)),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 16.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = EmeraldActive, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = uiState.successMessage!!,
                                    color = EmeraldActive,
                                    fontSize = 13.sp
                                )
                            }
                        }
                    }

                    when (uiState.step) {
                        MemberActivationStep.ENTER_ID -> {
                            Text(
                                text = "Enter Your Member ID",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = NavyDark
                                )
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Enter your canonical Sunshine Eldercare Member ID (e.g. SECD1001PRTY) provided on your membership receipt or welcome email.",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = TextSecondary,
                                    textAlign = TextAlign.Center
                                )
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            OutlinedTextField(
                                value = uiState.memberId,
                                onValueChange = { viewModel.onMemberIdChange(it) },
                                label = { Text("Canonical Member ID") },
                                placeholder = { Text("e.g. SECD1001PRTY") },
                                leadingIcon = {
                                    Icon(Icons.Default.Badge, contentDescription = null, tint = GoldPrimary)
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                                keyboardActions = KeyboardActions(onNext = { viewModel.requestOtp() }),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = NavyDark,
                                    focusedLabelColor = NavyDark,
                                    cursorColor = NavyDark
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(24.dp))

                            Button(
                                onClick = { viewModel.requestOtp() },
                                enabled = !uiState.isLoading && uiState.memberId.isNotBlank(),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = NavyDark),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                if (uiState.isLoading) {
                                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                                } else {
                                    Text("Send Verification OTP", fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        MemberActivationStep.ENTER_OTP -> {
                            Text(
                                text = "Verify Your Email",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = NavyDark
                                )
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "A 6-digit one-time code was sent to ${uiState.maskedEmail ?: "your registered email"}. Enter it below:",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = TextSecondary,
                                    textAlign = TextAlign.Center
                                )
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            OutlinedTextField(
                                value = uiState.otp,
                                onValueChange = { viewModel.onOtpChange(it) },
                                label = { Text("6-Digit OTP") },
                                placeholder = { Text("123456") },
                                leadingIcon = {
                                    Icon(Icons.Default.Pin, contentDescription = null, tint = GoldPrimary)
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Number,
                                    imeAction = ImeAction.Done
                                ),
                                keyboardActions = KeyboardActions(onDone = { viewModel.verifyOtp() }),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = NavyDark,
                                    focusedLabelColor = NavyDark,
                                    cursorColor = NavyDark
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(24.dp))

                            Button(
                                onClick = { viewModel.verifyOtp() },
                                enabled = !uiState.isLoading && uiState.otp.length == 6,
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = NavyDark),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                if (uiState.isLoading) {
                                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                                } else {
                                    Text("Verify & Continue", fontWeight = FontWeight.Bold)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            TextButton(
                                onClick = { viewModel.requestOtp() },
                                enabled = !uiState.isLoading
                            ) {
                                Text("Resend Verification OTP", color = GoldPrimary, fontWeight = FontWeight.SemiBold)
                            }
                        }

                        MemberActivationStep.SET_PASSWORD -> {
                            Text(
                                text = "Create Your Password",
                                style = MaterialTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = NavyDark
                                )
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Choose a strong password (minimum 8 characters) to sign in to your Sunshine Member account in the future.",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = TextSecondary,
                                    textAlign = TextAlign.Center
                                )
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            OutlinedTextField(
                                value = uiState.newPassword,
                                onValueChange = { viewModel.onNewPasswordChange(it) },
                                label = { Text("New Password") },
                                leadingIcon = {
                                    Icon(Icons.Default.Lock, contentDescription = null, tint = TextMuted)
                                },
                                trailingIcon = {
                                    IconButton(onClick = { viewModel.togglePasswordVisibility() }) {
                                        Icon(
                                            imageVector = if (uiState.isPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = null,
                                            tint = TextMuted
                                        )
                                    }
                                },
                                visualTransformation = if (uiState.isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Password,
                                    imeAction = ImeAction.Next
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = NavyDark,
                                    focusedLabelColor = NavyDark,
                                    cursorColor = NavyDark
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = uiState.confirmPassword,
                                onValueChange = { viewModel.onConfirmPasswordChange(it) },
                                label = { Text("Confirm Password") },
                                leadingIcon = {
                                    Icon(Icons.Default.Lock, contentDescription = null, tint = TextMuted)
                                },
                                trailingIcon = {
                                    IconButton(onClick = { viewModel.togglePasswordVisibility() }) {
                                        Icon(
                                            imageVector = if (uiState.isPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = null,
                                            tint = TextMuted
                                        )
                                    }
                                },
                                visualTransformation = if (uiState.isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Password,
                                    imeAction = ImeAction.Done
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = NavyDark,
                                    focusedLabelColor = NavyDark,
                                    cursorColor = NavyDark
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(24.dp))

                            Button(
                                onClick = { viewModel.setPassword(onActivationComplete) },
                                enabled = !uiState.isLoading && uiState.newPassword.length >= 8 && uiState.newPassword == uiState.confirmPassword,
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = NavyDark),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                if (uiState.isLoading) {
                                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                                } else {
                                    Text("Activate Account & Sign In", fontWeight = FontWeight.Bold)
                                }
                            }
                        }

                        MemberActivationStep.COMPLETE -> {
                            Text(
                                text = "Account Activated!",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = EmeraldActive
                                )
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            TextButton(onClick = onBackToLogin) {
                Text(
                    text = "Already have a password? Sign In",
                    color = NavyDark,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
    }
}

@Composable
private fun StepIndicator(
    step: Int,
    currentStep: Int,
    label: String
) {
    val isPastOrCurrent = currentStep >= step
    val isCurrent = currentStep == step

    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(
                    if (isCurrent) NavyDark else if (isPastOrCurrent) GoldPrimary else BorderSubtle
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = step.toString(),
                color = if (isPastOrCurrent) Color.White else TextSecondary,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 11.sp,
                color = if (isCurrent) NavyDark else TextSecondary,
                fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal
            )
        )
    }
}
