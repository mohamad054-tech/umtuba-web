import { test, expect, type Page } from "playwright/test";
import {
  COLLABORATION_LEARNING_LINK_E2E_TESTIDS,
  collaborationLearningLinkUnlinkFixtureIds,
  collaborationLearningLinkUnlinkFullCredentialsPresent,
  collaborationLearningLinkUnlinkOwnerCredentialsPresent,
} from "../../../lib/collaboration/learningResourceLinkUnlinkE2eProvisioning";

/**
 * Credentialed Learning link/unlink smoke.
 * Skips unless COLLABORATION_E2E=1 + base URL + owner credentials.
 * Peer matrix requires peer credentials.
 * Uses real login form — no session injection / service-role browser path.
 */

const ownerReady = collaborationLearningLinkUnlinkOwnerCredentialsPresent(
  process.env
);
const fullReady = collaborationLearningLinkUnlinkFullCredentialsPresent(
  process.env
);
const fixtures = collaborationLearningLinkUnlinkFixtureIds(process.env);

/** Controlled React AuthField: set native value + input/change so onChange fires. */
async function fillControlledInput(page: Page, name: string, value: string) {
  const input = page.locator(`input[name="${name}"]`);
  await input.waitFor({ state: "visible" });
  await input.evaluate((el, v) => {
    const desc = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    );
    desc?.set?.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function loginAs(
  page: Page,
  email: string,
  password: string,
  nextPath: string
) {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "networkidle",
  });
  const emailInput = page.locator('input[name="email"]');
  const submit = page.locator('form button[type="submit"]');
  await emailInput.waitFor({ state: "visible" });
  await submit.waitFor({ state: "visible" });
  // Force client hydration: interact before setting credentials.
  await emailInput.click();
  await page.keyboard.type("x");
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(500);
  await fillControlledInput(page, "email", email);
  await fillControlledInput(page, "password", password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 60_000,
    }),
    submit.click(),
  ]);
}

test.describe("learning link/unlink credentialed smoke", () => {
  test.skip(
    !ownerReady,
    "Requires COLLABORATION_E2E=1, PLAYWRIGHT_BASE_URL, owner email/password"
  );

  test("owner can link then unlink Learning space and restore empty state", async ({
    page,
  }) => {
    const email = process.env.COLLABORATION_E2E_OWNER_EMAIL!.trim();
    const password = process.env.COLLABORATION_E2E_OWNER_PASSWORD!.trim();
    const settingsPath = `/workspaces/${fixtures.workspaceId}/settings`;

    await loginAs(page, email, password, settingsPath);
    await page.goto(settingsPath, { waitUntil: "domcontentloaded" });

    const panel = page.getByTestId(
      COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningLinksPanel
    );
    await expect(panel).toBeVisible({ timeout: 20_000 });

    // Ensure clean start: unlink any existing row for this smoke.
    const existing = page.getByTestId(
      COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningLinkRow
    );
    if (await existing.count()) {
      await page
        .getByTestId(COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningUnlinkSubmit)
        .first()
        .click();
      await expect(existing).toHaveCount(0, { timeout: 20_000 });
    }

    await page
      .getByTestId(COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningLinkSubmit)
      .click();
    await expect(
      page.getByTestId(COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningLinkRow)
    ).toHaveCount(1, { timeout: 20_000 });

    await page
      .getByTestId(COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningUnlinkSubmit)
      .first()
      .click();
    await expect(
      page.getByTestId(COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningLinkRow)
    ).toHaveCount(0, { timeout: 20_000 });
  });

  test("peer is read-only and cannot use management controls", async ({
    page,
  }) => {
    test.skip(
      !fullReady,
      "Requires peer email/password for read-only matrix"
    );

    const email = process.env.COLLABORATION_E2E_PEER_EMAIL!.trim();
    const password = process.env.COLLABORATION_E2E_PEER_PASSWORD!.trim();
    const settingsPath = `/workspaces/${fixtures.workspaceId}/settings`;

    await loginAs(page, email, password, settingsPath);
    await page.goto(settingsPath, { waitUntil: "domcontentloaded" });

    await expect(
      page.getByTestId(
        COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningLinksPanel
      )
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByTestId(
        COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningLinkSubmit
      )
    ).toHaveCount(0);
    await expect(
      page.getByTestId(
        COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningUnlinkSubmit
      )
    ).toHaveCount(0);
  });
});
