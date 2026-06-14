import { Page, Locator } from '@playwright/test';
import { SelfHealingLocator } from '../self-healing-locators';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(url: string): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');
  }

  protected async settle(timeoutMs = 1000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(timeoutMs);
  }

  protected heal(description: string): SelfHealingLocator {
    return new SelfHealingLocator(this.page, description);
  }

  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }
}
