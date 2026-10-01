import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results/development',
  testMatch: ['dev.spec.ts', '*.dev.spec.ts'],
  timeout: 60_000,
  workers: 1,
  use: {
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    baseURL: 'http://127.0.0.1:3102',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 3102',
    url: 'http://127.0.0.1:3102/pt-BR',
    reuseExistingServer: false,
  },
});
