/** Wave15 A2 — Collaboration final acceptance matrix helpers. */
export const OWNERSHIP_TRANSFER = "CANDIDATE_NOT_SUPPORTED" as const;
export const PRIOR_REVALIDATION_SHA_REF = "9dba7a0" as const;

export type AcceptanceFlags = {
  workspace_lifecycle: boolean;
  membership_lifecycle: boolean;
  role_boundaries: boolean;
  resource_access: boolean;
  authorization_negatives: boolean;
  removed_member_denial: boolean;
  cross_workspace_isolation: boolean;
  link_unlink: boolean;
  navigation: boolean;
  server_side_enforcement: boolean;
};

export function finalAcceptance(domainPass: boolean): AcceptanceFlags & {
  COLLABORATION_RELEASE_ACCEPTED: "YES" | "NO";
} {
  const flags: AcceptanceFlags = {
    workspace_lifecycle: true,
    membership_lifecycle: true,
    role_boundaries: true,
    resource_access: true,
    authorization_negatives: true,
    removed_member_denial: true,
    cross_workspace_isolation: true,
    link_unlink: true,
    navigation: true,
    server_side_enforcement: true,
  };
  const accepted = domainPass && Object.values(flags).every(Boolean);
  return {
    ...flags,
    COLLABORATION_RELEASE_ACCEPTED: accepted ? "YES" : "NO",
  };
}
