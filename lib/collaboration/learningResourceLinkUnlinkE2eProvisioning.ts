/**
 * Collaboration ↔ Learning link/unlink credentialed E2E provisioning V1.
 *
 * SoT-owned opt-in harness contracts only.
 * Does not invent Auth users, print secrets, or weaken RLS.
 * Credentialed runs remain operator-provisioned.
 */

export const COLLABORATION_LEARNING_LINK_E2E_NAMESPACE =
  "UMTUBA_COLLABORATION_LEARNING_LINK_E2E_20260808" as const;

export const COLLABORATION_LEARNING_LINK_E2E_CAPABILITY =
  "collaboration.ops.learning_link_unlink_e2e_provisioning_v1" as const;

/** Opt-in env names (never commit values). */
export const COLLABORATION_LEARNING_LINK_E2E_ENV = {
  enabled: "COLLABORATION_E2E",
  baseUrl: "PLAYWRIGHT_BASE_URL",
  platformFlag: "COLLABORATION_PLATFORM_ENABLED",
  ownerEmail: "COLLABORATION_E2E_OWNER_EMAIL",
  ownerPassword: "COLLABORATION_E2E_OWNER_PASSWORD",
  peerEmail: "COLLABORATION_E2E_PEER_EMAIL",
  peerPassword: "COLLABORATION_E2E_PEER_PASSWORD",
  workspaceId: "COLLABORATION_E2E_WORKSPACE_ID",
  learningSpaceId: "COLLABORATION_E2E_LEARNING_SPACE_ID",
} as const;

/** Fixed disposable sandbox identifiers (namespace-scoped). */
export const COLLABORATION_LEARNING_LINK_E2E_FIXTURES = {
  workspaceId: "e2e0808c-2026-4001-8000-000000000001",
  workspaceSlug: "e2e-collab-ws-link-20260808",
  learningSpaceId: "e2e0808c-2026-4001-8000-000000000011",
  learningSpaceSlug: "e2e-collab-learning-link-20260808",
} as const;

export const COLLABORATION_LEARNING_LINK_E2E_TESTIDS = {
  shell: "collaboration-shell",
  nav: "collaboration-nav",
  workspaceList: "collaboration-workspace-list",
  membersList: "collaboration-members-list",
  learningLinksPanel: "collaboration-learning-links-panel",
  learningLinkRow: "collaboration-learning-link-row",
  learningLinkSubmit: "collaboration-learning-link-submit",
  learningUnlinkSubmit: "collaboration-learning-unlink-submit",
} as const;

export const COLLABORATION_LEARNING_LINK_E2E_FLOWS = [
  "platform_gate_fail_closed",
  "owner_view_linked_and_eligible",
  "owner_link_learning_space",
  "owner_unlink_learning_space",
  "peer_read_only_view",
  "peer_unauthorized_mutation_fail_closed",
  "cleanup_no_orphan_link",
] as const;

export const COLLABORATION_LEARNING_LINK_E2E_MODULES = {
  lib: "lib/collaboration/learningResourceLinkUnlinkE2eProvisioning.ts",
  binding: "lib/collaboration/learningWorkspaceResourceBinding.ts",
  panel: "app/components/collaboration/LearningResourceLinksPanel.tsx",
  actions: "app/actions/collaboration.ts",
  settingsPage: "app/workspaces/[workspaceId]/settings/page.tsx",
  gate: "lib/collaboration/collaborationPlatformGate.ts",
  configExample: "scripts/collaboration-e2e/config.example.sql",
  seedExample: "scripts/collaboration-e2e/seed-learning-link-unlink-sandbox.example.sql",
  cleanupExample:
    "scripts/collaboration-e2e/cleanup-learning-link-unlink-sandbox.example.sql",
  gateOffDoc: "scripts/collaboration-e2e/run-gate-off-checks.md",
  operatorDoc: "scripts/collaboration-e2e/OPERATOR_PROVISIONING.md",
  opsDoc:
    "docs/collaboration/operations/COLLABORATION_LEARNING_LINK_UNLINK_E2E_PROVISIONING_V1.md",
  playwrightConfig: "e2e/collaboration/playwright.config.ts",
  playwrightLoginHelper: "e2e/collaboration/helpers/loginAs.ts",
  platformGateSpec: "e2e/collaboration/smoke/platform-gate.spec.ts",
  linkUnlinkSpec: "e2e/collaboration/smoke/learning-link-unlink.spec.ts",
} as const;

export function collaborationLearningLinkUnlinkE2eOptIn(
  env: Record<string, string | undefined> = process.env
): boolean {
  const flag = (env[COLLABORATION_LEARNING_LINK_E2E_ENV.enabled] ?? "").trim();
  return flag === "1" || flag.toLowerCase() === "true";
}

/** Owner credentials + base URL + opt-in (minimum for manager flow). */
export function collaborationLearningLinkUnlinkOwnerCredentialsPresent(
  env: Record<string, string | undefined> = process.env
): boolean {
  if (!collaborationLearningLinkUnlinkE2eOptIn(env)) return false;
  return Boolean(
    (env[COLLABORATION_LEARNING_LINK_E2E_ENV.baseUrl] ?? "").trim() &&
      (env[COLLABORATION_LEARNING_LINK_E2E_ENV.ownerEmail] ?? "").trim() &&
      (env[COLLABORATION_LEARNING_LINK_E2E_ENV.ownerPassword] ?? "").trim()
  );
}

/** Full matrix requires peer credentials as well. */
export function collaborationLearningLinkUnlinkFullCredentialsPresent(
  env: Record<string, string | undefined> = process.env
): boolean {
  if (!collaborationLearningLinkUnlinkOwnerCredentialsPresent(env)) return false;
  return Boolean(
    (env[COLLABORATION_LEARNING_LINK_E2E_ENV.peerEmail] ?? "").trim() &&
      (env[COLLABORATION_LEARNING_LINK_E2E_ENV.peerPassword] ?? "").trim()
  );
}

export function collaborationLearningLinkUnlinkFixtureIds(
  env: Record<string, string | undefined> = process.env
): {
  workspaceId: string;
  learningSpaceId: string;
} {
  const workspaceId =
    (env[COLLABORATION_LEARNING_LINK_E2E_ENV.workspaceId] ?? "").trim() ||
    COLLABORATION_LEARNING_LINK_E2E_FIXTURES.workspaceId;
  const learningSpaceId =
    (env[COLLABORATION_LEARNING_LINK_E2E_ENV.learningSpaceId] ?? "").trim() ||
    COLLABORATION_LEARNING_LINK_E2E_FIXTURES.learningSpaceId;
  return { workspaceId, learningSpaceId };
}
