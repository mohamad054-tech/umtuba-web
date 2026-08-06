/**
 * Engineering maturity levels (Standards §24 — derived).
 */

export type UmMaturityLevel =
  | 0 // Prototype
  | 1 // Registered
  | 2 // Boundary-Stable
  | 3 // Production-Exposed
  | 4; // Ecosystem-Critical

export type UmMaturityLevelName =
  | "prototype"
  | "registered"
  | "boundary_stable"
  | "production_exposed"
  | "ecosystem_critical";

export interface UmMaturityDescriptor {
  readonly level: UmMaturityLevel;
  readonly name: UmMaturityLevelName;
  readonly summary: string;
}

/**
 * Normative descriptors — documentation constants only (no behavior).
 */
export const UM_MATURITY_DESCRIPTORS: readonly UmMaturityDescriptor[] = [
  {
    level: 0,
    name: "prototype",
    summary: "Exists locally; no ecosystem legitimacy as a dependency target.",
  },
  {
    level: 1,
    name: "registered",
    summary: "Manifest accepted; discoverable; internal only; elevated flags default off.",
  },
  {
    level: 2,
    name: "boundary_stable",
    summary: "Contracts stable enough for dependents to design against.",
  },
  {
    level: 3,
    name: "production_exposed",
    summary: "Lawful controlled production exposure under flags and evidence.",
  },
  {
    level: 4,
    name: "ecosystem_critical",
    summary: "Many platforms depend on it; change is highly governed.",
  },
] as const;
