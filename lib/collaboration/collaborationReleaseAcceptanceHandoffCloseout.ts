/** Wave16 A2 — Collaboration acceptance handoff closeout / drift check. */
export const PRIOR_ACCEPTANCE_SHA_REF = "ab9cca3" as const;
export const OWNERSHIP_TRANSFER = "CANDIDATE_NOT_SUPPORTED" as const;

export type DriftArea =
  | "membership"
  | "roles"
  | "resource_access"
  | "authorization"
  | "isolation"
  | "none";

/** Drift check against accepted Wave15 matrix — no full re-acceptance suite. */
export function checkAcceptanceDrift(opts: {
  soTMatchesAcceptedSurfaces: boolean;
  unexpectedOwnershipTransfer: boolean;
  unexpectedNewRoles: boolean;
}): { COLLABORATION_ACCEPTANCE_STILL_VALID: "YES" | "NO"; DRIFT_FOUND: DriftArea[] } {
  const drift: DriftArea[] = [];
  if (!opts.soTMatchesAcceptedSurfaces) {
    drift.push("membership", "roles", "resource_access", "authorization", "isolation");
  }
  if (opts.unexpectedOwnershipTransfer || opts.unexpectedNewRoles) {
    drift.push("roles");
  }
  const unique = [...new Set(drift)];
  return {
    COLLABORATION_ACCEPTANCE_STILL_VALID: unique.length ? "NO" : "YES",
    DRIFT_FOUND: unique.length ? unique : ["none"],
  };
}
