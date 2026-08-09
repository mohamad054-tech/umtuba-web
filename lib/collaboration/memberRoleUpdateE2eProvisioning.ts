/**
 * Opt-in Collaboration member role-update E2E provisioning (templates only).
 * No Auth user creation. No production DB writes from this module.
 * Gate: COLLABORATION_E2E=1 + owner credentials + workspace fixture id.
 */
export const COLLABORATION_MEMBER_ROLE_E2E_TESTIDS = {
  membersPanel: "collaboration-members-panel",
  roleSelect: "collaboration-member-role-select",
  roleSubmit: "collaboration-member-role-submit",
} as const;

export function collaborationMemberRoleE2eOwnerCredentialsPresent(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return (
    env.COLLABORATION_E2E === "1" &&
    Boolean(env.PLAYWRIGHT_BASE_URL?.trim()) &&
    Boolean(env.COLLABORATION_E2E_OWNER_EMAIL?.trim()) &&
    Boolean(env.COLLABORATION_E2E_OWNER_PASSWORD?.trim()) &&
    Boolean(env.COLLABORATION_E2E_WORKSPACE_ID?.trim())
  );
}

export function collaborationMemberRoleE2eFixtureIds(
  env: NodeJS.ProcessEnv = process.env
): { workspaceId: string; memberUserId: string | null } {
  return {
    workspaceId: (env.COLLABORATION_E2E_WORKSPACE_ID ?? "").trim(),
    memberUserId: env.COLLABORATION_E2E_MEMBER_USER_ID?.trim() || null,
  };
}
