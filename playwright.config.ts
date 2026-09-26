import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 60000,
  testDir: "./tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:4321",
    headless: true,
  },
});
