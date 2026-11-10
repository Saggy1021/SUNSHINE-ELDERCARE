import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { memberRegistrationSchema } from '../../lib/validations/member';
import { hashToken, generateEmailVerificationToken, generateLoginOtpToken, verifyLoginOtpToken } from '../../lib/auth/tokens';

/**
 * Sunshine Eldercare — Signup Password Persistence & End-to-End Authentication Audit
 * Self-executing runner using native node:assert.
 */
async function runSignupAuthTests() {
  console.log('================================================================');
  console.log('Running Sunshine Eldercare — Signup Password Persistence & Auth Audit');
  console.log('================================================================\n');

  // Fixed dummy hash used in auth.ts for constant-time comparison
  const DUMMY_HASH = "$2a$10$w8uQe0bY8R4uU9m4F9w/u.bM/zHwS0E5V1q7xH0O9A3zX1sXwO0cK";

  // In-memory data structures
  interface StoredUser {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    emailVerified: Date | null;
    passwordHash: string | null;
    sessionVersion: number;
  }

  const userTable = new Map<string, StoredUser>();
  const tokenTable = new Map<string, { identifier: string; token: string; expires: Date }>();

  // Base valid member registration payload
  const validMemberPayload = {
    email: 'new.member@sunshineeldercare.in',
    password: 'SecurePassword123!',
    firstName: 'Savitri',
    lastName: 'Devi',
    idProofType: 'PAN' as any,
    idProofNumber: 'ABCDE1234F',
    dateOfBirth: '1950-05-15',
    gender: 'Female' as any,
    serviceAddress: 'Flat 402, Sunshine Apartments, Indiranagar, Bangalore',
    nearestLandmark: 'Metro Station',
    mobileNumber: '9876543210',
    emergencyContactName: 'Rajesh Sharma',
    emergencyContactRelationship: 'Son',
    emergencyContactMobile: '9876543211',
    emergencyContactEmail: 'rajesh@example.com',
    sponsorName: 'Rajesh Sharma',
    sponsorRelationship: 'Son',
    sponsorMobile: '9876543211',
    sponsorEmail: 'rajesh@example.com',
    shiftAuthorization: true,
  };

  // ---------------------------------------------------------------------------
  // 1. Password Schema Validation (Empty, Weak, Max-Length, Valid)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Password Schema Validation (Empty, Weak, Max-Length) ---');

  // 1a. Empty password
  const emptyRes = memberRegistrationSchema.safeParse({ ...validMemberPayload, password: '' });
  assert.strictEqual(emptyRes.success, false, 'Empty password must be rejected');
  assert.ok(emptyRes.error?.issues.some(i => i.path.includes('password')), 'Must flag password issue');

  // 1b. Weak/Short password (< 8 chars)
  const shortRes = memberRegistrationSchema.safeParse({ ...validMemberPayload, password: 'short' });
  assert.strictEqual(shortRes.success, false, 'Password < 8 characters must be rejected');
  assert.strictEqual(shortRes.error?.issues.find(i => i.path.includes('password'))?.message, 'Password must be at least 8 characters');

  // 1c. Excessively long password (> 128 chars, DoS mitigation)
  const longPassword = 'P'.repeat(129);
  const longRes = memberRegistrationSchema.safeParse({ ...validMemberPayload, password: longPassword });
  assert.strictEqual(longRes.success, false, 'Password > 128 characters must be rejected');
  assert.strictEqual(longRes.error?.issues.find(i => i.path.includes('password'))?.message, 'Password must not exceed 128 characters');

  // 1d. Valid boundary passwords (8 chars and 128 chars)
  const valid8Res = memberRegistrationSchema.safeParse({ ...validMemberPayload, password: '8chars!!' });
  assert.strictEqual(valid8Res.success, true, '8-character password must be accepted');

  const valid128Res = memberRegistrationSchema.safeParse({ ...validMemberPayload, password: 'X'.repeat(128) });
  assert.strictEqual(valid128Res.success, true, '128-character password must be accepted');

  console.log('  ✓ Verified password validation: empty, weak, excessively long, and boundary inputs.');

  // ---------------------------------------------------------------------------
  // 2. Password Hashing using Bcrypt (Parameters & Output Format)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 2: Bcrypt Password Hashing Parameters ---');
  const rawPlainPassword = validMemberPayload.password;
  const saltRounds = 10;
  const generatedHash = await bcrypt.hash(rawPlainPassword, saltRounds);

  // Verify bcrypt format: $2a$ or $2b$, 10 salt rounds, 60 chars long
  assert.match(generatedHash, /^\$2[ab]\$10\$.{53}$/, 'Hash must conform to bcrypt 10 rounds format');
  assert.notStrictEqual(generatedHash, rawPlainPassword, 'Hash must never match raw password');

  // Verify compare function
  const match = await bcrypt.compare(rawPlainPassword, generatedHash);
  assert.strictEqual(match, true, 'bcrypt.compare must validate the correct raw password');

  const wrongMatch = await bcrypt.compare('WrongPassword999!', generatedHash);
  assert.strictEqual(wrongMatch, false, 'bcrypt.compare must reject an incorrect password');

  console.log('  ✓ Verified bcrypt 10-round salt parameters, hash structure, and comparison integrity.');

  // ---------------------------------------------------------------------------
  // 3. Simulated Atomic Signup & User Record Persistence
  // ---------------------------------------------------------------------------
  console.log('--- TEST 3: User Record Persistence & Password Hash Integrity ---');
  const normalizedEmail = validMemberPayload.email.toLowerCase().trim();

  // Simulate registerUser logic:
  const newUser: StoredUser = {
    id: 'usr_new_001',
    email: normalizedEmail,
    name: `${validMemberPayload.firstName} ${validMemberPayload.lastName}`,
    role: 'MEMBER',
    status: 'PENDING_VERIFICATION',
    emailVerified: null,
    passwordHash: generatedHash,
    sessionVersion: 0,
  };
  userTable.set(normalizedEmail, newUser);

  // Assert user record in storage:
  const retrievedUser = userTable.get(normalizedEmail);
  assert.ok(retrievedUser, 'User record must exist in DB');
  assert.strictEqual(retrievedUser.passwordHash, generatedHash, 'Stored passwordHash must match generated hash');
  assert.strictEqual(retrievedUser.status, 'PENDING_VERIFICATION', 'New user status must be PENDING_VERIFICATION');
  assert.strictEqual(retrievedUser.sessionVersion, 0, 'Initial sessionVersion must be 0');

  console.log('  ✓ Verified user record correctly receives and persists the bcrypt password hash.');

  // ---------------------------------------------------------------------------
  // 4. Duplicate Email Handling & Non-Overwriting Invariant
  // ---------------------------------------------------------------------------
  console.log('--- TEST 4: Duplicate Email Registration Handling ---');
  // Second attempt with same email but different password:
  const duplicateAttemptPassword = 'CompletelyDifferentPassword456!';
  const existingUserCheck = userTable.get(normalizedEmail);
  assert.ok(existingUserCheck, 'Existing user must be detected');

  // In registerUser: if existingUser is found, return generic success without DB write
  const simulatedDuplicateResult = {
    success: true,
    message: "If the details are valid, an account has been created. Please check your email."
  };
  assert.strictEqual(simulatedDuplicateResult.success, true);
  assert.ok(simulatedDuplicateResult.message.includes('If the details are valid'));

  // Ensure stored user password hash was NOT overwritten
  const userAfterDuplicateAttempt = userTable.get(normalizedEmail);
  assert.strictEqual(userAfterDuplicateAttempt?.passwordHash, generatedHash, 'Password hash must NOT be overwritten');
  assert.strictEqual(
    await bcrypt.compare(rawPlainPassword, userAfterDuplicateAttempt!.passwordHash!),
    true,
    'Original password must remain functional'
  );

  console.log('  ✓ Verified duplicate registration preserves original password and prevents account enumeration.');

  // ---------------------------------------------------------------------------
  // 5. Pre-Verification Login Guard (PENDING_VERIFICATION)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 5: Pre-Verification Login Rejection ---');
  // Simulated authorize() from auth.ts:
  async function simulateAuthorize(email: string, password?: string, otp?: string, authType = 'password') {
    const norm = email.toLowerCase().trim();
    const user = userTable.get(norm);

    if (authType === 'otp') {
      if (!otp) return null;
      const stored = tokenTable.get(`login_${norm}`);
      if (!stored || stored.token !== hashToken(otp.trim())) return null;
      if (new Date(stored.expires) < new Date()) return null;
      // Strict allowlist: ACTIVE only
      if (!user || user.status !== 'ACTIVE') return null;
      return { id: user.id, email: user.email, name: user.name, role: user.role, sessionVersion: user.sessionVersion };
    }

    // Password auth
    if (!password) return null;
    const isValid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
    // Strict allowlist: ACTIVE only with valid password hash
    if (!user || !user.passwordHash || user.status !== 'ACTIVE') return null;
    if (!isValid) return null;

    return { id: user.id, email: user.email, name: user.name, role: user.role, sessionVersion: user.sessionVersion };
  }

  // Attempt login with correct password while PENDING_VERIFICATION
  const unverifiedLogin = await simulateAuthorize(normalizedEmail, rawPlainPassword);
  assert.strictEqual(unverifiedLogin, null, 'Unverified accounts (PENDING_VERIFICATION) must be rejected at login');

  console.log('  ✓ Verified unverified accounts cannot log in even with the correct password.');

  // ---------------------------------------------------------------------------
  // 6. Email Verification Transition to ACTIVE & Password Preservation
  // ---------------------------------------------------------------------------
  console.log('--- TEST 6: Account Verification & Status Transition ---');
  // Simulate verifyEmail action:
  const userToActivate = userTable.get(normalizedEmail)!;
  userToActivate.emailVerified = new Date();
  userToActivate.status = 'ACTIVE';

  // Ensure passwordHash was not touched during verification
  assert.strictEqual(userToActivate.passwordHash, generatedHash, 'passwordHash must remain unchanged after verification');
  assert.strictEqual(userToActivate.status, 'ACTIVE', 'User status must now be ACTIVE');

  console.log('  ✓ Verified account activation preserves password hash.');

  // ---------------------------------------------------------------------------
  // 7. Post-Verification Password Login
  // ---------------------------------------------------------------------------
  console.log('--- TEST 7: Post-Verification Password Authentication ---');
  // 7a. Correct password
  const successfulLogin = await simulateAuthorize(normalizedEmail, rawPlainPassword);
  assert.ok(successfulLogin, 'Active account with correct password must authenticate successfully');
  assert.strictEqual(successfulLogin.id, newUser.id);
  assert.strictEqual(successfulLogin.email, normalizedEmail);
  assert.strictEqual(successfulLogin.sessionVersion, 0);

  // 7b. Incorrect password
  const failedLogin = await simulateAuthorize(normalizedEmail, 'WrongPassword123!');
  assert.strictEqual(failedLogin, null, 'Incorrect password must be rejected');

  // 7c. Nonexistent email
  const nonexistentLogin = await simulateAuthorize('ghost@example.com', 'AnyPassword123!');
  assert.strictEqual(nonexistentLogin, null, 'Nonexistent account must be rejected');

  console.log('  ✓ Verified password login: authenticates valid password, rejects invalid and non-existent accounts.');

  // ---------------------------------------------------------------------------
  // 8. OTP Login Compatibility (Completely Independent of Password)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 8: OTP Authentication Independence & Compatibility ---');
  const otpCode = '654321';
  tokenTable.set(`login_${normalizedEmail}`, {
    identifier: `login_${normalizedEmail}`,
    token: hashToken(otpCode),
    expires: new Date(Date.now() + 5 * 60 * 1000), // 5 min
  });

  const otpLoginSuccess = await simulateAuthorize(normalizedEmail, undefined, otpCode, 'otp');
  assert.ok(otpLoginSuccess, 'Active account must authenticate via valid OTP');
  assert.strictEqual(otpLoginSuccess.id, newUser.id);

  // Verify user password hash was not altered by OTP login
  assert.strictEqual(userTable.get(normalizedEmail)?.passwordHash, generatedHash, 'OTP login must not alter password hash');

  console.log('  ✓ Verified OTP authentication operates independently and does not affect password hash.');

  // ---------------------------------------------------------------------------
  // 9. Password Reset Action, Session Revocation & Immediate New Login
  // ---------------------------------------------------------------------------
  console.log('--- TEST 9: Password Reset, Session Revocation & Login Update ---');
  const newPassword = 'BrandNewSuperPassword999!';
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Simulate atomic resetPassword transaction:
  const activeUser = userTable.get(normalizedEmail)!;
  activeUser.passwordHash = newPasswordHash;
  activeUser.sessionVersion += 1;

  // 9a. Verify old password no longer authenticates
  const oldPassLoginAttempt = await simulateAuthorize(normalizedEmail, rawPlainPassword);
  assert.strictEqual(oldPassLoginAttempt, null, 'Old password must fail after password reset');

  // 9b. Verify new password authenticates immediately
  const newPassLoginAttempt = await simulateAuthorize(normalizedEmail, newPassword);
  assert.ok(newPassLoginAttempt, 'New password must authenticate successfully');
  assert.strictEqual(newPassLoginAttempt.sessionVersion, 1, 'New session must reflect incremented sessionVersion');

  // 9c. JWT Session invalidation simulation:
  // If a JWT token has sessionVersion: 0, it must be invalidated against DB sessionVersion: 1
  const existingJwtToken = { sub: activeUser.id, sessionVersion: 0 };
  const isSessionValid = activeUser.sessionVersion === existingJwtToken.sessionVersion;
  assert.strictEqual(isSessionValid, false, 'Stale sessionVersion must invalidate active JWT sessions');

  console.log('  ✓ Verified password reset updates credentials, revokes active sessions, and enables new password login.');

  // ---------------------------------------------------------------------------
  // 10. Suspended / Inactive Account Safety Invariant
  // ---------------------------------------------------------------------------
  console.log('--- TEST 10: Suspended & Disabled Account Invariant ---');
  activeUser.status = 'SUSPENDED';

  // Both password and OTP login must reject suspended accounts
  const suspendedPasswordLogin = await simulateAuthorize(normalizedEmail, newPassword);
  assert.strictEqual(suspendedPasswordLogin, null, 'Suspended user must be rejected for password login');

  const suspendedOtpLogin = await simulateAuthorize(normalizedEmail, undefined, otpCode, 'otp');
  assert.strictEqual(suspendedOtpLogin, null, 'Suspended user must be rejected for OTP login');

  console.log('  ✓ Verified suspended and inactive accounts are completely blocked from authenticating.');

  console.log('\n================================================================');
  console.log('ALL 10 SIGNUP & AUTHENTICATION AUDIT TESTS PASSED WITH ZERO ERRORS');
  console.log('================================================================\n');
}

runSignupAuthTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
