import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Auto-start the dev server before any test runs.
  // Set DEV_SERVER_CMD in .env (or CI env) to the command that starts your app.
  // reuseExistingServer: true means the suite won't fail if you've already started it manually.
  webServer: process.env.DEV_SERVER_CMD
    ? {
        command: process.env.DEV_SERVER_CMD,
        url: process.env.BASE_URL ?? 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    : undefined,

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {
      Accept: 'application/json',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: 'tests/e2e/**/*.spec.ts',
    },
    {
      name: 'api',
      use: {},
      testMatch: 'tests/api/**/*.spec.ts',
    },
  ],
});
