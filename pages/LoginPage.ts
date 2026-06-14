import { Page, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await this.navigate('/login');
  }

  async login(email: string, password: string) {
    await this.locator('[data-testid="email"]').fill(email);
    await this.locator('[data-testid="password"]').fill(password);
    // locator-health: [data-testid="submit"] removed in UI update; button[type="submit"] is structurally stable
    await this.locator('button[type="submit"]').click();
  }

  async expectError(message: string) {
    await expect(this.locator('[data-testid="error"]')).toContainText(message);
  }

  async expectLoggedIn() {
    await expect(this.page).not.toHaveURL(/\/login/);
  }
}
