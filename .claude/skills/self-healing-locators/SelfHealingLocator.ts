import { Page, Locator } from '@playwright/test';
import { LocatorHealthMonitor } from '../locator-health-monitoring';

export class SelfHealingLocator {
  private page: Page;
  private strategies: Array<{ fn: () => Locator; description: string }>;
  private elementDescription: string;
  private monitor: LocatorHealthMonitor;

  constructor(page: Page, elementDescription: string) {
    this.page = page;
    this.elementDescription = elementDescription;
    this.strategies = [];
    this.monitor = LocatorHealthMonitor.getInstance();
  }

  addStrategy(strategyFn: () => Locator, description?: string): this {
    this.strategies.push({
      fn: strategyFn,
      description: description || `Strategy ${this.strategies.length + 1}`
    });
    return this;
  }

  async getLocator(timeout: number = 5000): Promise<Locator> {
    const errors: string[] = [];

    for (let i = 0; i < this.strategies.length; i++) {
      const strategy = this.strategies[i];
      try {
        const locator = strategy.fn();
        await locator.waitFor({ state: 'visible', timeout });

        this.monitor.recordAttempt(this.elementDescription, i, strategy.description, true);

        if (i > 0) {
          console.warn(`Self-healing: "${this.elementDescription}" found via fallback #${i + 1} (${strategy.description}). Update primary locator.`);
        }

        return locator;
      } catch (error: any) {
        errors.push(`Strategy ${i + 1} (${strategy.description}): ${error.message}`);
        this.monitor.recordAttempt(this.elementDescription, i, strategy.description, false, error.message);
      }
    }

    console.error(`Self-healing failed for: "${this.elementDescription}"\n` + errors.join('\n'));
    throw new Error(`Could not locate element: ${this.elementDescription}`);
  }

  async click(options?: { timeout?: number; force?: boolean }): Promise<void> {
    const locator = await this.getLocator(options?.timeout);
    await locator.click({ force: options?.force });
  }

  async fill(value: string, options?: { timeout?: number }): Promise<void> {
    const locator = await this.getLocator(options?.timeout);
    await locator.fill(value);
  }

  async textContent(options?: { timeout?: number }): Promise<string | null> {
    const locator = await this.getLocator(options?.timeout);
    return locator.textContent();
  }

  async selectOption(value: string, options?: { timeout?: number }): Promise<void> {
    const locator = await this.getLocator(options?.timeout);
    await locator.selectOption(value);
  }

  async isVisible(options?: { timeout?: number }): Promise<boolean> {
    try {
      await this.getLocator(options?.timeout ?? 3000);
      return true;
    } catch {
      return false;
    }
  }
}
