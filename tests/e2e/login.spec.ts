import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';

test.describe('Login', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should log in with valid credentials', async () => {
    await loginPage.login(
      process.env.TEST_USER_EMAIL ?? 'user@example.com',
      process.env.TEST_USER_PASSWORD ?? 'password'
    );
    await loginPage.expectLoggedIn();
  });

  test('should show error for invalid credentials', async () => {
    await loginPage.login('bad@example.com', 'wrongpassword');
    await loginPage.expectError('Invalid credentials');
  });

  test('page title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/Login/);
  });
});
