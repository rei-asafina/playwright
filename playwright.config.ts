import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./scenario",
  globalSetup: "./scenario/setup.ts",
  globalTeardown: "./scenario/teardown.ts",
  use: {
    baseURL: "http://127.0.0.1:3000",
    headless: true,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run mail:server",
      url: "http://127.0.0.1:4025/health",
      reuseExistingServer: true,
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
