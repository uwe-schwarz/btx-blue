import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 60000,
  workers: process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : undefined,
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:4321",
    headless: true,
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    },
  },
});
