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
      .addStrategy(() => page.locator('input[placeholder*="Port Halberd"]'), 'placeholder contains Port Halberd')
      .addStrategy(() => page.locator('form input[type="text"]').first(), 'form > first text input')
      .addStrategy(() => page.locator('.sidebar input[type="text"]').last(), 'last text input in sidebar');

    this.typeSelect = this.heal('Canvas Type Select')
      .addStrategy(() => page.locator('select').nth(1), 'select nth(1) — type dropdown')
      .addStrategy(() => page.locator('select').filter({ hasText: 'world' }), 'select with world option')
      .addStrategy(() => page.locator('select').last(), 'last select');

    this.createButton = this.heal('Create Button')
      .addStrategy(() => page.locator('button[type="submit"].primary-button'), 'form submit.primary-button')
      .addStrategy(() => page.locator('form').getByRole('button', { name: /^create$/i }), 'form > getByRole button name=create')
      .addStrategy(() => page.locator('button.btn-create'), 'button.btn-create');

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

  async getTypeSelectOptions(): Promise<string[]> {
    const loc = await this.typeSelect.getLocator();
    return loc.locator('option').allTextContents();
  }

  async waitForCanvasToAppear(name: string, timeout = 5000): Promise<void> {
    await this.page.locator('button.canvas-list-item', { hasText: name })
      .first().waitFor({ state: 'visible', timeout });
  }

  async waitForCanvasToBeHidden(name: string, timeout = 5000): Promise<void> {
    await this.page.locator('button.canvas-list-item', { hasText: name })
      .first().waitFor({ state: 'hidden', timeout });
  }

  async getCanvasListItems(): Promise<string[]> {
    return this.page.locator('button.canvas-list-item').allTextContents();
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
    // Wait for the tab panel to become active rather than using a fixed delay.
    await this.page.locator('button.canvas-list-item').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }

  async ensureCreateTabActive(): Promise<void> {
    const createTab = this.page.locator('button.tab-button', { hasText: /^create$/i });
    await createTab.click();
    const loc = await this.nameInput.getLocator();
    await loc.waitFor({ state: 'visible', timeout: 5000 });
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

  // ── Canvas Deletion — US-042 / SCRUM-9 ──────────────────────────────────────

  private deleteButtonFor(canvasName: string) {
    return this.heal(`Delete Button — ${canvasName}`)
      .addStrategy(
        () => this.page.getByRole('listitem').filter({ hasText: canvasName }).getByRole('button', { name: /delete/i }),
        'aria: listitem > button[name=delete]'
      )
      .addStrategy(
        () => this.page.locator(`[data-canvas-name="${canvasName}"] [data-action="delete"]`),
        'data-canvas-name attr + data-action=delete'
      );
  }

  private confirmDialog() {
    return this.heal('Confirm Delete Dialog')
      .addStrategy(() => this.page.getByRole('dialog'), 'role=dialog')
      .addStrategy(() => this.page.locator('[data-testid="confirm-delete-dialog"]'), 'data-testid=confirm-delete-dialog');
  }

  private cancelDialogButton() {
    return this.heal('Cancel Delete Button')
      .addStrategy(
        () => this.page.getByRole('dialog').getByRole('button', { name: /cancel/i }),
        'role=dialog > button[name=cancel]'
      )
      .addStrategy(
        () => this.page.locator('[data-testid="confirm-delete-dialog"]').locator('button', { hasText: /cancel/i }),
        'data-testid dialog > cancel button text'
      );
  }

  async hoverCanvasItem(canvasName: string): Promise<void> {
    const item = this.heal(`Canvas Item — ${canvasName}`)
      .addStrategy(
        () => this.page.getByRole('listitem').filter({ hasText: canvasName }),
        'role=listitem with text'
      )
      .addStrategy(
        () => this.page.locator(`[data-canvas-name="${canvasName}"]`),
        'data-canvas-name attr'
      );
    const locator = await item.getLocator();
    await locator.hover();
  }

  async blurHover(): Promise<void> {
    await this.page.locator('body').hover();
  }

  async isDeleteButtonVisible(canvasName: string): Promise<boolean> {
    return this.deleteButtonFor(canvasName).isVisible();
  }

  async clickDeleteButton(canvasName: string): Promise<void> {
    await this.deleteButtonFor(canvasName).click();
  }

  async getCanvasCount(): Promise<number> {
    return this.page.locator('button.canvas-list-item').count();
  }

  async canvasExists(canvasName: string): Promise<boolean> {
    return this.page.locator('button.canvas-list-item', { hasText: canvasName }).first().isVisible();
  }

  async isConfirmDialogVisible(): Promise<boolean> {
    return this.confirmDialog().isVisible();
  }

  async getConfirmationDialogText(): Promise<string> {
    return (await this.confirmDialog().textContent()) ?? '';
  }

  async cancelDelete(): Promise<void> {
    await this.cancelDialogButton().click();
  }
}
