import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:43147',
    trace: 'off',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:43147',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
})
