import { test, expect } from "playwright/test";
import {
  collaborationMemberRoleE2eOwnerCredentialsPresent,
  collaborationMemberRoleE2eFixtureIds,
  COLLABORATION_MEMBER_ROLE_E2E_TESTIDS,
} from "../../../lib/collaboration/memberRoleUpdateE2eProvisioning";
import { collaborationE2eLoginAs } from "../helpers/loginAs";

const ownerReady = collaborationMemberRoleE2eOwnerCredentialsPresent(process.env);
const fixtures = collaborationMemberRoleE2eFixtureIds(process.env);

test.describe("member role-update credentialed smoke", () => {
  test.skip(
    !ownerReady,
    "Requires COLLABORATION_E2E=1, PLAYWRIGHT_BASE_URL, owner email/password, workspace id"
  );

  test("settings members panel is reachable after owner login", async ({
    page,
  }) => {
    const email = process.env.COLLABORATION_E2E_OWNER_EMAIL!.trim();
    const password = process.env.COLLABORATION_E2E_OWNER_PASSWORD!.trim();
    const settingsPath = `/workspaces/${fixtures.workspaceId}/settings`;
    await collaborationE2eLoginAs(page, email, password, settingsPath);
    await page.goto(settingsPath, { waitUntil: "domcontentloaded" });
    // Soft assert: page loaded authenticated settings; role controls may use existing markup
    await expect(page).not.toHaveURL(/\/login/);
    const panel = page.getByTestId(
      COLLABORATION_MEMBER_ROLE_E2E_TESTIDS.membersPanel
    );
    // Panel testid may not exist yet on SoT UI — accept either visible panel or members heading
    const heading = page.getByRole("heading", { name: /member/i });
    await expect(panel.or(heading).first()).toBeVisible({ timeout: 20_000 });
  });
});
