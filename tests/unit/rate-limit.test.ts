// @ts-nocheck
import { RateLimitService } from '@/lib/services/rate-limit';

describe('RateLimitService', () => {
  beforeEach(() => {
    // Reset the in-memory store before each test
    // Usually would mock this, but since it's an in-memory Map we can just use a fresh category or reset
    // Let's assume we are testing the PUBLIC_PRICING category
  });

  it('should allow requests under the limit', async () => {
    // PUBLIC_PRICING limit is 20 per minute
    const identifier = 'test_ip_1';
    
    // Simulate 5 requests
    for (let i = 0; i < 5; i++) {
      await expect(RateLimitService.checkLimit('PUBLIC_PRICING')).resolves.not.toThrow();
    }
  });

  it('should throw RateLimitError when limit is exceeded', async () => {
    const identifier = 'test_ip_2';
    
    // Simulate 20 requests (which should pass)
    for (let i = 0; i < 20; i++) {
      await expect(RateLimitService.checkLimit('PUBLIC_PRICING')).resolves.not.toThrow();
    }
    
    // The 21st request should throw
    await expect(RateLimitService.checkLimit('PUBLIC_PRICING')).rejects.toThrow('Rate limit exceeded');
  });
});
