import { test, expect } from '../../fixtures/base';

test.describe('Health & Status API', () => {
  test('GET /health returns 200', async ({ apiContext }) => {
    const response = await apiContext.get('/health');
    expect(response.status()).toBe(200);
  });

  test('GET /health returns expected shape', async ({ apiContext }) => {
    const response = await apiContext.get('/health');
    const body = await response.json();
    expect(body).toMatchObject({ status: expect.any(String) });
  });
});
