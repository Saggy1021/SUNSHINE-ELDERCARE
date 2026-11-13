import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import { db } from '../../lib/db';
import { MobileAuthService } from '../../lib/services/mobile-auth';
import { RateLimitService } from '../../lib/services/rate-limit';

/**
 * Sunshine Eldercare — Member App Authentication & Integration Test Suite
 * Self-executing runner using native node:assert.
 */
async function runMemberAppAuthTests() {
  console.log('================================================================');
  console.log('Running Sunshine Eldercare — Member App Auth & Integration Tests');
  console.log('================================================================\n');

  // Disable rate limiting for isolated tests
  process.env.RATE_LIMIT_ENABLED = 'false';
  process.env.AUTH_SECRET = 'test-secret-sunshine-member-app-2026';
  RateLimitService.checkLimit = async () => true as any;

  // In-memory data structures for testing
  const users = new Map<string, any>();
  const profiles = new Map<string, any>();
  const subscriptions = new Map<string, any>();
  const carePlans = new Map<string, any>();
  const variants = new Map<string, any>();
  const receipts = new Map<string, any>();

  // Mock Prisma database client
  (db as any).user = {
    findUnique: async ({ where }: any) => {
      if (where.id) return users.get(where.id) || null;
      if (where.email) {
        for (const u of Array.from(users.values())) {
          if (u.email === where.email) return u;
        }
      }
      return null;
    },
  };

  (db as any).memberProfile = {
    findUnique: async ({ where, include }: any) => {
      let profile: any = null;
      if (where.memberId) {
        for (const p of Array.from(profiles.values())) {
          if (p.memberId === where.memberId) {
            profile = p;
            break;
          }
        }
      } else if (where.userId) {
        profile = profiles.get(where.userId) || null;
      }

      if (profile && include?.user) {
        const u = users.get(profile.userId);
        return { ...profile, user: u };
      }
      return profile;
    },
  };

  (db as any).subscription = {
    findFirst: async ({ where }: any) => {
      for (const s of Array.from(subscriptions.values())) {
        if (s.userId === where.userId) return s;
      }
      return null;
    },
    findMany: async ({ where }: any) => {
      const results: any[] = [];
      for (const s of Array.from(subscriptions.values())) {
        if (s.userId === where.userId) results.push(s);
      }
      return results;
    },
  };

  (db as any).carePlanVariant = {
    findUnique: async ({ where }: any) => {
      const key = `${where.carePlanId_variantType?.carePlanId}:${where.carePlanId_variantType?.variantType}`;
      return variants.get(key) || null;
    },
  };

  (db as any).receipt = {
    findMany: async ({ where }: any) => {
      const res: any[] = [];
      for (const r of Array.from(receipts.values())) {
        if (r.userId === where.userId) res.push(r);
      }
      return res;
    },
    findUnique: async ({ where }: any) => {
      return receipts.get(where.id) || null;
    },
  };

  // Seed test user with password
  const testPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(testPassword, 10);

  const testUser = {
    id: 'user_sakuntala_1001',
    email: 'sakuntala.roy@example.com',
    name: 'Sakuntala Roy',
    role: 'MEMBER',
    status: 'ACTIVE',
    sessionVersion: 1,
    passwordHash,
  };
  users.set(testUser.id, testUser);

  const testProfile = {
    id: 'prof_1001',
    userId: testUser.id,
    memberId: 'SEC/S/1001/SAKR',
    phone: '+91 98765 43210',
    addressLine1: 'Salt Lake Sector V',
    city: 'Kolkata',
    bloodGroup: 'O+',
  };
  profiles.set(testUser.id, testProfile);

  // Seed care plan with 24/7 Emergency Assistant
  const testCarePlan = { id: 'plan_shield', name: 'Shield Shine', slug: 'shield-shine' };
  carePlans.set(testCarePlan.id, testCarePlan);

  const testVariant = {
    id: 'var_shield_single',
    carePlanId: testCarePlan.id,
    variantType: 'SINGLE',
    services: [
      { serviceName: 'Comprehensive Care Service' },
      { serviceName: '24/7 Emergency Assistant' },
    ],
  };
  variants.set(`${testCarePlan.id}:SINGLE`, testVariant);

  const now = new Date();
  const testSub = {
    id: 'sub_1001',
    userId: testUser.id,
    carePlanId: testCarePlan.id,
    variantType: 'SINGLE',
    status: 'ACTIVE',
    startDate: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30),
    endDate: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 335),
    carePlan: testCarePlan,
  };
  subscriptions.set(testSub.id, testSub);

  const testReceipt = {
    id: 'rec_1001',
    receiptNumber: 'SEC-REC-2026-1001',
    userId: testUser.id,
    amount: 62870,
    paymentMethod: 'ONLINE',
    relatedPlanName: 'Shield Shine',
    createdAt: new Date(),
  };
  receipts.set(testReceipt.id, testReceipt);

  // -------------------------------------------------------------------------
  // TEST 1: Existing member enters correct Member ID and website password
  // -------------------------------------------------------------------------
  console.log('Test 1: Valid Member ID and correct password...');
  const res1 = await MobileAuthService.authenticateWithMemberId('SEC/S/1001/SAKR', testPassword);
  assert.strictEqual(res1.success, true, 'Login must succeed');
  assert.ok(res1.token, 'A valid JWT token must be issued');
  assert.strictEqual(res1.member?.id, testUser.id, 'User ID must match existing account');
  assert.strictEqual(res1.member?.memberId, 'SEC/S/1001/SAKR', 'Member ID must match');
  assert.strictEqual(res1.subscription?.hasEmergencyAssistant, true, 'Emergency assistant must be detected');
  console.log('  ✓ Test 1 passed: Authenticated successfully using existing account.');

  // -------------------------------------------------------------------------
  // TEST 2: Existing member enters incorrect password
  // -------------------------------------------------------------------------
  console.log('Test 2: Valid Member ID and incorrect password...');
  const res2 = await MobileAuthService.authenticateWithMemberId('SEC/S/1001/SAKR', 'WrongPassword123!');
  assert.strictEqual(res2.success, false, 'Login must fail');
  assert.strictEqual(res2.statusCode, 401, 'HTTP 401 must be returned');
  assert.strictEqual(res2.error, 'Invalid Member ID or password. Please verify your credentials.');
  console.log('  ✓ Test 2 passed: Incorrect password rejected with generic 401.');

  // -------------------------------------------------------------------------
  // TEST 3: Unknown / Non-existent Member ID
  // -------------------------------------------------------------------------
  console.log('Test 3: Non-existent Member ID...');
  const res3 = await MobileAuthService.authenticateWithMemberId('SEC/S/9999/XXXX', testPassword);
  assert.strictEqual(res3.success, false, 'Login must fail');
  assert.strictEqual(res3.statusCode, 401, 'HTTP 401 must be returned');
  assert.strictEqual(res3.error, 'Invalid Member ID or password. Please verify your credentials.');
  console.log('  ✓ Test 3 passed: Unknown Member ID rejected without user enumeration.');

  // -------------------------------------------------------------------------
  // TEST 4: Case-insensitive Member ID normalization
  // -------------------------------------------------------------------------
  console.log('Test 4: Lowercase Member ID input...');
  const res4 = await MobileAuthService.authenticateWithMemberId('sec/s/1001/sakr', testPassword);
  assert.strictEqual(res4.success, true, 'Lowercase Member ID must be normalized and accepted');
  assert.strictEqual(res4.member?.memberId, 'SEC/S/1001/SAKR');
  console.log('  ✓ Test 4 passed: Lowercase Member ID normalized.');

  // -------------------------------------------------------------------------
  // TEST 5: Suspended account rejection
  // -------------------------------------------------------------------------
  console.log('Test 5: Suspended member account...');
  testUser.status = 'SUSPENDED';
  const res5 = await MobileAuthService.authenticateWithMemberId('SEC/S/1001/SAKR', testPassword);
  assert.strictEqual(res5.success, false, 'Suspended account must be blocked');
  assert.strictEqual(res5.statusCode, 403, 'HTTP 403 must be returned');
  assert.ok(res5.error?.includes('suspended'), 'Error message must specify suspension');
  testUser.status = 'ACTIVE'; // restore
  console.log('  ✓ Test 5 passed: Suspended account blocked with 403.');

  // -------------------------------------------------------------------------
  // TEST 6: Administrative account rejected from Member App
  // -------------------------------------------------------------------------
  console.log('Test 6: Admin user attempting mobile member login...');
  const adminUser = {
    id: 'user_admin',
    email: 'admin@sunshineeldercare.in',
    name: 'Super Administrator',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    sessionVersion: 1,
    passwordHash,
  };
  users.set(adminUser.id, adminUser);
  const adminProfile = { id: 'prof_admin', userId: adminUser.id, memberId: 'SEC/A/1000/ADMIN' };
  profiles.set(adminUser.id, adminProfile);

  const res6 = await MobileAuthService.authenticateWithMemberId('SEC/A/1000/ADMIN', testPassword);
  assert.strictEqual(res6.success, false, 'Admin must not be allowed to authenticate as member');
  assert.strictEqual(res6.statusCode, 403);
  assert.ok(res6.error?.includes('Administrative accounts'));
  console.log('  ✓ Test 6 passed: Admin account prevented from mobile member login.');

  // -------------------------------------------------------------------------
  // TEST 7: Token verification and sessionVersion revocation
  // -------------------------------------------------------------------------
  console.log('Test 7: Token verification & session invalidation upon password reset...');
  const token = res1.token!;
  const sessionHeaders = new Headers({ Authorization: `Bearer ${token}` });
  const verified = await MobileAuthService.verifySession(sessionHeaders);
  assert.ok(verified, 'Valid token must verify');
  assert.strictEqual(verified.user.id, testUser.id);

  // Simulate password reset on website (increments sessionVersion)
  testUser.sessionVersion = 2;
  const revoked = await MobileAuthService.verifySession(sessionHeaders);
  assert.strictEqual(revoked, null, 'Token with old sessionVersion must be rejected immediately');
  testUser.sessionVersion = 1; // restore
  console.log('  ✓ Test 7 passed: Password reset automatically revokes mobile session.');

  // -------------------------------------------------------------------------
  // TEST 8: Tampered token rejection
  // -------------------------------------------------------------------------
  console.log('Test 8: Tampered JWT token...');
  const tamperedToken = token.slice(0, -5) + 'XXXXX';
  const tamperedHeaders = new Headers({ Authorization: `Bearer ${tamperedToken}` });
  const tamperedResult = await MobileAuthService.verifySession(tamperedHeaders);
  assert.strictEqual(tamperedResult, null, 'Tampered token signature must fail verification');
  console.log('  ✓ Test 8 passed: Tampered tokens rejected.');

  // -------------------------------------------------------------------------
  // TEST 9: Secure HttpOnly cookie verification (sunshine_member_session)
  // -------------------------------------------------------------------------
  console.log('Test 9: Secure HttpOnly cookie verification (sunshine_member_session)...');
  const emptyHeaders = new Headers();
  const mockCookies = {
    get: (name: string) => {
      if (name === 'sunshine_member_session') return { value: token };
      return undefined;
    },
  };
  const cookieVerified = await MobileAuthService.verifySession(emptyHeaders, mockCookies);
  assert.ok(cookieVerified, 'Session must verify via sunshine_member_session cookie');
  assert.strictEqual(cookieVerified.user.id, testUser.id);
  assert.strictEqual(cookieVerified.memberId, 'SEC/S/1001/SAKR');
  console.log('  ✓ Test 9 passed: HttpOnly cookie session authenticated without Authorization header.');

  // -------------------------------------------------------------------------
  // TEST 10: Cookie session invalidation when password changed (sessionVersion)
  // -------------------------------------------------------------------------
  console.log('Test 10: Cookie session invalidation on password change...');
  testUser.sessionVersion = 3;
  const cookieRevoked = await MobileAuthService.verifySession(emptyHeaders, mockCookies);
  assert.strictEqual(cookieRevoked, null, 'Cookie session must immediately invalidate when sessionVersion changes');
  testUser.sessionVersion = 1; // restore
  console.log('  ✓ Test 10 passed: Cookie session invalidated immediately upon password change.');

  // -------------------------------------------------------------------------
  // TEST 11: Secure failure when AUTH_SECRET is missing or empty
  // -------------------------------------------------------------------------
  console.log('Test 11: Secure failure when AUTH_SECRET is missing or empty...');
  const originalSecret = process.env.AUTH_SECRET;
  try {
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = 'fallback-nextauth-secret'; // Must NOT fall back to NEXTAUTH_SECRET

    assert.throws(
      () => {
        MobileAuthService.signToken({
          sub: 'test',
          memberId: 'SEC/S/TEST',
          email: 'test@example.com',
          name: 'Test',
          role: 'MEMBER',
          sessionVersion: 1,
        });
      },
      /AUTH_SECRET environment variable is required/,
      'signToken must throw when AUTH_SECRET is missing, without falling back to NEXTAUTH_SECRET'
    );

    // Empty/whitespace string must also throw
    process.env.AUTH_SECRET = '   ';
    assert.throws(
      () => {
        MobileAuthService.signToken({
          sub: 'test',
          memberId: 'SEC/S/TEST',
          email: 'test@example.com',
          name: 'Test',
          role: 'MEMBER',
          sessionVersion: 1,
        });
      },
      /AUTH_SECRET environment variable is required/,
      'signToken must throw when AUTH_SECRET is empty whitespace'
    );

    // verifyToken must fail securely returning null
    const verifyNull = MobileAuthService.verifyToken(token);
    assert.strictEqual(verifyNull, null, 'verifyToken must return null when AUTH_SECRET is invalid');

    console.log('  ✓ Test 11 passed: Fails securely when AUTH_SECRET is missing/empty, zero fallback to NEXTAUTH_SECRET.');
  } finally {
    process.env.AUTH_SECRET = originalSecret;
    delete process.env.NEXTAUTH_SECRET;
  }

  console.log('\n================================================================');
  console.log('ALL MEMBER APP AUTHENTICATION TESTS PASSED (11/11)');
  console.log('================================================================\n');
}

runMemberAppAuthTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});

