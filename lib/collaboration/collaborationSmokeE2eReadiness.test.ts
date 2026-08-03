/**
 * Collaboration Platform — Smoke & E2E Readiness V1 contracts.
 * Proves completed chain inventory + fail-closed gate + no cross-domain leakage.
 * Does not run credentialed remote mutation.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COLLABORATION_PLATFORM_DISABLED_MESSAGE,
  isCollaborationPlatformEnabled,
  rejectIfCollaborationPlatformDisabled,
} from "./collaborationPlatformGate";
import {
  COLLABORATION_SMOKE_CAPABILITY,
  COLLABORATION_SMOKE_CHAIN,
  COLLABORATION_SMOKE_DEFERRED,
  COLLABORATION_SMOKE_ENV,
  COLLABORATION_SMOKE_FLOWS,
  COLLABORATION_SMOKE_LIB_MODULES,
  COLLABORATION_SMOKE_MIGRATIONS,
  COLLABORATION_SMOKE_NAMESPACE,
  COLLABORATION_SMOKE_ROUTE_MODULES,
  COLLABORATION_SMOKE_TESTIDS,
  COLLABORATION_SMOKE_UI_MODULES,
  collaborationSmokeCredentialsPresent,
} from "./collaborationSmokeE2eReadiness";
import {
  COLLABORATION_MEMBERSHIP_RUNTIME_RPCS,
  createCollaborationWorkspace,
  inviteCollaborationWorkspaceMember,
  acceptCollaborationWorkspaceInvite,
  leaveCollaborationWorkspace,
} from "./workspaceMembershipRuntime";
import {
  getCollaborationWorkspaceDetail,
  listCollaborationWorkspaceInvites,
  listCollaborationWorkspaceMembers,
  listMyCollaborationWorkspaces,
} from "./workspaceQueries";
import { COLLABORATION_PLATFORM_ENABLED } from "./workspaceSpineFoundation";
import { COLLABORATION_UI_COPY, COLLABORATION_UI_ROUTES } from "./workspaceUi";

const ROOT = process.cwd();

const OPS_DOC =
  "docs/collaboration/operations/COLLABORATION_SMOKE_E2E_READINESS_V1.md";
const CONFIG_EXAMPLE = "scripts/collaboration-e2e/config.example.sql";
const GATE_OFF = "scripts/collaboration-e2e/run-gate-off-checks.md";
const PLAYWRIGHT_SPEC = "e2e/collaboration/smoke/platform-gate.spec.ts";
const PLAYWRIGHT_CONFIG = "e2e/collaboration/playwright.config.ts";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Collaboration Smoke & E2E Readiness V1", () => {
  it("registers capability, chain, flows, and namespace", () => {
    expect(COLLABORATION_SMOKE_CAPABILITY).toBe(
      "collaboration.ops.smoke_e2e_readiness_v1"
    );
    expect(COLLABORATION_SMOKE_NAMESPACE).toBe(
      "UMTUBA_COLLABORATION_E2E_20260803"
    );
    expect(COLLABORATION_SMOKE_CHAIN).toEqual([
      "spine_foundation",
      "membership_runtime",
      "ui_foundation",
    ]);
    expect(COLLABORATION_SMOKE_FLOWS).toHaveLength(9);
    expect(COLLABORATION_SMOKE_DEFERRED).toContain(
      "credentialed_browser_e2e_with_dedicated_auth_users"
    );
  });

  it("ships completed-chain modules, migrations, routes, and UI", () => {
    for (const rel of [
      ...COLLABORATION_SMOKE_LIB_MODULES,
      ...COLLABORATION_SMOKE_UI_MODULES,
      ...COLLABORATION_SMOKE_ROUTE_MODULES,
      ...COLLABORATION_SMOKE_MIGRATIONS,
      OPS_DOC,
      CONFIG_EXAMPLE,
      GATE_OFF,
      PLAYWRIGHT_SPEC,
      PLAYWRIGHT_CONFIG,
    ]) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("exposes critical-path adapters for list/detail/members/invites/create/invite", () => {
    expect(typeof listMyCollaborationWorkspaces).toBe("function");
    expect(typeof getCollaborationWorkspaceDetail).toBe("function");
    expect(typeof listCollaborationWorkspaceMembers).toBe("function");
    expect(typeof listCollaborationWorkspaceInvites).toBe("function");
    expect(typeof createCollaborationWorkspace).toBe("function");
    expect(typeof inviteCollaborationWorkspaceMember).toBe("function");
    expect(typeof acceptCollaborationWorkspaceInvite).toBe("function");
    expect(typeof leaveCollaborationWorkspace).toBe("function");
    expect(COLLABORATION_MEMBERSHIP_RUNTIME_RPCS.create).toMatch(
      /create_collaboration_workspace/
    );
    expect(COLLABORATION_UI_ROUTES.root).toBe("/workspaces");
    expect(COLLABORATION_UI_ROUTES.inviteRedeem).toBe("/workspaces/invite");
    expect(COLLABORATION_UI_ROUTES.workspace("x")).toBe("/workspaces/x");
    expect(COLLABORATION_UI_ROUTES.members("x")).toBe("/workspaces/x/members");
    expect(COLLABORATION_UI_ROUTES.invites("x")).toBe("/workspaces/x/invites");
  });

  it("keeps platform gate fail-closed by default", () => {
    expect(COLLABORATION_PLATFORM_ENABLED).toBe(false);
    expect(isCollaborationPlatformEnabled({})).toBe(false);
    expect(rejectIfCollaborationPlatformDisabled({})).toEqual({
      ok: false,
      message: COLLABORATION_PLATFORM_DISABLED_MESSAGE,
    });
    const layout = read("app/workspaces/layout.tsx");
    expect(layout).toMatch(/requireCollaborationPlatformPage/);
    const actions = read("app/actions/collaboration.ts");
    expect(actions).toMatch(/rejectIfCollaborationPlatformDisabled/);
  });

  it("wires Playwright-ready data-testid anchors on shell and lists", () => {
    const shell = read("app/components/collaboration/CollaborationShell.tsx");
    expect(shell).toContain(`data-testid="${COLLABORATION_SMOKE_TESTIDS.shell}"`);
    expect(shell).toContain(`data-testid="${COLLABORATION_SMOKE_TESTIDS.nav}"`);

    const list = read("app/components/collaboration/WorkspaceList.tsx");
    expect(list).toContain(
      `data-testid="${COLLABORATION_SMOKE_TESTIDS.workspaceList}"`
    );

    const members = read("app/components/collaboration/MembersList.tsx");
    expect(members).toContain(
      `data-testid="${COLLABORATION_SMOKE_TESTIDS.membersList}"`
    );

    const invites = read("app/components/collaboration/InvitationsList.tsx");
    expect(invites).toContain(
      `data-testid="${COLLABORATION_SMOKE_TESTIDS.invitesList}"`
    );
  });

  it("keeps credentialed E2E opt-in closed without COLLABORATION_E2E=1", () => {
    expect(
      collaborationSmokeCredentialsPresent({
        COLLABORATION_E2E: "0",
        PLAYWRIGHT_BASE_URL: "http://localhost:3000",
        COLLABORATION_E2E_OWNER_EMAIL: "e2e@example.com",
        COLLABORATION_E2E_OWNER_PASSWORD: "x",
      })
    ).toBe(false);
    expect(
      collaborationSmokeCredentialsPresent({
        COLLABORATION_E2E: "1",
        PLAYWRIGHT_BASE_URL: "http://localhost:3000",
        COLLABORATION_E2E_OWNER_EMAIL: "e2e@example.com",
        COLLABORATION_E2E_OWNER_PASSWORD: "x",
      })
    ).toBe(true);
    expect(COLLABORATION_SMOKE_ENV.platformFlag).toBe(
      "COLLABORATION_PLATFORM_ENABLED"
    );
  });

  it("forbids Learning course-workspace, Commerce, LiveKit, and tutor bindings in collab UI/actions", () => {
    const surfaces = [
      "app/actions/collaboration.ts",
      "app/components/collaboration/CollaborationShell.tsx",
      "lib/collaboration/workspaceUi.ts",
      "lib/collaboration/workspaceQueries.ts",
      "lib/collaboration/workspaceMembershipRuntime.ts",
    ];
    for (const rel of surfaces) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/learning\/courses|CollaborationWorkspaceShell/);
      expect(src, rel).not.toMatch(/stripe|commerce_confirm|storeMarketplace/i);
      expect(src, rel).not.toMatch(/LIVEKIT_|mintLiveMediaToken/);
      expect(src, rel).not.toMatch(/ensure_my_learning_ai_tutor/);
    }
  });

  it("documents deferred credentialed E2E and out-of-scope domains", () => {
    const doc = read(OPS_DOC);
    expect(doc).toContain(COLLABORATION_SMOKE_NAMESPACE);
    expect(doc).toContain(COLLABORATION_SMOKE_CAPABILITY);
    expect(doc).toMatch(/fail-closed|fail closed/i);
    expect(doc).toMatch(/COLLABORATION_PLATFORM_ENABLED/);
    expect(doc).toMatch(/deferred|credential/i);
    expect(doc).toMatch(/Commerce|Learning course|LiveKit/i);
    expect(doc).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);

    const cfg = read(CONFIG_EXAMPLE);
    expect(cfg).toContain(COLLABORATION_SMOKE_NAMESPACE);
    expect(cfg).toContain("config.local.sql");
    expect(cfg).toContain("ACCOUNT_BLOCKER");
    const cfgExec = cfg
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.replace(/--.*$/, ""))
      .join("\n");
    expect(cfgExec).not.toMatch(/\binsert\s+into\s+auth\.users\b/i);

    const gateOff = read(GATE_OFF);
    expect(gateOff).toContain("notFound");
    expect(gateOff).toContain("COLLABORATION_PLATFORM_ENABLED");

    const spec = read(PLAYWRIGHT_SPEC);
    expect(spec).toMatch(/test\.(skip|describe)/);
    expect(spec).toContain(COLLABORATION_SMOKE_TESTIDS.shell);
  });

  it("keeps Arabic-first brand copy on UI foundation", () => {
    expect(COLLABORATION_UI_COPY.brand).toBe("UMTUBA Collaboration");
    expect(COLLABORATION_UI_COPY.workspacesTitle).toMatch(/مساحات/);
  });
});
