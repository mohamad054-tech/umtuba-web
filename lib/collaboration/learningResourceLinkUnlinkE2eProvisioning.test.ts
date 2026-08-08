/**
 * Structural contracts for Learning link/unlink E2E provisioning V1.
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
  COLLABORATION_LEARNING_LINK_E2E_CAPABILITY,
  COLLABORATION_LEARNING_LINK_E2E_ENV,
  COLLABORATION_LEARNING_LINK_E2E_FIXTURES,
  COLLABORATION_LEARNING_LINK_E2E_FLOWS,
  COLLABORATION_LEARNING_LINK_E2E_MODULES,
  COLLABORATION_LEARNING_LINK_E2E_NAMESPACE,
  COLLABORATION_LEARNING_LINK_E2E_TESTIDS,
  collaborationLearningLinkUnlinkE2eOptIn,
  collaborationLearningLinkUnlinkFixtureIds,
  collaborationLearningLinkUnlinkFullCredentialsPresent,
  collaborationLearningLinkUnlinkOwnerCredentialsPresent,
} from "./learningResourceLinkUnlinkE2eProvisioning";
import { COLLABORATION_PLATFORM_ENABLED } from "./workspaceSpineFoundation";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Collaboration Learning Link/Unlink E2E Provisioning V1", () => {
  it("registers capability, namespace, flows, and fixed fixtures", () => {
    expect(COLLABORATION_LEARNING_LINK_E2E_CAPABILITY).toBe(
      "collaboration.ops.learning_link_unlink_e2e_provisioning_v1"
    );
    expect(COLLABORATION_LEARNING_LINK_E2E_NAMESPACE).toBe(
      "UMTUBA_COLLABORATION_LEARNING_LINK_E2E_20260808"
    );
    expect(COLLABORATION_LEARNING_LINK_E2E_FLOWS.length).toBeGreaterThanOrEqual(
      6
    );
    expect(COLLABORATION_LEARNING_LINK_E2E_FIXTURES.workspaceSlug).toMatch(
      /^e2e-collab-ws-link-/
    );
    expect(COLLABORATION_LEARNING_LINK_E2E_FIXTURES.learningSpaceSlug).toMatch(
      /^e2e-collab-learning-link-/
    );
  });

  it("ships SoT harness modules, templates, and Playwright specs", () => {
    for (const rel of Object.values(COLLABORATION_LEARNING_LINK_E2E_MODULES)) {
      expect(existsSync(join(ROOT, rel)), rel).toBe(true);
    }
  });

  it("keeps credentialed opt-in closed until COLLABORATION_E2E=1", () => {
    expect(
      collaborationLearningLinkUnlinkE2eOptIn({
        COLLABORATION_E2E: "0",
      })
    ).toBe(false);
    expect(
      collaborationLearningLinkUnlinkOwnerCredentialsPresent({
        COLLABORATION_E2E: "1",
        PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3000",
        COLLABORATION_E2E_OWNER_EMAIL: "owner@example.com",
        COLLABORATION_E2E_OWNER_PASSWORD: "x",
      })
    ).toBe(true);
    expect(
      collaborationLearningLinkUnlinkFullCredentialsPresent({
        COLLABORATION_E2E: "1",
        PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3000",
        COLLABORATION_E2E_OWNER_EMAIL: "owner@example.com",
        COLLABORATION_E2E_OWNER_PASSWORD: "x",
      })
    ).toBe(false);
    expect(
      collaborationLearningLinkUnlinkFullCredentialsPresent({
        COLLABORATION_E2E: "1",
        PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3000",
        COLLABORATION_E2E_OWNER_EMAIL: "owner@example.com",
        COLLABORATION_E2E_OWNER_PASSWORD: "x",
        COLLABORATION_E2E_PEER_EMAIL: "peer@example.com",
        COLLABORATION_E2E_PEER_PASSWORD: "y",
      })
    ).toBe(true);
    expect(COLLABORATION_LEARNING_LINK_E2E_ENV.platformFlag).toBe(
      "COLLABORATION_PLATFORM_ENABLED"
    );
  });

  it("resolves fixture ids from defaults or env overrides", () => {
    expect(collaborationLearningLinkUnlinkFixtureIds({})).toEqual({
      workspaceId: COLLABORATION_LEARNING_LINK_E2E_FIXTURES.workspaceId,
      learningSpaceId: COLLABORATION_LEARNING_LINK_E2E_FIXTURES.learningSpaceId,
    });
    expect(
      collaborationLearningLinkUnlinkFixtureIds({
        COLLABORATION_E2E_WORKSPACE_ID:
          "11111111-1111-4111-8111-111111111111",
        COLLABORATION_E2E_LEARNING_SPACE_ID:
          "22222222-2222-4222-8222-222222222222",
      })
    ).toEqual({
      workspaceId: "11111111-1111-4111-8111-111111111111",
      learningSpaceId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("keeps platform gate fail-closed by default", () => {
    expect(COLLABORATION_PLATFORM_ENABLED).toBe(false);
    expect(isCollaborationPlatformEnabled({})).toBe(false);
    expect(rejectIfCollaborationPlatformDisabled({})).toEqual({
      ok: false,
      message: COLLABORATION_PLATFORM_DISABLED_MESSAGE,
    });
  });

  it("wires Playwright anchors for shell, lists, and learning panel", () => {
    const shell = read("app/components/collaboration/CollaborationShell.tsx");
    expect(shell).toContain(
      `data-testid="${COLLABORATION_LEARNING_LINK_E2E_TESTIDS.shell}"`
    );
    expect(shell).toContain(
      `data-testid="${COLLABORATION_LEARNING_LINK_E2E_TESTIDS.nav}"`
    );

    const list = read("app/components/collaboration/WorkspaceList.tsx");
    expect(list).toContain(
      `data-testid="${COLLABORATION_LEARNING_LINK_E2E_TESTIDS.workspaceList}"`
    );

    const members = read("app/components/collaboration/MembersList.tsx");
    expect(members).toContain(
      `data-testid="${COLLABORATION_LEARNING_LINK_E2E_TESTIDS.membersList}"`
    );

    const panel = read(
      "app/components/collaboration/LearningResourceLinksPanel.tsx"
    );
    expect(panel).toContain(
      `data-testid="${COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningLinksPanel}"`
    );
    expect(panel).toContain(
      `data-testid="${COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningLinkSubmit}"`
    );
    expect(panel).toContain(
      `data-testid="${COLLABORATION_LEARNING_LINK_E2E_TESTIDS.learningUnlinkSubmit}"`
    );
  });

  it("documents operator provisioning without embedding secrets", () => {
    const ops = read(COLLABORATION_LEARNING_LINK_E2E_MODULES.opsDoc);
    expect(ops).toContain(COLLABORATION_LEARNING_LINK_E2E_NAMESPACE);
    expect(ops).toMatch(/COLLABORATION_E2E=1/);
    expect(ops).toMatch(/Auth UI|Admin API/i);
    expect(ops).not.toMatch(/sk-[a-zA-Z0-9]{20,}/);
    expect(ops).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./);

    const cfg = read(COLLABORATION_LEARNING_LINK_E2E_MODULES.configExample);
    expect(cfg).toContain("config.local.sql");
    expect(cfg).toContain("ACCOUNT_BLOCKER");
    const cfgExec = cfg
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.replace(/--.*$/, ""))
      .join("\n");
    expect(cfgExec).not.toMatch(/\binsert\s+into\s+auth\.users\b/i);

    const seed = read(COLLABORATION_LEARNING_LINK_E2E_MODULES.seedExample);
    expect(seed).toContain("ACCOUNT_BLOCKER");
    expect(seed).toContain(COLLABORATION_LEARNING_LINK_E2E_FIXTURES.workspaceId);
    const seedExec = seed
      .replace(/\r/g, "")
      .split("\n")
      .map((line) => line.replace(/--.*$/, ""))
      .join("\n");
    expect(seedExec).not.toMatch(/\binsert\s+into\s+auth\.users\b/i);

    const cleanup = read(COLLABORATION_LEARNING_LINK_E2E_MODULES.cleanupExample);
    expect(cleanup).toContain("collaboration_workspace_resource_links");
    expect(cleanup).toContain(COLLABORATION_LEARNING_LINK_E2E_FIXTURES.workspaceId);

    const spec = read(COLLABORATION_LEARNING_LINK_E2E_MODULES.linkUnlinkSpec);
    expect(spec).toMatch(/test\.skip/);
    expect(spec).toContain("learningLinksPanel");
    expect(spec).toContain("COLLABORATION_LEARNING_LINK_E2E_TESTIDS");
    expect(spec).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("gitignore protects local collaboration E2E config", () => {
    const ignore = read(".gitignore");
    expect(ignore).toMatch(/scripts\/collaboration-e2e\/config\.local\.sql/);
  });
});
