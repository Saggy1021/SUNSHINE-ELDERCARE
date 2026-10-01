import { test, expect } from '@playwright/test';

test.describe('Security Headers', () => {
  const routes = [
    { name: 'Public Page', path: '/' },
    { name: 'API Response', path: '/api/health' },
    { name: 'Member Route', path: '/login' }, // login is public but tests frame-ancestors
    { name: 'Admin Route', path: '/admin' }, // admin might redirect, but redirect response should have headers
  ];

  for (const route of routes) {
    test(`Security headers are present on ${route.name}`, async ({ request }) => {
      const response = await request.get(route.path);
      const headers = response.headers();

      // CSP Exists
      expect(headers['content-security-policy']).toBeDefined();
      const csp = headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");

      // X-Content-Type-Options
      expect(headers['x-content-type-options']).toBe('nosniff');

      // Referrer-Policy
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

      // Permissions-Policy
      expect(headers['permissions-policy']).toBeDefined();

      // Frame Protection
      expect(headers['x-frame-options']).toBe('DENY');

      // Optional: HSTS might only be present in production.
      if (headers['strict-transport-security']) {
        expect(headers['strict-transport-security']).toContain('max-age=63072000');
        expect(headers['strict-transport-security']).toContain('includeSubDomains');
      }
    });
  }
});
