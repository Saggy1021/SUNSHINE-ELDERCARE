import { test, expect } from '@playwright/test';

test.describe('Security & IDOR Regression Tests', () => {
  test('Cannot access arbitrary user profile via API', async ({ request }) => {
    // Unauthenticated request to member profile endpoint
    const response = await request.get('/api/member/profile');
    expect(response.status()).toBe(401);
  });

  // Note: For authenticated IDOR tests (e.g., User A trying to access User B's invoice),
  // we require a seeded database with two specific users. Since this phase
  // focuses on foundational setup and we are avoiding destructive DB ops,
  // those tests will be fully implemented when the E2E seed strategy is finalized.
});
