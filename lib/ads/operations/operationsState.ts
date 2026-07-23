/**
 * Ads Platform Operations State V1 — centralized operational mode.
 *
 * Production may exist as an enum value for planning, but V1 never activates
 * production-enabled serving/billing. Fail closed.
 */

export const ADS_OPERATIONS_STATE_CONTRACT_VERSION = "v1" as const;

export const ADS_PLATFORM_OPERATIONAL_STATES = [
  "development",
  "internal",
  "qa",
  "beta",
  "production",
] as const;

export type AdsPlatformOperationalState =
  (typeof ADS_PLATFORM_OPERATIONAL_STATES)[number];

/**
 * Frozen V1 active state. Production is never the active operational mode.
 */
export const ADS_PLATFORM_ACTIVE_OPERATIONAL_STATE = "development" as const;

export const ADS_OPERATIONS_STATE_AUTHORITY = {
  productionEnabled: false,
  productionAccepted: false,
  authoritativeProductionServing: false,
  billingEnabled: false,
  deliveryEnabled: false,
} as const;

export type AdsOperationalStateSnapshot = Readonly<{
  contractVersion: typeof ADS_OPERATIONS_STATE_CONTRACT_VERSION;
  activeState: typeof ADS_PLATFORM_ACTIVE_OPERATIONAL_STATE;
  allowedStates: typeof ADS_PLATFORM_OPERATIONAL_STATES;
  productionStateSelectable: false;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
}>;

export function isAdsPlatformOperationalState(
  value: unknown
): value is AdsPlatformOperationalState {
  return (
    typeof value === "string" &&
    (ADS_PLATFORM_OPERATIONAL_STATES as readonly string[]).includes(value)
  );
}

/** Returns the frozen active operational state snapshot. */
export function getAdsOperationalStateSnapshot(): AdsOperationalStateSnapshot {
  return Object.freeze({
    contractVersion: ADS_OPERATIONS_STATE_CONTRACT_VERSION,
    activeState: ADS_PLATFORM_ACTIVE_OPERATIONAL_STATE,
    allowedStates: ADS_PLATFORM_OPERATIONAL_STATES,
    productionStateSelectable: false as const,
    ...ADS_OPERATIONS_STATE_AUTHORITY,
  });
}

/**
 * Evaluates a requested operational-state transition.
 * Transitions into production (or any production-enabling claim) fail closed.
 */
export function evaluateAdsOperationalStateTransition(input: {
  from: AdsPlatformOperationalState;
  to: AdsPlatformOperationalState;
}):
  | { ok: true; from: AdsPlatformOperationalState; to: AdsPlatformOperationalState }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isAdsPlatformOperationalState(input.from)) {
    return {
      ok: false,
      message: "Invalid source operational state.",
      issues: Object.freeze(["from must be a registered operational state."]),
    };
  }
  if (!isAdsPlatformOperationalState(input.to)) {
    return {
      ok: false,
      message: "Invalid target operational state.",
      issues: Object.freeze(["to must be a registered operational state."]),
    };
  }
  if (input.to === "production") {
    return {
      ok: false,
      message: "Production operational state cannot be activated in V1.",
      issues: Object.freeze([
        "production state transitions are forbidden.",
        "productionEnabled must remain false.",
      ]),
    };
  }
  if (input.from !== ADS_PLATFORM_ACTIVE_OPERATIONAL_STATE) {
    return {
      ok: false,
      message: "Source state does not match the frozen active operational state.",
      issues: Object.freeze([
        `from must be "${ADS_PLATFORM_ACTIVE_OPERATIONAL_STATE}".`,
      ]),
    };
  }
  // Non-production transitions are recorded as evaluable but not applied —
  // V1 keeps a frozen active state.
  if (input.to !== ADS_PLATFORM_ACTIVE_OPERATIONAL_STATE) {
    return {
      ok: false,
      message: "Operational state is frozen for Ads Operations Foundation V1.",
      issues: Object.freeze([
        "active operational state cannot be mutated in V1.",
      ]),
    };
  }
  return { ok: true, from: input.from, to: input.to };
}
