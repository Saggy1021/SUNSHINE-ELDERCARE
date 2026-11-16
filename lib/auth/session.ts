import { cache } from 'react';
import { auth } from '@/auth';

/**
 * Request-scoped session getter.
 * Returns the authenticated user session for the current incoming request.
 * Memoized per request lifecycle to guarantee zero duplicate database lookups.
 */
export const getRequestSession = cache(async () => {
  return await auth();
});
