import { test, expect } from '@playwright/test';

test.describe('Documents Tests', () => {
  test('Unauthorized access to documents API is denied', async ({ request }) => {
    // Attempt to download a document via API directly without being logged in
    const response = await request.get('/api/documents/download?id=mock-doc-id');
    expect(response.status()).toBe(401); // Unauthorized
  });
});
