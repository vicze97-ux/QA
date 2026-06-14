import { test, expect } from '@playwright/test';
import { SidebarPage } from '../../pages/SidebarPage';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5173/';

test.describe('Create functionality', () => {
  let sidebar: SidebarPage;

  test.beforeEach(async ({ page }) => {
    sidebar = new SidebarPage(page);
    await sidebar.navigate(BASE_URL);
  });

  test('TC-CREATE-001: Create button is visible on load', async () => {
    expect(await sidebar.isCreateButtonVisible()).toBe(true);
  });

  test('TC-CREATE-002: Name input accepts text', async ({ page }) => {
    await sidebar.fillName('Stormhaven');
    await expect(page.locator('input[placeholder="Port Halberd"]')).toHaveValue('Stormhaven');
  });

  test('TC-CREATE-003: Type dropdown has all expected options', async ({ page }) => {
    const options = await page.locator('select').nth(1).locator('option').allTextContents();
    const expected = ['world', 'region', 'city', 'dungeon', 'relationships', 'session'];
    for (const opt of expected) {
      expect(options).toContain(opt);
    }
  });

  test('TC-CREATE-004: Creating a canvas adds it to the canvas list', async ({ page }) => {
    const countBefore = await page.locator('button.canvas-list-item').count();

    await sidebar.create('Ironveil', 'region');
    await sidebar.ensureSelectionTabActive();
    await page.waitForTimeout(400);

    const countAfter = await page.locator('button.canvas-list-item').count();
    expect(countAfter).toBeGreaterThan(countBefore);

    // Latest Recent Event is canvas.created
    const latestEvent = await sidebar.getLatestEventText();
    expect(latestEvent).toBe('canvas.created');
  });

  test('TC-CREATE-005: Creating a canvas with each type succeeds', async ({ page }) => {
    const types = ['world', 'region', 'city', 'dungeon', 'relationships', 'session'] as const;

    for (const type of types) {
      const name = `Test-${type}`;
      const listBefore = await page.locator('button.canvas-list-item').count();

      await sidebar.create(name, type);
      await sidebar.ensureSelectionTabActive();
      await page.waitForTimeout(300);

      // Canvas appears in the list
      const listAfter = await page.locator('button.canvas-list-item').count();
      expect(listAfter).toBeGreaterThan(listBefore);
    }
  });

  test('TC-CREATE-006: Search filters canvas list', async ({ page }) => {
    await sidebar.create('AlphaVault', 'world');
    await sidebar.ensureSelectionTabActive();
    await page.waitForTimeout(300);
    await sidebar.create('BetaShore', 'region');
    await sidebar.ensureSelectionTabActive();
    await page.waitForTimeout(300);

    await sidebar.search('AlphaVault');
    await page.waitForTimeout(300);

    // At least one AlphaVault visible; no BetaShore visible
    await expect(page.locator('button.canvas-list-item', { hasText: 'AlphaVault' }).first()).toBeVisible();
    await expect(page.locator('button.canvas-list-item', { hasText: 'BetaShore' }).first()).not.toBeVisible();
  });

  test('TC-CREATE-007: Clearing search restores full canvas list', async ({ page }) => {
    await sidebar.create('GammaRidge', 'city');
    await sidebar.ensureSelectionTabActive();
    await page.waitForTimeout(300);

    await sidebar.search('GammaRidge');
    await page.waitForTimeout(200);
    await sidebar.clearSearch();
    await page.waitForTimeout(300);

    // At least one canvas-list-item visible again
    const items = page.locator('button.canvas-list-item');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(1);
  });

  test('TC-CREATE-008: Name field clears after creating a canvas', async ({ page }) => {
    await sidebar.create('DeltaFort', 'dungeon');
    await page.waitForTimeout(300);

    // App clears the name field after a successful create
    const value = await page.locator('input[placeholder="Port Halberd"]').inputValue();
    expect(value).toBe('');
  });
});
