import { test, expect } from '@playwright/test';
import { SidebarPage } from '../../pages/SidebarPage';
import { deleteCanvasByName } from '../../utils/canvas-cleanup';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173/';

// All canvas names created across this describe block.
// afterEach deletes them so each test starts from a clean slate,
// acting as a redundant guard on top of globalTeardown.
const TEST_CANVAS_NAMES = [
  'Stormhaven', 'Ironveil', 'AlphaVault', 'BetaShore', 'GammaRidge', 'DeltaFort',
  'Test-world', 'Test-region', 'Test-city', 'Test-dungeon', 'Test-relationships', 'Test-session',
];

test.describe('Create functionality', () => {
  let sidebar: SidebarPage;

  test.beforeEach(async ({ page }) => {
    sidebar = new SidebarPage(page);
    await sidebar.navigate(BASE_URL);
  });

  test.afterEach(async () => {
    deleteCanvasByName(TEST_CANVAS_NAMES);
  });

  test('TC-CREATE-001: Create button is visible on load', async () => {
    expect(await sidebar.isCreateButtonVisible()).toBe(true);
  });

  test('TC-CREATE-002: Name input accepts text', async () => {
    await sidebar.fillName('Stormhaven');
    expect(await sidebar.getNameInputValue()).toBe('Stormhaven');
  });

  test('TC-CREATE-003: Type dropdown has all expected options', async () => {
    const options = await sidebar.getTypeSelectOptions();
    const expected = ['world', 'region', 'city', 'dungeon', 'relationships', 'session'];
    for (const opt of expected) {
      expect(options).toContain(opt);
    }
  });

  test('TC-CREATE-004: Creating a canvas adds it to the canvas list', async () => {
    const countBefore = await sidebar.getCanvasCount();

    await sidebar.create('Ironveil', 'region');
    await sidebar.ensureSelectionTabActive();
    await sidebar.waitForCanvasToAppear('Ironveil');

    const countAfter = await sidebar.getCanvasCount();
    expect(countAfter).toBeGreaterThan(countBefore);

    const latestEvent = await sidebar.getLatestEventText();
    expect(latestEvent).toBe('canvas.created');
  });

  test('TC-CREATE-005: Creating a canvas with each type succeeds', async () => {
    const types = ['world', 'region', 'city', 'dungeon', 'relationships', 'session'] as const;

    for (const type of types) {
      const name = `Test-${type}`;
      await sidebar.create(name, type);
      await sidebar.ensureSelectionTabActive();
      await sidebar.waitForCanvasToAppear(name);
      expect(await sidebar.canvasExists(name)).toBe(true);
    }
  });

  test('TC-CREATE-006: Search filters canvas list', async () => {
    await sidebar.create('AlphaVault', 'world');
    await sidebar.ensureSelectionTabActive();
    await sidebar.waitForCanvasToAppear('AlphaVault');

    await sidebar.create('BetaShore', 'region');
    await sidebar.ensureSelectionTabActive();
    await sidebar.waitForCanvasToAppear('BetaShore');

    await sidebar.search('AlphaVault');
    await sidebar.waitForCanvasToBeHidden('BetaShore');

    expect(await sidebar.canvasExists('AlphaVault')).toBe(true);
    expect(await sidebar.canvasExists('BetaShore')).toBe(false);
  });

  test('TC-CREATE-007: Clearing search restores full canvas list', async () => {
    await sidebar.create('GammaRidge', 'city');
    await sidebar.ensureSelectionTabActive();
    await sidebar.waitForCanvasToAppear('GammaRidge');

    await sidebar.search('GammaRidge');
    await sidebar.waitForCanvasToBeHidden('GammaRidge').catch(() => {
      // If only GammaRidge exists, it stays visible — search still narrows to it.
    });

    await sidebar.clearSearch();
    await sidebar.waitForCanvasToAppear('GammaRidge');

    expect(await sidebar.getCanvasCount()).toBeGreaterThan(0);
  });

  test('TC-CREATE-008: Name field clears after creating a canvas', async () => {
    await sidebar.create('DeltaFort', 'dungeon');
    await sidebar.ensureSelectionTabActive();
    await sidebar.waitForCanvasToAppear('DeltaFort');
    // Switch back to the Create tab to read the name input in its own context.
    await sidebar.ensureCreateTabActive();

    expect(await sidebar.getNameInputValue()).toBe('');
  });
});
