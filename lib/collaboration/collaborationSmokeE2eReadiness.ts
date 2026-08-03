/**
 * Collaboration Platform — Smoke & E2E Readiness V1
 * Capability: collaboration.ops.smoke_e2e_readiness_v1
 *
 * Repository-grounded inventory for the completed Collaboration chain
 * (Spine → Membership → UI Foundation). Credentialed remote E2E remains deferred.
 */

export const COLLABORATION_SMOKE_NAMESPACE =
  "UMTUBA_COLLABORATION_E2E_20260803" as const;

export const COLLABORATION_SMOKE_CAPABILITY =
  "collaboration.ops.smoke_e2e_readiness_v1" as const;

/** Completed product chain on tip (UI Foundation closes the V1 overlay). */
export const COLLABORATION_SMOKE_CHAIN = [
  "spine_foundation",
  "membership_runtime",
  "ui_foundation",
] as const;

export type CollaborationSmokeChainStep =
  (typeof COLLABORATION_SMOKE_CHAIN)[number];

/** Critical flows covered by readiness contracts (not live credentialed E2E). */
export const COLLABORATION_SMOKE_FLOWS = [
  "platform_gate_fail_closed",
  "list_my_workspaces",
  "workspace_detail",
  "members_list",
  "invites_list",
  "create_workspace",
  "invite_member",
  "invite_redeem",
  "shell_navigation",
] as const;

export type CollaborationSmokeFlow = (typeof COLLABORATION_SMOKE_FLOWS)[number];

export const COLLABORATION_SMOKE_MIGRATIONS = [
  "supabase/migrations/20260896_collaboration_workspace_spine_foundation_v1.sql",
  "supabase/migrations/20260897_collaboration_workspace_membership_runtime_v1.sql",
] as const;

export const COLLABORATION_SMOKE_LIB_MODULES = [
  "lib/collaboration/workspaceSpineFoundation.ts",
  "lib/collaboration/workspaceMembershipRuntime.ts",
  "lib/collaboration/workspaceQueries.ts",
  "lib/collaboration/workspaceUi.ts",
  "lib/collaboration/collaborationPlatformGate.ts",
  "lib/collaboration/requireCollaborationPlatform.ts",
  "lib/collaboration/collaborationSmokeE2eReadiness.ts",
] as const;

export const COLLABORATION_SMOKE_UI_MODULES = [
  "app/components/collaboration/CollaborationShell.tsx",
  "app/components/collaboration/WorkspaceList.tsx",
  "app/components/collaboration/WorkspaceCard.tsx",
  "app/components/collaboration/WorkspaceSwitcher.tsx",
  "app/components/collaboration/MembersList.tsx",
  "app/components/collaboration/InvitationsList.tsx",
  "app/components/collaboration/CreateWorkspaceDialog.tsx",
  "app/components/collaboration/InviteMemberForm.tsx",
  "app/components/collaboration/InviteRedeemForm.tsx",
] as const;

export const COLLABORATION_SMOKE_ROUTE_MODULES = [
  "app/workspaces/layout.tsx",
  "app/workspaces/page.tsx",
  "app/workspaces/invite/page.tsx",
  "app/workspaces/[workspaceId]/page.tsx",
  "app/workspaces/[workspaceId]/members/page.tsx",
  "app/workspaces/[workspaceId]/invites/page.tsx",
  "app/actions/collaboration.ts",
] as const;

export const COLLABORATION_SMOKE_TESTIDS = {
  shell: "collaboration-shell",
  nav: "collaboration-nav",
  workspaceList: "collaboration-workspace-list",
  membersList: "collaboration-members-list",
  invitesList: "collaboration-invites-list",
} as const;

/** Opt-in env names for future credentialed runs (never commit values). */
export const COLLABORATION_SMOKE_ENV = {
  enabled: "COLLABORATION_E2E",
  baseUrl: "PLAYWRIGHT_BASE_URL",
  platformFlag: "COLLABORATION_PLATFORM_ENABLED",
  ownerEmail: "COLLABORATION_E2E_OWNER_EMAIL",
  ownerPassword: "COLLABORATION_E2E_OWNER_PASSWORD",
  peerEmail: "COLLABORATION_E2E_PEER_EMAIL",
  peerPassword: "COLLABORATION_E2E_PEER_PASSWORD",
} as const;

export const COLLABORATION_SMOKE_DEFERRED = [
  "credentialed_browser_e2e_with_dedicated_auth_users",
  "remote_sql_sandbox_seed_mutation",
  "workspace_settings_lifecycle_ui",
  "learning_course_workspace_binding",
  "realtime_chat_shared_docs",
  "livekit_media",
  "commerce_bindings",
] as const;

export function collaborationSmokeCredentialsPresent(
  env: Record<string, string | undefined> = process.env
): boolean {
  const flag = (env[COLLABORATION_SMOKE_ENV.enabled] ?? "").trim();
  if (flag !== "1" && flag.toLowerCase() !== "true") return false;
  return Boolean(
    (env[COLLABORATION_SMOKE_ENV.baseUrl] ?? "").trim() &&
      (env[COLLABORATION_SMOKE_ENV.ownerEmail] ?? "").trim() &&
      (env[COLLABORATION_SMOKE_ENV.ownerPassword] ?? "").trim()
  );
}
