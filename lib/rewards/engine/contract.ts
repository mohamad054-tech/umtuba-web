/**
 * Cross-platform Rewards contract — Web + iOS + Android consume the SAME backend.
 * There is no iOS/Android/Web points engine. Clients display and request only.
 */

import { REWARDS_ENGINE_CONTRACT_VERSION } from "./types";
import type {
  QualificationStatus,
  RewardHistoryItem,
  UmWalletSnapshot,
} from "./types";

export const REWARDS_CROSS_PLATFORM_CONTRACT = {
  version: REWARDS_ENGINE_CONTRACT_VERSION,
  authority: "server",
  clients: ["web", "ios", "android"] as const,
  forbiddenClientEngines: [
    "IOS_POINTS_ENGINE",
    "ANDROID_POINTS_ENGINE",
    "WEB_POINTS_ENGINE",
  ] as const,
  parity: [
    "UM_BALANCE",
    "REWARD_HISTORY",
    "REFERRAL_CODE",
    "REFERRAL_LINK",
    "REWARD_STATUS",
  ] as const,
  rpcs: {
    snapshot: "get_my_rewards_snapshot",
    history: "get_my_rewards_history",
    referral: "get_my_referral_profile",
    processEvent: "record_contract_reward_event",
    processEventInternal: "process_reward_event",
    processEventTrusted: "process_reward_event_trusted",
    attributeReferral: "attribute_referral_signup_v2",
    qualifyReferral: "qualify_my_referral_signup",
    confirmQualification: "admin_confirm_reward_qualification",
    rejectQualification: "admin_reject_reward_qualification",
    analytics: "admin_rewards_launch_analytics",
  },
  writeRules: {
    clientMaySupplyAmount: false,
    clientMayGrantPoints: false,
    clientMayDeductPoints: false,
    clientMayAttributeReferralAuthoritatively: false,
    clientMaySupplyTrustedActor: false,
  },
} as const;

export type RewardsPlatform = (typeof REWARDS_CROSS_PLATFORM_CONTRACT.clients)[number];

export type RewardsSnapshotContract = {
  contractVersion: typeof REWARDS_ENGINE_CONTRACT_VERSION;
  platform: RewardsPlatform;
  wallet: UmWalletSnapshot;
  referral: {
    code: string;
    referralLink: string;
    joinLink: string;
  };
  history: RewardHistoryItem[];
  activeRewardRuleCount: number;
  pointValuesConfigured: boolean;
};

export type RewardsEventRequestContract = {
  eventType: string;
  idempotencyKey: string;
  sourceType: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
};

export type ReferralProfileContract = {
  contractVersion: typeof REWARDS_ENGINE_CONTRACT_VERSION;
  code: string;
  referralLink: string;
  rewardStatus: QualificationStatus | "NONE";
};

export function assertNoClientAmount(
  payload: Record<string, unknown>
): { ok: true } | { ok: false; reason: "unauthorized_client_amount" } {
  const forbidden = [
    "amount",
    "points",
    "pointsAmount",
    "clientAmount",
    "p_points",
    "p_amount",
  ];
  for (const key of forbidden) {
    if (key in payload) {
      return { ok: false, reason: "unauthorized_client_amount" };
    }
  }
  return { ok: true };
}

export function assertNoTrustedMetadata(
  payload: Record<string, unknown>
): { ok: true } | { ok: false; reason: "untrusted_actor_metadata" } {
  for (const key of ["_trustedActor", "trustedActor", "trusted_actor"]) {
    if (key in payload) {
      return { ok: false, reason: "untrusted_actor_metadata" };
    }
  }
  return { ok: true };
}

export function toPlatformSnapshot(input: {
  platform: RewardsPlatform;
  wallet: UmWalletSnapshot;
  referral: { code: string; referralLink: string; joinLink?: string };
  history: RewardHistoryItem[];
  activeRewardRuleCount: number;
  pointValuesConfigured: boolean;
}): RewardsSnapshotContract {
  const joinLink =
    input.referral.joinLink ??
    (input.referral.code
      ? `/join?ref=${encodeURIComponent(input.referral.code)}`
      : input.referral.referralLink);
  return {
    contractVersion: REWARDS_ENGINE_CONTRACT_VERSION,
    ...input,
    referral: {
      ...input.referral,
      joinLink,
    },
  };
}
