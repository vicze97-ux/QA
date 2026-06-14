import { test, expect } from '../../fixtures/base';
import { randomEmail } from '../../utils/test-data';

test.describe('Users API', () => {
  test('GET /users returns an array', async ({ apiContext }) => {
    const response = await apiContext.get('/users');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('POST /users creates a new user', async ({ apiContext }) => {
    const email = randomEmail();
    const response = await apiContext.post('/users', {
      data: { email, name: 'Test User' },
    });
    expect(response.status()).toBe(201);
    const user = await response.json();
    expect(user).toMatchObject({ email });
  });

  test('GET /users/:id returns 404 for unknown id', async ({ apiContext }) => {
    const response = await apiContext.get('/users/nonexistent-id-000000');
    expect(response.status()).toBe(404);
  });
});
