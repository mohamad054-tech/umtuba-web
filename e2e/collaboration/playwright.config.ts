import { defineConfig } from "playwright/test";

/**
 * Collaboration Learning link/unlink Playwright config.
 * Specs skip unless COLLABORATION_E2E=1 and PLAYWRIGHT_BASE_URL are set.
 */
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./smoke",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  // Credentialed smoke budgets: login leave-/login (45s) + panel/link/unlink waits.
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  use: {
    baseURL,
    trace: "off",
  },
});
