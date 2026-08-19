/**
 * Capability catalog + launch_v1 seed.
 * Old ledger rows keep their awarded value; new events use the active policy.
 */

import {
  LAUNCH_POLICY_VERSION,
  LAUNCH_V1_ENABLED,
  LAUNCH_V1_POINTS,
  isLaunchRuleEnabled,
} from "./launchPolicy";
import {
  REWARD_CURRENCY,
  REWARD_EVENT_TYPES,
  type RewardEventType,
  type RewardRule,
  type RewardRuleLimits,
} from "./types";

export const DEFAULT_RULE_LIMITS: RewardRuleLimits = {
  perUserLimit: null,
  dailyLimit: null,
  weeklyLimit: null,
  lifetimeLimit: null,
  cooldownSeconds: null,
  minimumAccountAgeSeconds: null,
  qualificationDelaySeconds: null,
  requiresUniqueActor: false,
  requiresVerifiedAccount: false,
};

export const REWARD_EVENT_LABELS: Record<RewardEventType, string> = {
  ACCOUNT_CREATED: "Account created",
  REFERRAL_SIGNUP: "Referral signup",
  REFERRAL_QUALIFIED: "Referral qualified",
  FIRST_POST: "First post",
  POST_PUBLISHED: "Post published",
  VIDEO_PUBLISHED: "Video published",
  COMMENT_CREATED: "Comment created",
  REPLY_CREATED: "Reply created",
  LIKE_GIVEN: "Like given",
  LIKE_RECEIVED: "Like received",
  SAVE_CREATED: "Save created",
  SAVE_RECEIVED: "Save received",
  SHARE_CREATED: "Share created",
  SHARE_RECEIVED: "Share received",
  FOLLOW_GIVEN: "Follow given",
  FOLLOW_RECEIVED: "Follow received",
  DAILY_ENGAGEMENT: "Daily engagement",
  SOUND_CREATED: "Sound created",
  SOUND_USED: "Sound used",
  CHALLENGE_PARTICIPATE: "Challenge participate",
  CHALLENGE_COMPLETE: "Challenge complete",
  CREATOR_MILESTONE: "Creator milestone",
  COURSE_ENROLLED: "Course enrolled",
  LESSON_COMPLETED: "Lesson completed",
  COURSE_COMPLETED: "Course completed",
  QUIZ_PASSED: "Quiz passed",
  CERTIFICATE_EARNED: "Certificate earned",
  LEARNING_STREAK: "Learning streak",
  STREAK_REACHED: "Streak reached",
  MILESTONE_REACHED: "Milestone reached",
  GAME_PARTICIPATE: "Game participate",
  GAME_COMPLETED: "Game completed",
  GAME_ACHIEVEMENT: "Game achievement",
  GAME_TOURNAMENT: "Game tournament",
  GAME_SCORE_MILESTONE: "Game score milestone",
  STORE_PURCHASE: "Store purchase",
  STORE_SALE: "Store sale",
  STORE_MILESTONE: "Store milestone",
  ADMIN_GRANT: "Admin grant",
  ADMIN_REVERSAL: "Admin reversal",
};

const LIFETIME_ONCE: Partial<Record<RewardEventType, number>> = {
  ACCOUNT_CREATED: 1,
  FIRST_POST: 1,
};

const DAILY_ONCE: Partial<Record<RewardEventType, number>> = {
  DAILY_ENGAGEMENT: 1,
};

const UNIQUE_ACTOR: RewardEventType[] = [
  "LIKE_RECEIVED",
  "SAVE_RECEIVED",
  "SHARE_RECEIVED",
  "FOLLOW_RECEIVED",
  "SOUND_USED",
];

export function defaultRuleIdForEvent(eventType: RewardEventType): string {
  return `capability.${eventType.toLowerCase()}`;
}

export function limitsForLaunchEvent(eventType: RewardEventType): RewardRuleLimits {
  return {
    ...DEFAULT_RULE_LIMITS,
    lifetimeLimit: LIFETIME_ONCE[eventType] ?? null,
    dailyLimit: DAILY_ONCE[eventType] ?? null,
    requiresUniqueActor: UNIQUE_ACTOR.includes(eventType),
    requiresVerifiedAccount: eventType === "ACCOUNT_CREATED",
  };
}

export function buildDefaultCapabilityRules(now: string): RewardRule[] {
  return REWARD_EVENT_TYPES.map((eventType) => ({
    ruleId: defaultRuleIdForEvent(eventType),
    eventType,
    name: `${REWARD_EVENT_LABELS[eventType]} (unconfigured)`,
    enabled: false,
    pointsAmount: 0,
    currency: REWARD_CURRENCY,
    version: 1,
    startAt: null,
    endAt: null,
    limits: { ...DEFAULT_RULE_LIMITS },
    reversalPolicy: "append_only",
    metadata: {
      capability: true,
      pointValue: "UNCONFIGURED",
      policy: "UMTUBA_REWARDS_POLICY_V1_PENDING",
    },
    createdAt: now,
    updatedAt: now,
  }));
}

export function buildLaunchV1Rules(now: string): RewardRule[] {
  return REWARD_EVENT_TYPES.map((eventType) => {
    const pointsAmount = LAUNCH_V1_POINTS[eventType];
    const enabled = LAUNCH_V1_ENABLED[eventType] && pointsAmount > 0;
    return {
      ruleId: defaultRuleIdForEvent(eventType),
      eventType,
      name: REWARD_EVENT_LABELS[eventType],
      enabled,
      pointsAmount,
      currency: REWARD_CURRENCY,
      version: 1,
      startAt: null,
      endAt: null,
      limits: limitsForLaunchEvent(eventType),
      reversalPolicy: "append_only",
      metadata: {
        capability: true,
        policy: LAUNCH_POLICY_VERSION,
        growthMode: "3_MONTHS",
        pointValue: enabled ? pointsAmount : "DISABLED",
      },
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function countEnabledPositiveRules(rules: Iterable<RewardRule>): number {
  let count = 0;
  for (const rule of rules) {
    if (rule.enabled && rule.pointsAmount > 0) count += 1;
  }
  return count;
}

export function countLaunchEnabledRulesFromCatalog(): number {
  return REWARD_EVENT_TYPES.filter((eventType) => isLaunchRuleEnabled(eventType))
    .length;
}

export function isRuleWindowActive(rule: RewardRule, nowIso: string): boolean {
  if (rule.startAt && nowIso < rule.startAt) return false;
  if (rule.endAt && nowIso > rule.endAt) return false;
  return true;
}
