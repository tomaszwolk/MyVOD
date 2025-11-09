import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Recreate __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read from default ".env" file.
dotenv.config({ path: path.resolve(__dirname, '.env.tests') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Increase action timeout for slow database operations */
    actionTimeout: 60000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: '**/scenario-4-profile-management.spec.ts', // Wyklucz scenariusz 4 (wymaga storageState)
    },
    {
      name: 'scenario-4',
      testMatch: '**/scenario-4-profile-management.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/e2e/setup/scenario-4-auth-state.json',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'uv run python manage.py runserver',
      url: 'http://localhost:8000',
      reuseExistingServer: false,   // !process.env.CI,
      cwd: path.resolve(__dirname, '../../backend/myVOD'),
      env: {
        USE_E2E_TEST_DATABASE: 'true',
        SUPABASE_DB_HOST: process.env.SUPABASE_DB_HOST,
        SUPABASE_DB_PORT: process.env.SUPABASE_DB_PORT,
        SUPABASE_DB_USER: process.env.SUPABASE_DB_USER,
        SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
        SUPABASE_DB_NAME: process.env.SUPABASE_DB_NAME,
        SECRET_KEY: process.env.SECRET_KEY,
        DEBUG: process.env.DEBUG || 'True',
        CACHE_URL: '', // Force LocMemCache instead of Redis for E2E tests
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
