package `in`.sunshineeldercare.employee.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import `in`.sunshineeldercare.employee.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivationScreen(
    onNavigateBack: () -> Unit,
    onActivationComplete: () -> Unit,
    viewModel: ActivationViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.step) {
        if (uiState.step == ActivationStep.COMPLETE) {
            onActivationComplete()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Employee Activation",
                        style = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                            color = DeepNavy
                        )
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = DeepNavy
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White
                )
            )
        },
        containerColor = Slate50
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Step Progress Indicator
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StepIndicator(step = 1, currentStep = uiState.step.ordinal + 1, label = "Employee ID")
                HorizontalDivider(modifier = Modifier.weight(1f).padding(horizontal = 8.dp), color = Slate200)
                StepIndicator(step = 2, currentStep = uiState.step.ordinal + 1, label = "OTP Verify")
                HorizontalDivider(modifier = Modifier.weight(1f).padding(horizontal = 8.dp), color = Slate200)
                StepIndicator(step = 3, currentStep = uiState.step.ordinal + 1, label = "Set Password")
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Error Message
            if (!uiState.errorMessage.isNullOrBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(StatusCancelledBg)
                        .padding(12.dp)
                ) {
                    Text(
                        text = uiState.errorMessage!!,
                        color = StatusCancelled,
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Success Message
            if (!uiState.successMessage.isNullOrBlank()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(StatusCompletedBg)
                        .padding(12.dp)
                ) {
                    Text(
                        text = uiState.successMessage!!,
                        color = StatusCompleted,
                        style = MaterialTheme.typography.bodySmall.copy(fontWeight = FontWeight.Medium)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Step Content
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp)
                ) {
                    when (uiState.step) {
                        ActivationStep.ENTER_ID -> {
                            Text(
                                text = "Step 1: Enter Employee ID",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = DeepNavy
                                )
                            )
                            Text(
                                text = "Provide your assigned Employee ID (e.g. SEC185TAAM). A one-time verification code will be sent to your registered email.",
                                style = MaterialTheme.typography.bodySmall.copy(color = Slate500),
                                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                            )

                            OutlinedTextField(
                                value = uiState.employeeId,
                                onValueChange = { viewModel.onEmployeeIdChange(it) },
                                label = { Text("Employee ID") },
                                placeholder = { Text("e.g. SEC185TAAM") },
                                leadingIcon = {
                                    Icon(Icons.Default.Badge, contentDescription = null, tint = Slate400)
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Text,
                                    imeAction = ImeAction.Done
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = DeepNavy,
                                    focusedLabelColor = DeepNavy,
                                    cursorColor = DeepNavy
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = { viewModel.requestOtp() },
                                enabled = !uiState.isLoading && uiState.employeeId.isNotBlank(),
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = DeepNavy),
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

                        ActivationStep.ENTER_OTP -> {
                            Text(
                                text = "Step 2: Enter Verification Code",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = DeepNavy
                                )
                            )
                            Text(
                                text = "Enter the 6-digit OTP sent to your registered email (${uiState.maskedEmail ?: "email"}).",
                                style = MaterialTheme.typography.bodySmall.copy(color = Slate500),
                                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                            )

                            OutlinedTextField(
                                value = uiState.otp,
                                onValueChange = { viewModel.onOtpChange(it) },
                                label = { Text("6-Digit OTP") },
                                placeholder = { Text("123456") },
                                leadingIcon = {
                                    Icon(Icons.Default.Pin, contentDescription = null, tint = Slate400)
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Number,
                                    imeAction = ImeAction.Done
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = DeepNavy,
                                    focusedLabelColor = DeepNavy,
                                    cursorColor = DeepNavy
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = { viewModel.verifyOtp() },
                                enabled = !uiState.isLoading && uiState.otp.length == 6,
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = DeepNavy),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                            ) {
                                if (uiState.isLoading) {
                                    CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
                                } else {
                                    Text("Verify OTP", fontWeight = FontWeight.Bold)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            TextButton(
                                onClick = { viewModel.resetToStep1() },
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            ) {
                                Text("Re-enter Employee ID or Resend OTP", color = Slate600)
                            }
                        }

                        ActivationStep.SET_PASSWORD -> {
                            Text(
                                text = "Step 3: Create Secure Password",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = DeepNavy
                                )
                            )
                            Text(
                                text = "Create a password of at least 8 characters. You will use this password and your Employee ID for future logins.",
                                style = MaterialTheme.typography.bodySmall.copy(color = Slate500),
                                modifier = Modifier.padding(top = 4.dp, bottom = 16.dp)
                            )

                            OutlinedTextField(
                                value = uiState.newPassword,
                                onValueChange = { viewModel.onNewPasswordChange(it) },
                                label = { Text("New Password") },
                                leadingIcon = {
                                    Icon(Icons.Default.Lock, contentDescription = null, tint = Slate400)
                                },
                                visualTransformation = if (uiState.isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Password,
                                    imeAction = ImeAction.Next
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = DeepNavy,
                                    focusedLabelColor = DeepNavy,
                                    cursorColor = DeepNavy
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            OutlinedTextField(
                                value = uiState.confirmPassword,
                                onValueChange = { viewModel.onConfirmPasswordChange(it) },
                                label = { Text("Confirm Password") },
                                leadingIcon = {
                                    Icon(Icons.Default.Lock, contentDescription = null, tint = Slate400)
                                },
                                trailingIcon = {
                                    IconButton(onClick = { viewModel.togglePasswordVisibility() }) {
                                        Icon(
                                            imageVector = if (uiState.isPasswordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                            contentDescription = null,
                                            tint = Slate400
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
                                    focusedBorderColor = DeepNavy,
                                    focusedLabelColor = DeepNavy,
                                    cursorColor = DeepNavy
                                ),
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            Button(
                                onClick = { viewModel.setPassword() },
                                enabled = !uiState.isLoading && uiState.newPassword.length >= 8 && uiState.newPassword == uiState.confirmPassword,
                                shape = RoundedCornerShape(10.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = DeepNavy),
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

                        ActivationStep.COMPLETE -> {
                            Text(
                                text = "Account Activated!",
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = StatusCompleted
                                )
                            )
                        }
                    }
                }
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
                .clip(RoundedCornerShape(14.dp))
                .background(
                    if (isCurrent) DeepNavy else if (isPastOrCurrent) GoldPrimary else Slate200
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = step.toString(),
                color = if (isPastOrCurrent) Color.White else Slate600,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall.copy(
                fontSize = 10.sp,
                color = if (isCurrent) DeepNavy else Slate500,
                fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal
            )
        )
    }
}
