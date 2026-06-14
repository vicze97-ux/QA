import { Page, Locator } from '@playwright/test';

export class VisualSelfHealing {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async findByVisualContext(
    elementType: 'button' | 'input' | 'link',
    visualContext: {
      nearText?: string;
      containsText?: string;
      ariaLabel?: string;
      placeholder?: string;
    }
  ): Promise<Locator | null> {
    const strategies: Array<() => Locator> = [];

    if (visualContext.containsText) {
      if (elementType === 'button') {
        strategies.push(() => this.page.getByRole('button', { name: new RegExp(visualContext.containsText!, 'i') }));
        strategies.push(() => this.page.locator(`button:has-text("${visualContext.containsText}")`));
      } else if (elementType === 'link') {
        strategies.push(() => this.page.getByRole('link', { name: new RegExp(visualContext.containsText!, 'i') }));
      }
    }

    if (visualContext.nearText) {
      strategies.push(() =>
        this.page.locator(`text=${visualContext.nearText}`).locator('..').locator(elementType)
      );
    }

    if (visualContext.ariaLabel) {
      strategies.push(() => this.page.locator(`[aria-label*="${visualContext.ariaLabel}" i]`));
    }

    if (visualContext.placeholder && elementType === 'input') {
      strategies.push(() => this.page.getByPlaceholder(new RegExp(visualContext.placeholder!, 'i')));
    }

    for (const strategy of strategies) {
      try {
        const locator = strategy();
        await locator.waitFor({ state: 'visible', timeout: 2000 });
        return locator;
      } catch {
        continue;
      }
    }

    return null;
  }

  async findElementSmartly(config: {
    type: 'button' | 'input' | 'link' | 'dropdown';
    primaryText?: string;
    nearbyText?: string;
    position?: 'first' | 'last' | number;
    containerSelector?: string;
  }): Promise<Locator> {
    const { type, primaryText, nearbyText, position, containerSelector } = config;

    const container = containerSelector ? this.page.locator(containerSelector) : this.page;
    let locator: Locator;

    if (nearbyText) {
      const parentSection = this.page.getByText(nearbyText).locator('..');

      if (type === 'button' && primaryText) {
        locator = parentSection.getByRole('button', { name: new RegExp(primaryText, 'i') });
      } else if (type === 'input') {
        locator = parentSection.locator('input').first();
      } else if (type === 'link' && primaryText) {
        locator = parentSection.getByRole('link', { name: new RegExp(primaryText, 'i') });
      } else {
        locator = parentSection.locator(type).first();
      }
    } else if (primaryText) {
      if (type === 'button') {
        locator = container.getByRole('button', { name: new RegExp(primaryText, 'i') });
      } else if (type === 'link') {
        locator = container.getByRole('link', { name: new RegExp(primaryText, 'i') });
      } else if (type === 'input') {
        locator = container.getByLabel(new RegExp(primaryText, 'i'))
          .or(container.getByPlaceholder(new RegExp(primaryText, 'i')));
      } else {
        locator = container.locator(type).filter({ hasText: new RegExp(primaryText, 'i') });
      }
    } else {
      locator = container.locator(type);
    }

    if (position === 'first') return locator.first();
    if (position === 'last') return locator.last();
    if (typeof position === 'number') return locator.nth(position);

    return locator;
  }
}
