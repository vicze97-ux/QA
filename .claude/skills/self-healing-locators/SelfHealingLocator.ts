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

export class SelfHealingLocatorBuilder {
  static button(page: Page, name: string, additionalSelectors?: string[]): SelfHealingLocator {
    const locator = new SelfHealingLocator(page, `Button: ${name}`);

    locator.addStrategy(
      () => page.getByRole('button', { name: new RegExp(name, 'i') }),
      'getByRole("button")'
    );
    locator.addStrategy(
      () => page.getByText(name, { exact: false }),
      'getByText()'
    );
    locator.addStrategy(
      () => page.locator(`button:has-text("${name}")`),
      'button:has-text()'
    );

    additionalSelectors?.forEach(selector => {
      locator.addStrategy(() => page.locator(selector), `Custom: ${selector}`);
    });

    return locator;
  }

  static input(page: Page, label: string, name?: string, placeholder?: string): SelfHealingLocator {
    const locator = new SelfHealingLocator(page, `Input: ${label}`);

    if (name) {
      locator.addStrategy(
        () => page.locator(`input[name*="${name}"]`),
        `input[name*="${name}"]`
      );
    }
    if (placeholder) {
      locator.addStrategy(
        () => page.getByPlaceholder(new RegExp(placeholder, 'i')),
        'getByPlaceholder()'
      );
    }
    locator.addStrategy(
      () => page.getByLabel(new RegExp(label, 'i')),
      'getByLabel()'
    );
    locator.addStrategy(
      () => page.locator(`input[aria-label*="${label}" i]`),
      'input[aria-label]'
    );

    return locator;
  }

  static link(page: Page, text: string, href?: string): SelfHealingLocator {
    const locator = new SelfHealingLocator(page, `Link: ${text}`);

    locator.addStrategy(
      () => page.getByRole('link', { name: new RegExp(text, 'i') }),
      'getByRole("link")'
    );
    locator.addStrategy(
      () => page.getByText(text, { exact: false }),
      'getByText()'
    );
    if (href) {
      locator.addStrategy(
        () => page.locator(`a[href*="${href}"]`),
        `a[href*="${href}"]`
      );
    }

    return locator;
  }

  static dropdown(page: Page, label: string, name?: string): SelfHealingLocator {
    const locator = new SelfHealingLocator(page, `Dropdown: ${label}`);

    locator.addStrategy(
      () => page.getByLabel(new RegExp(label, 'i')),
      'getByLabel()'
    );
    locator.addStrategy(
      () => page.getByRole('combobox'),
      'getByRole("combobox")'
    );
    locator.addStrategy(
      () => page.getByRole('listbox'),
      'getByRole("listbox")'
    );
    if (name) {
      locator.addStrategy(
        () => page.locator(`select[name="${name}"]`),
        `select[name="${name}"]`
      );
    }

    return locator;
  }
}
