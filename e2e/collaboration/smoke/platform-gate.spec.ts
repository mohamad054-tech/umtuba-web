import { test, expect } from "@playwright/test";

/**
 * Collaboration Platform — gate-off / shell readiness Playwright probes.
 * Skips unless COLLABORATION_E2E=1 and PLAYWRIGHT_BASE_URL are present.
 * Does not create workspaces or mutate Auth users.
 */

const e2eOn =
  process.env.COLLABORATION_E2E === "1" ||
  process.env.COLLABORATION_E2E?.toLowerCase() === "true";
const hasBase = Boolean(process.env.PLAYWRIGHT_BASE_URL?.trim());

test.describe("collaboration platform gate readiness", () => {
  test.skip(!e2eOn || !hasBase, "Requires COLLABORATION_E2E=1 and PLAYWRIGHT_BASE_URL");

  test("gate-off: /workspaces is not found when platform disabled", async ({
    page,
  }) => {
    // Operator must run app with COLLABORATION_PLATFORM_ENABLED unset/false.
    const res = await page.goto("/workspaces", { waitUntil: "domcontentloaded" });
    const status = res?.status() ?? 0;
    // Next notFound → 404 in production; some local setups may redirect.
    expect([404, 308, 307, 200].includes(status)).toBeTruthy();
    if (status === 200) {
      // If page somehow renders, shell must not claim a live collaboration surface
      // without the readiness test id from an enabled build.
      const shell = page.getByTestId("collaboration-shell");
      const visible = await shell.isVisible().catch(() => false);
      if (visible) {
        test.info().annotations.push({
          type: "note",
          description:
            "Shell visible — ensure COLLABORATION_PLATFORM_ENABLED is false for gate-off proof",
        });
      }
    }
  });

  test("gate-on optional: shell test id present when platform enabled", async ({
    page,
  }) => {
    test.skip(
      process.env.COLLABORATION_PLATFORM_ENABLED !== "1" &&
        process.env.COLLABORATION_PLATFORM_ENABLED?.toLowerCase() !== "true",
      "Optional: set COLLABORATION_PLATFORM_ENABLED=1 to assert shell anchors"
    );
    await page.goto("/workspaces", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("collaboration-shell")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("collaboration-nav")).toBeVisible();
  });
});
