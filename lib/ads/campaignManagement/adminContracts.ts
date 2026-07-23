import { ADS_CAMPAIGN_MANAGEMENT_AUTHORITY } from "./authority";
import type { AdsCampaignLifecycleState } from "./lifecycle";
import {
  validateAdsCampaignLifecycleChange,
  validateAdsCampaignManagementBundle,
  type AdsCampaignValidationReport,
} from "./validation";

/**
 * Internal admin contracts for Campaign Management Foundation V1.
 * No production APIs, public endpoints, or UI.
 */

export const ADS_CAMPAIGN_ADMIN_CONTRACT_VERSION = "v1" as const;

export type AdsCampaignAdminActorContext = Readonly<{
  actorRef: string;
  correlationId: string;
}>;

export type AdsCampaignAdminInspectResult = Readonly<{
  contractVersion: typeof ADS_CAMPAIGN_ADMIN_CONTRACT_VERSION;
  validation: AdsCampaignValidationReport;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
}>;

export type AdsCampaignAdminTransitionResult =
  | Readonly<{
      ok: true;
      contractVersion: typeof ADS_CAMPAIGN_ADMIN_CONTRACT_VERSION;
      from: AdsCampaignLifecycleState;
      to: AdsCampaignLifecycleState;
      applied: false;
      enablesServing: false;
      productionEnabled: false;
      deliveryEnabled: false;
      billingEnabled: false;
      productionAccepted: false;
      authoritativeProductionServing: false;
      message: string;
    }>
  | Readonly<{
      ok: false;
      message: string;
      issues: readonly string[];
    }>;

const ACTOR_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

function assertActor(
  input: AdsCampaignAdminActorContext
): { ok: true } | { ok: false; message: string; issues: readonly string[] } {
  if (!ACTOR_RE.test(input.actorRef.trim()) || !ACTOR_RE.test(input.correlationId.trim())) {
    return {
      ok: false,
      message: "Invalid admin actor context.",
      issues: Object.freeze([
        "actorRef and correlationId must be 1–128 chars of [A-Za-z0-9_.:-].",
      ]),
    };
  }
  return { ok: true };
}

/** Inspect/validate a campaign management bundle (read-only). */
export function inspectAdsCampaignManagementBundle(
  input: AdsCampaignAdminActorContext & { campaign: unknown }
): AdsCampaignAdminInspectResult | { ok: false; message: string; issues: readonly string[] } {
  const actor = assertActor(input);
  if (!actor.ok) return actor;
  const validation = validateAdsCampaignManagementBundle(input.campaign);
  return Object.freeze({
    contractVersion: ADS_CAMPAIGN_ADMIN_CONTRACT_VERSION,
    validation,
    ...ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
  });
}

/**
 * Propose a lifecycle transition. Never applied to production serving.
 * Returns an evaluation-only result (`applied: false`).
 */
export function proposeAdsCampaignLifecycleTransition(
  input: AdsCampaignAdminActorContext & {
    from: AdsCampaignLifecycleState;
    to: AdsCampaignLifecycleState;
    campaign?: unknown;
  }
): AdsCampaignAdminTransitionResult {
  const actor = assertActor(input);
  if (!actor.ok) return actor;

  const evaluated = validateAdsCampaignLifecycleChange({
    from: input.from,
    to: input.to,
    campaign: input.campaign,
  });
  if (!evaluated.ok) {
    return {
      ok: false,
      message: evaluated.message,
      issues: evaluated.issues,
    };
  }
  return Object.freeze({
    ok: true as const,
    contractVersion: ADS_CAMPAIGN_ADMIN_CONTRACT_VERSION,
    from: evaluated.transition.from,
    to: evaluated.transition.to,
    applied: false as const,
    enablesServing: false as const,
    ...ADS_CAMPAIGN_MANAGEMENT_AUTHORITY,
    message:
      "Lifecycle transition evaluated only; Campaign Management V1 never enables serving.",
  });
}
