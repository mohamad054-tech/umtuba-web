/**
 * Ads Operations Kill Switches V1 — centralized emergency controls.
 *
 * Semantics: `engaged: true` means the path is halted (fail closed).
 * Serving, billing, and measurement ingestion switches are permanently engaged
 * in V1 and cannot be disengaged.
 */

export const ADS_KILL_SWITCHES_CONTRACT_VERSION = "v1" as const;

export const ADS_KILL_SWITCH_KEYS = [
  "globalServing",
  "billing",
  "measurementIngestion",
  "campaignCreation",
  "adminActions",
] as const;

export type AdsKillSwitchKey = (typeof ADS_KILL_SWITCH_KEYS)[number];

/** Switches that must remain engaged (blocking) in V1. */
export const ADS_PERMANENTLY_ENGAGED_KILL_SWITCHES = [
  "globalServing",
  "billing",
  "measurementIngestion",
] as const satisfies readonly AdsKillSwitchKey[];

export type AdsKillSwitchState = Readonly<{
  engaged: boolean;
  /** When engaged, the named production-adjacent path is blocked. */
  failClosed: true;
  permanent: boolean;
}>;

export const ADS_KILL_SWITCHES = Object.freeze({
  globalServing: Object.freeze({
    engaged: true,
    failClosed: true as const,
    permanent: true,
  }),
  billing: Object.freeze({
    engaged: true,
    failClosed: true as const,
    permanent: true,
  }),
  measurementIngestion: Object.freeze({
    engaged: true,
    failClosed: true as const,
    permanent: true,
  }),
  /** Foundation campaign CRUD remains available; switch not engaged. */
  campaignCreation: Object.freeze({
    engaged: false,
    failClosed: true as const,
    permanent: false,
  }),
  /** Admin review/ops foundations remain available; switch not engaged. */
  adminActions: Object.freeze({
    engaged: false,
    failClosed: true as const,
    permanent: false,
  }),
} as const satisfies Record<AdsKillSwitchKey, AdsKillSwitchState>);

export type AdsKillSwitchesSnapshot = Readonly<{
  contractVersion: typeof ADS_KILL_SWITCHES_CONTRACT_VERSION;
  switches: typeof ADS_KILL_SWITCHES;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
  globalServingBlocked: true;
  billingBlocked: true;
  measurementIngestionBlocked: true;
}>;

export function getAdsKillSwitchesSnapshot(): AdsKillSwitchesSnapshot {
  if (
    !ADS_KILL_SWITCHES.globalServing.engaged ||
    !ADS_KILL_SWITCHES.billing.engaged ||
    !ADS_KILL_SWITCHES.measurementIngestion.engaged
  ) {
    throw new Error(
      "Ads kill switches refused a disengaged production path (fail closed)."
    );
  }
  return Object.freeze({
    contractVersion: ADS_KILL_SWITCHES_CONTRACT_VERSION,
    switches: ADS_KILL_SWITCHES,
    productionEnabled: false as const,
    productionAccepted: false as const,
    authoritativeProductionServing: false as const,
    billingEnabled: false as const,
    deliveryEnabled: false as const,
    globalServingBlocked: true as const,
    billingBlocked: true as const,
    measurementIngestionBlocked: true as const,
  });
}

/** True when the named path is halted. */
export function isAdsKillSwitchBlocking(key: AdsKillSwitchKey): boolean {
  if (
    (ADS_PERMANENTLY_ENGAGED_KILL_SWITCHES as readonly string[]).includes(key)
  ) {
    return true;
  }
  return ADS_KILL_SWITCHES[key].engaged === true;
}

/**
 * Propose a kill-switch change. Disengaging permanent switches fails closed.
 * Non-permanent changes are not applied in V1 (frozen table).
 */
export function evaluateAdsKillSwitchChange(input: {
  key: AdsKillSwitchKey;
  engaged: boolean;
}):
  | {
      ok: true;
      key: AdsKillSwitchKey;
      engaged: boolean;
      applied: false;
      message: string;
    }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!(ADS_KILL_SWITCH_KEYS as readonly string[]).includes(input.key)) {
    return {
      ok: false,
      message: "Unknown Ads kill switch.",
      issues: Object.freeze(["key is not a registered Ads kill switch."]),
    };
  }
  if (
    (ADS_PERMANENTLY_ENGAGED_KILL_SWITCHES as readonly string[]).includes(
      input.key
    ) &&
    input.engaged === false
  ) {
    return {
      ok: false,
      message: "Permanent kill switches cannot be disengaged in V1.",
      issues: Object.freeze([
        `${input.key} must remain engaged.`,
        "deliveryEnabled / billingEnabled / productionEnabled must remain false.",
      ]),
    };
  }
  return {
    ok: true,
    key: input.key,
    engaged: input.engaged,
    applied: false,
    message: "Kill switch table is frozen in V1; change accepted for audit only.",
  };
}
