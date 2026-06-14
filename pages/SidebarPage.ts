import { Page } from '@playwright/test';
import { BasePage } from '../.claude/skills/page-object-model/BasePage';

export type CanvasType = 'world' | 'region' | 'city' | 'dungeon' | 'relationships' | 'session';

export class SidebarPage extends BasePage {
  private nameInput;
  private typeSelect;
  private createButton;
  private searchInput;

  constructor(page: Page) {
    super(page);

    this.nameInput = this.heal('Canvas Name Input')
      .addStrategy(() => page.locator('input[placeholder="Port Halberd"]'), 'placeholder=Port Halberd')
      .addStrategy(() => page.locator('.sidebar input[type="text"]').last(), 'last text input in sidebar')
      .addStrategy(() => page.getByPlaceholder(/port halberd/i), 'getByPlaceholder');

    this.typeSelect = this.heal('Canvas Type Select')
      .addStrategy(() => page.locator('select').nth(1), 'select nth(1) — type dropdown')
      .addStrategy(() => page.locator('select').filter({ hasText: 'world' }), 'select with world option')
      .addStrategy(() => page.locator('select').last(), 'last select');

    this.createButton = this.heal('Create Button')
      .addStrategy(() => page.locator('button.primary-button'), 'button.primary-button')
      .addStrategy(() => page.locator('button.primary-button:has-text("Create")'), 'primary-button with Create text')
      .addStrategy(() => page.getByRole('button', { name: /^create$/i }).filter({ has: page.locator('.primary-button, [class*="primary"]') }), 'getByRole primary create');

    this.searchInput = this.heal('Search Input')
      .addStrategy(() => page.locator('input[placeholder*="tavern"], input[placeholder*="Marrick"]'), 'search placeholder')
      .addStrategy(() => page.getByPlaceholder(/marrick|tavern|faction/i), 'getByPlaceholder search');
  }

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async selectType(type: CanvasType): Promise<void> {
    await this.typeSelect.selectOption(type);
  }

  async clickCreate(): Promise<void> {
    await this.createButton.click();
  }

  async create(name: string, type: CanvasType = 'world'): Promise<void> {
    await this.fillName(name);
    await this.selectType(type);
    await this.clickCreate();
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.fill('');
  }

  async getCanvasListItems(): Promise<string[]> {
    await this.page.waitForTimeout(300);
    return this.page.locator('button[class*="canvas"], .canvas-list button, [class*="sidebar"] button')
      .filter({ hasNotText: /create|canvases|terrain|battle/i })
      .allTextContents();
  }

  async getRecentEvents(): Promise<string[]> {
    return this.page.locator('[class*="event"], [class*="recent"] li, [class*="recent"] div')
      .filter({ hasText: /canvas\.(created|deleted|updated)/i })
      .allTextContents();
  }

  async getLatestEventText(): Promise<string | null> {
    return this.page.locator('.event-item strong').first().textContent().catch(() => null);
  }

  async ensureSelectionTabActive(): Promise<void> {
    const selectionTab = this.page.locator('button.tab-button', { hasText: /^selection$/i });
    await selectionTab.click();
    await this.page.waitForTimeout(200);
  }

  async getEventCount(): Promise<number> {
    await this.ensureSelectionTabActive();
    return this.page.locator('.event-item strong').count();
  }

  async getNameInputValue(): Promise<string> {
    const loc = await this.nameInput.getLocator();
    return loc.inputValue();
  }

  async getSelectedType(): Promise<string> {
    const loc = await this.typeSelect.getLocator();
    return loc.inputValue();
  }

  async isCreateButtonVisible(): Promise<boolean> {
    return this.createButton.isVisible();
  }
}
