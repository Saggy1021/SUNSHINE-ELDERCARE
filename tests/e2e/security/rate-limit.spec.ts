import { test, expect } from '@playwright/test';

test.describe('Rate Limiting Regression Tests', () => {
  test('Rate limit triggers 429 on excessive public pricing API calls', async ({ request }) => {
    test.setTimeout(120000); // 120s for sequential HTTP requests
    const endpoint = '/api/care-plans'; // POST endpoint
    
    // PUBLIC_PRICING limit is 100 requests per 15 minutes in rate-limit.ts
    // We send 250 requests because Next.js spreads requests across multiple worker threads
    // with independent in-memory rate limiters. 250 ensures at least one worker exceeds 100.
    // The 101st+ must return 429.

    const payload = {
      planSlug: "basic",
      variantType: "SINGLE",
      months: 1
    };

    let rateLimitHit = false;

    for (let i = 0; i < 300; i++) {
      const response = await request.post(endpoint, { data: payload });
      const status = response.status();
      
      if (status === 429) {
        rateLimitHit = true;
        break;
      }
    }

    expect(rateLimitHit).toBe(true);
  });
});
