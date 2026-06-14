import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/LoginPage';
import { SidebarPage } from '../../pages/SidebarPage';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173/';

test.describe.skip('Canvas Deletion — US-042 / SCRUM-9', () => {
  let loginPage: LoginPage;
  let sidebar: SidebarPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    sidebar = new SidebarPage(page);
    await sidebar.navigate(BASE_URL);
  });

  // TC-DELETE-001: AC-1 — delete button visible on hover
  test('TC-DELETE-001: delete button is visible on canvas list item on hover', async () => {
    await test.step('hover over a canvas list item', async () => {
      await sidebar.hoverCanvasItem('World Alpha');
    });

    await test.step('delete button appears on hover', async () => {
      expect(await sidebar.isDeleteButtonVisible('World Alpha')).toBe(true);
    });

    await test.step('move cursor away from the item', async () => {
      await sidebar.blurHover();
    });

    await test.step('delete button is hidden when not hovered', async () => {
      expect(await sidebar.isDeleteButtonVisible('World Alpha')).toBe(false);
    });
  });

  // TC-DELETE-002: AC-2 — clicking delete removes canvas from list
  test('TC-DELETE-002: clicking delete on a canvas removes it from the canvas list', async () => {
    let countBefore: number;

    await test.step('record initial canvas count', async () => {
      countBefore = await sidebar.getCanvasCount();
    });

    await test.step('hover and delete World Alpha', async () => {
      await sidebar.hoverCanvasItem('World Alpha');
      await sidebar.clickDeleteButton('World Alpha');
    });

    await test.step('World Alpha is gone from the list', async () => {
      expect(await sidebar.canvasExists('World Alpha')).toBe(false);
    });

    await test.step('canvas count decreased by one', async () => {
      expect(await sidebar.getCanvasCount()).toBe(countBefore! - 1);
    });

    await test.step('World Beta is still in the list', async () => {
      expect(await sidebar.canvasExists('World Beta')).toBe(true);
    });
  });

  // TC-DELETE-003: AC-3 — deletion emits canvas.deleted event
  test('TC-DELETE-003: deleting a canvas emits canvas.deleted event in Recent Events', async () => {
    await test.step('hover and delete World Alpha', async () => {
      await sidebar.hoverCanvasItem('World Alpha');
      await sidebar.clickDeleteButton('World Alpha');
    });

    await test.step('Recent Events panel shows canvas.deleted', async () => {
      const event = await sidebar.getLatestEventText();
      expect(event).toContain('canvas.deleted');
    });
  });

  // TC-DELETE-004: AC-4 — deleting last canvas shows confirmation dialog
  test('TC-DELETE-004: deleting the last remaining canvas shows a confirmation dialog', async () => {
    await test.step('only one canvas exists in the list', async () => {
      expect(await sidebar.getCanvasCount()).toBe(1);
    });

    await test.step('hover and attempt to delete the last canvas', async () => {
      await sidebar.hoverCanvasItem('Last Canvas');
      await sidebar.clickDeleteButton('Last Canvas');
    });

    await test.step('confirmation dialog appears', async () => {
      expect(await sidebar.isConfirmDialogVisible()).toBe(true);
    });

    await test.step('dialog warns about deleting the last canvas', async () => {
      const text = await sidebar.getConfirmationDialogText();
      expect(text).toMatch(/last|only|cannot be undone/i);
    });
  });

  // TC-DELETE-005: AC-5 — cancelling confirmation keeps canvas in list
  test('TC-DELETE-005: cancelling the confirmation dialog keeps the canvas in the list', async () => {
    let countBefore: number;

    await test.step('record canvas count before dialog', async () => {
      countBefore = await sidebar.getCanvasCount();
    });

    await test.step('trigger confirmation dialog on last canvas', async () => {
      await sidebar.hoverCanvasItem('Last Canvas');
      await sidebar.clickDeleteButton('Last Canvas');
      expect(await sidebar.isConfirmDialogVisible()).toBe(true);
    });

    await test.step('click Cancel in the dialog', async () => {
      await sidebar.cancelDelete();
    });

    await test.step('dialog is dismissed', async () => {
      expect(await sidebar.isConfirmDialogVisible()).toBe(false);
    });

    await test.step('canvas is still in the list', async () => {
      expect(await sidebar.canvasExists('Last Canvas')).toBe(true);
      expect(await sidebar.getCanvasCount()).toBe(countBefore!);
    });
  });
});
