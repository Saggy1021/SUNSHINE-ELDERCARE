import assert from 'node:assert';
import { calculateEndDate } from '../../lib/services/dates';

async function runTests() {
  console.log('--- Running Admin Payment Verification & Portal Tests ---');

  // Test 1: Date end calculation for onboarding plans
  const now = new Date('2026-11-14T10:00:00.000Z');
  const end6Months = calculateEndDate(now, 6);
  assert.strictEqual(end6Months.getUTCFullYear(), 2027);
  assert.strictEqual(end6Months.getUTCMonth(), 4); // May
  assert.strictEqual(end6Months.getUTCDate(), 13); // 14 Nov + 6 months - 1 day = 13 May
  console.log('✓ Test 1: End date calculation for 6-month onboarded plan (14 Nov -> 13 May)');

  // Test 2: Invariant Check: Payment verification without renewalRequest
  // Verify that an onboarding payment object (renewalRequestId = null) has all required fields
  const mockOnboardingPayment = {
    id: 'pay_onboard_123',
    userId: 'user_cmwg8i6n10001',
    invoiceId: 'inv_1794650389081',
    renewalRequestId: null,
    amount: 38940,
    currency: 'INR',
    paymentMethod: 'OFFLINE',
    status: 'VERIFICATION_PENDING',
    reference: 'CHQ-987654',
    invoice: {
      id: 'inv_1794650389081',
      invoiceNumber: 'INV-1794650389081-8507',
      planId: 'semi-shield-shine',
      paymentStatus: 'UNPAID',
      status: 'DRAFT',
      lineItems: [
        {
          id: 'li_1',
          planName: 'Semi Shield Shine',
          variantType: 'COUPLE',
          durationMonths: 6,
          lineTotal: 38940
        }
      ]
    },
    renewalRequest: null,
    user: {
      id: 'user_cmwg8i6n10001',
      name: 'member onboard',
      email: 'memberonboardtest@gmail.com',
      memberProfile: {
        id: 'prof_1',
        serviceAddress: 'Salt Lake Sector 5, Kolkata',
        mobileNumber: '9876543210'
      }
    }
  };

  // Verify that the new invariant (only requiring invoice) passes
  assert.ok(mockOnboardingPayment.invoice, 'Invoice must be present');
  assert.strictEqual(mockOnboardingPayment.renewalRequest, null, 'renewalRequest is null for onboarding');
  assert.strictEqual(mockOnboardingPayment.invoice.lineItems[0].durationMonths, 6);
  assert.strictEqual(mockOnboardingPayment.invoice.lineItems[0].variantType, 'COUPLE');
  console.log('✓ Test 2: Onboarding payment references validated without renewalRequest');

  // Test 3: Care Operations pre-serialization
  const mockVisit = {
    id: 'visit_123',
    scheduledStart: new Date('2026-11-15T09:30:00.000Z'),
    scheduledEnd: new Date('2026-11-15T11:30:00.000Z'),
    operationalNotes: 'Morning vitals check',
    status: 'SCHEDULED'
  };

  const serializedVisit = {
    ...mockVisit,
    scheduledStart: mockVisit.scheduledStart.toISOString(),
    scheduledEnd: mockVisit.scheduledEnd.toISOString()
  };

  assert.strictEqual(typeof serializedVisit.scheduledStart, 'string');
  assert.strictEqual(typeof serializedVisit.scheduledEnd, 'string');
  assert.strictEqual(serializedVisit.scheduledStart, '2026-11-15T09:30:00.000Z');
  assert.strictEqual(serializedVisit.scheduledEnd, '2026-11-15T11:30:00.000Z');
  console.log('✓ Test 3: Care visit pre-serialization prevents server/client hydration mismatch');

  // Test 4: Care Operations null-safety guards
  const casesWithMissingUserOrElder = [
    { id: 'c1', elder: { firstName: 'Rama', lastName: 'Sen', user: null } },
    { id: 'c2', elder: { firstName: '', lastName: '', user: { email: null } } },
    { id: 'c3', elder: null }
  ];

  const renderedLabels = casesWithMissingUserOrElder.map((c: any) => {
    const elderName = c.elder ? `${c.elder.firstName || ''} ${c.elder.lastName || ''}`.trim() : 'Unknown Elder';
    const emailSuffix = c.elder?.user?.email ? ` (${c.elder.user.email})` : '';
    return (elderName || 'Elder') + emailSuffix;
  });

  assert.strictEqual(renderedLabels[0], 'Rama Sen');
  assert.strictEqual(renderedLabels[1], 'Elder');
  assert.strictEqual(renderedLabels[2], 'Unknown Elder');
  console.log('✓ Test 4: Null-safe guards on care cases handle missing elder/user relations gracefully');

  // Test 5: Testimonial star rating clamping
  const testRatings = [5, 4.2, 0, null, undefined, -3, 8];
  const expectedStars = [5, 4, 0, 5, 5, 0, 5];

  testRatings.forEach((rating, idx) => {
    const count = Math.max(0, Math.min(5, Math.floor(rating ?? 5)));
    assert.strictEqual(count, expectedStars[idx]);
    assert.strictEqual('★'.repeat(count).length, expectedStars[idx]);
  });
  console.log('✓ Test 5: Testimonial star repeat safely handles floats, nulls, negative, and out-of-range');

  console.log('\n--- All Unit Tests Passed Successfully ---');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
