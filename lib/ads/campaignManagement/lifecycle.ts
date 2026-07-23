/**
 * Campaign Management lifecycle / approval state machine V1.
 *
 * Approval never enables production serving or billing.
 */

import { ADS_CAMPAIGN_MANAGEMENT_AUTHORITY } from "./authority";

export const ADS_CAMPAIGN_LIFECYCLE_STATES = [
  "draft",
  "review",
  "approved",
  "rejected",
  "paused",
  "archived",
] as const;

export type AdsCampaignLifecycleState =
  (typeof ADS_CAMPAIGN_LIFECYCLE_STATES)[number];

const TRANSITIONS: Record<
  AdsCampaignLifecycleState,
  readonly AdsCampaignLifecycleState[]
> = {
  draft: ["review", "archived"],
  review: ["approved", "rejected"],
  approved: ["paused", "archived"],
  rejected: ["draft", "review", "archived"],
  paused: ["approved", "archived"],
  archived: [],
};

export function isAdsCampaignLifecycleState(
  value: unknown
): value is AdsCampaignLifecycleState {
  return (
    typeof value === "string" &&
    (ADS_CAMPAIGN_LIFECYCLE_STATES as readonly string[]).includes(value)
  );
}

export function listAdsCampaignLifecycleTransitions(
  from: AdsCampaignLifecycleState
): readonly AdsCampaignLifecycleState[] {
  return TRANSITIONS[from] ?? [];
}

/**
 * Evaluates an approval/lifecycle transition.
 * Never claims production eligibility or serving authority.
 */
export function evaluateAdsCampaignLifecycleTransition(input: {
  from: AdsCampaignLifecycleState;
  to: AdsCampaignLifecycleState;
}):
  | {
      ok: true;
      from: AdsCampaignLifecycleState;
      to: AdsCampaignLifecycleState;
      productionEnabled: false;
      deliveryEnabled: false;
      billingEnabled: false;
      productionAccepted: false;
      authoritativeProductionServing: false;
      enablesServing: false;
    }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isAdsCampaignLifecycleState(input.from)) {
    return {
      ok: false,
      message: "Invalid source lifecycle state.",
      issues: Object.freeze(["from must be a registered lifecycle state."]),
    };
  }
  if (!isAdsCampaignLifecycleState(input.to)) {
    return {
      ok: false,
      message: "Invalid target lifecycle state.",
      issues: Object.freeze(["to must be a registered lifecycle state."]),
    };
  }
  if (!TRANSITIONS[input.from].includes(input.to)) {
    return {
      ok: false,
      message: `Transition ${input.from} → ${input.to} is not allowed.`,
      issues: Object.freeze([
        `allowed: ${TRANSITIONS[input.from].join(", ") || "(none)"}`,
      ]),
    };
  }
  return {
    ok: true,
    from: input.from,
    to: input.to,
    ...ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
    enablesServing: false as const,
  };
}

/** Serving remains impossible regardless of lifecycle state. */
export function evaluateAdsCampaignServingEligibility(input: {
  lifecycleState: AdsCampaignLifecycleState;
}): Readonly<{
  eligible: false;
  lifecycleState: AdsCampaignLifecycleState;
  reason: string;
  productionEnabled: false;
  deliveryEnabled: false;
  billingEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
}> {
  return Object.freeze({
    eligible: false as const,
    lifecycleState: input.lifecycleState,
    reason:
      "Campaign Management Foundation V1 never enables production serving.",
    ...ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
  });
}
