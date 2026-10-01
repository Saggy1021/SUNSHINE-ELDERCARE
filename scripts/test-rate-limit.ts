import { RateLimitService, RateLimitCategory } from '../lib/services/rate-limit';

async function runTests() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.error('❌ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing from .env');
    process.exit(1);
  }

  // Force NODE_ENV to test to use the 'test:' prefix
  (process.env as any).NODE_ENV = 'test';

  console.log('🔄 Running Distributed Rate Limit Integration Tests...');
  console.log('Using Upstash Redis: ', url);

  try {
    // 1. Redis store initialization & 4. first request
    console.log('\nTest 1 & 4: Store initialization & First request');
    await RateLimitService.resetLimit('PUBLIC_FORMS');
    // Using a mocked context since we are running as a script, getIdentifier will default to ip:unknown-ip
    await RateLimitService.checkLimit('PUBLIC_FORMS');
    console.log('✅ First request succeeded');

    // 2. increment/count behavior & 5. requests below limit
    console.log('\nTest 2 & 5: Requests below limit (PUBLIC_FORMS limit is 10)');
    for (let i = 0; i < 8; i++) {
      await RateLimitService.checkLimit('PUBLIC_FORMS');
    }
    console.log('✅ 8 more requests succeeded (Total: 9)');

    // 6. request at limit
    console.log('\nTest 6: Request exactly at limit');
    await RateLimitService.checkLimit('PUBLIC_FORMS');
    console.log('✅ 10th request succeeded');

    // 7. request exceeding limit & 8. Retry-After
    console.log('\nTest 7 & 8: Request exceeding limit should throw 429');
    try {
      await RateLimitService.checkLimit('PUBLIC_FORMS');
      throw new Error('Should have thrown RateLimitError');
    } catch (error: any) {
      if (error.statusCode === 429) {
        console.log(`✅ 11th request correctly rejected with 429. Retry after: ${error.retryAfterSeconds}s`);
      } else {
        throw error;
      }
    }

    // 13. different rate-limit categories remain isolated
    console.log('\nTest 13: Different categories isolated');
    await RateLimitService.checkLimit('AUTHENTICATION');
    console.log('✅ Request to AUTHENTICATION succeeded despite PUBLIC_FORMS being blocked');

    // Clean up
    await RateLimitService.resetLimit('PUBLIC_FORMS');
    await RateLimitService.resetLimit('AUTHENTICATION');

    console.log('\n🎉 All Upstash Redis integration tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
