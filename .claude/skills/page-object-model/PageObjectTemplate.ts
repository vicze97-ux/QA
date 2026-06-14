import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * TEMPLATE — copy when creating a new page object.
 *
 * Rules:
 *  1. Extend BasePage.
 *  2. Declare one SelfHealingLocator field per element, built via `this.heal(...)` with 2-4 fallbacks.
 *  3. Expose intent-revealing async methods (clickX, fillY, getZText, isVisible).
 *  4. NO assertions inside page objects — return values/booleans; assert in specs.
 *  5. NO raw selectors in spec files — everything goes through a page-object method.
 */
export class ExamplePage extends BasePage {
  private submitButton;
  private titleHeading;

  constructor(page: Page) {
    super(page);

    this.submitButton = this.heal('Submit Button')
      .addStrategy(() => page.getByRole('button', { name: /submit/i }), 'role button submit')
      .addStrategy(() => page.locator('button[type="submit"]'), 'button[type=submit]');

    this.titleHeading = this.heal('Page Title Heading')
      .addStrategy(() => page.getByRole('heading', { level: 1 }), 'h1 heading')
      .addStrategy(() => page.locator('h1'), 'h1');
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async getTitleText(): Promise<string | null> {
    return this.titleHeading.textContent();
  }

  async isTitleVisible(): Promise<boolean> {
    try {
      await this.titleHeading.getLocator(5000);
      return true;
    } catch {
      return false;
    }
  }
}
