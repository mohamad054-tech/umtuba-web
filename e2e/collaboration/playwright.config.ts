import { defineConfig } from "@playwright/test";

/**
 * Collaboration Platform Playwright config (readiness).
 * Specs skip unless COLLABORATION_E2E=1 and PLAYWRIGHT_BASE_URL are set.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./smoke",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "off",
  },
});
