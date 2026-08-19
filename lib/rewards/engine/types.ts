/**
 * Unified Rewards / UM Points / Referral engine — domain types.
 * Clients display and request only. Amounts are never client-authoritative.
 */

export const REWARDS_ENGINE_CONTRACT_VERSION = "v1" as const;
export const REWARDS_POLICY_LAUNCH_V1 = "launch_v1" as const;
export const REWARDS_POLICY_POST_LAUNCH_V2 = "post_launch_v2" as const;

export const REWARD_CURRENCY = "UM" as const;

export const REWARD_EVENT_TYPES = [
  "ACCOUNT_CREATED",
  "REFERRAL_SIGNUP",
  "REFERRAL_QUALIFIED",
  "FIRST_POST",
  "POST_PUBLISHED",
  "VIDEO_PUBLISHED",
  "COMMENT_CREATED",
  "REPLY_CREATED",
  "LIKE_GIVEN",
  "LIKE_RECEIVED",
  "SAVE_CREATED",
  "SAVE_RECEIVED",
  "SHARE_CREATED",
  "SHARE_RECEIVED",
  "FOLLOW_GIVEN",
  "FOLLOW_RECEIVED",
  "DAILY_ENGAGEMENT",
  "SOUND_CREATED",
  "SOUND_USED",
  "CHALLENGE_PARTICIPATE",
  "CHALLENGE_COMPLETE",
  "CREATOR_MILESTONE",
  "COURSE_ENROLLED",
  "LESSON_COMPLETED",
  "COURSE_COMPLETED",
  "QUIZ_PASSED",
  "CERTIFICATE_EARNED",
  "LEARNING_STREAK",
  "STREAK_REACHED",
  "MILESTONE_REACHED",
  "GAME_PARTICIPATE",
  "GAME_COMPLETED",
  "GAME_ACHIEVEMENT",
  "GAME_TOURNAMENT",
  "GAME_SCORE_MILESTONE",
  "STORE_PURCHASE",
  "STORE_SALE",
  "STORE_MILESTONE",
  "ADMIN_GRANT",
  "ADMIN_REVERSAL",
] as const;

export type RewardEventType = (typeof REWARD_EVENT_TYPES)[number];

export const LEDGER_DIRECTIONS = ["CREDIT", "DEBIT"] as const;
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];

export const LEDGER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "REVERSED",
  "EXPIRED",
] as const;
export type LedgerStatus = (typeof LEDGER_STATUSES)[number];

export const QUALIFICATION_STATUSES = [
  "PENDING",
  "QUALIFIED",
  "REJECTED",
  "REVERSED",
] as const;
export type QualificationStatus = (typeof QUALIFICATION_STATUSES)[number];

export const ACCOUNT_ELIGIBILITY_STATES = [
  "eligible",
  "review",
  "ineligible",
] as const;
export type AccountEligibilityState =
  (typeof ACCOUNT_ELIGIBILITY_STATES)[number];

export const ABUSE_FLAG_KINDS = [
  "self_interaction",
  "duplicate_event",
  "rapid_repeat",
  "suspicious_referral",
  "referral_loop",
  "manual_review",
  "automated_signup",
  "ownership_change",
  "deleted_recreate",
] as const;
export type AbuseFlagKind = (typeof ABUSE_FLAG_KINDS)[number];

export const NOTIFICATION_CONTRACT_TYPES = [
  "REWARD_EARNED",
  "REWARD_PENDING",
  "REWARD_CONFIRMED",
  "REWARD_REVERSED",
  "MILESTONE_REACHED",
] as const;
export type RewardNotificationType =
  (typeof NOTIFICATION_CONTRACT_TYPES)[number];

export type RewardRuleLimits = {
  perUserLimit: number | null;
  dailyLimit: number | null;
  weeklyLimit: number | null;
  lifetimeLimit: number | null;
  cooldownSeconds: number | null;
  minimumAccountAgeSeconds: number | null;
  qualificationDelaySeconds: number | null;
  requiresUniqueActor: boolean;
  requiresVerifiedAccount: boolean;
};

export type RewardRule = {
  ruleId: string;
  eventType: RewardEventType;
  name: string;
  enabled: boolean;
  pointsAmount: number;
  currency: typeof REWARD_CURRENCY;
  version: number;
  startAt: string | null;
  endAt: string | null;
  limits: RewardRuleLimits;
  reversalPolicy: "append_only";
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type RewardRuleVersionSnapshot = {
  ruleId: string;
  version: number;
  enabled: boolean;
  pointsAmount: number;
  capturedAt: string;
  reason: string;
};

export type RewardEvent = {
  eventId: string;
  eventType: RewardEventType;
  actorUserId: string;
  subjectUserId: string;
  idempotencyKey: string;
  sourceType: string;
  sourceId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type RewardQualification = {
  qualificationId: string;
  eventId: string;
  ruleId: string;
  ruleVersion: number;
  userId: string;
  status: QualificationStatus;
  createdAt: string;
  qualifiedAt: string | null;
  rejectedAt: string | null;
  reversedAt: string | null;
  reasonCode: string;
};

export type RewardLedgerEntry = {
  transactionId: string;
  userId: string;
  eventId: string;
  ruleId: string;
  ruleVersion: number;
  amount: number;
  direction: LedgerDirection;
  status: LedgerStatus;
  reasonCode: string;
  sourceType: string;
  sourceId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  confirmedAt: string | null;
  reversedAt: string | null;
  reversalOf: string | null;
};

export type UmWalletSnapshot = {
  userId: string;
  availableBalance: number;
  pendingBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  updatedAt: string;
};

export type RewardHistoryItem = {
  transactionId: string;
  direction: LedgerDirection;
  /** Null when the producing rule is inactive or unconfigured. */
  displayAmount: number | null;
  reasonCode: string;
  status: LedgerStatus;
  createdAt: string;
  ruleId: string;
  ruleVersion: number;
};

export type ReferralCodeRecord = {
  userId: string;
  code: string;
  isActive: boolean;
  createdAt: string;
};

export type ReferralAttributionRecord = {
  attributionId: string;
  inviterUserId: string;
  invitedUserId: string;
  referralCode: string;
  attributedAt: string;
  signupCompletedAt: string | null;
  qualifiedAt: string | null;
  rewardStatus: QualificationStatus;
};

export type AbuseFlag = {
  flagId: string;
  kind: AbuseFlagKind;
  userId: string;
  relatedUserId: string | null;
  eventId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  autoPunished: false;
};

export type RewardNotificationContract = {
  type: RewardNotificationType;
  userId: string;
  transactionId: string | null;
  amount: number | null;
  createdAt: string;
  dedupeKey: string;
};

export type AdminAuditEntry = {
  auditId: string;
  adminUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
};

export type ProcessDenialReason =
  | "unauthorized_client_amount"
  | "cross_user_forbidden"
  | "rule_disabled"
  | "rule_zero"
  | "rule_inactive_window"
  | "no_matching_rule"
  | "duplicate_event"
  | "self_interaction"
  | "account_ineligible"
  | "eligibility_limit"
  | "eligibility_cooldown"
  | "eligibility_account_age"
  | "eligibility_unverified"
  | "referral_self"
  | "referral_duplicate"
  | "referral_loop"
  | "referral_unknown_code"
  | "invalid_event"
  | "untrusted_actor_metadata"
  | "unverified_source";

export type ProcessResult = {
  accepted: boolean;
  awarded: number;
  ledgerEntry: RewardLedgerEntry | null;
  qualification: RewardQualification | null;
  event: RewardEvent | null;
  notification: RewardNotificationContract | null;
  denialReason: ProcessDenialReason | null;
  replayed: boolean;
};

export type ReferralAttributionResult = {
  accepted: boolean;
  attribution: ReferralAttributionRecord | null;
  denialReason: ProcessDenialReason | null;
};

export type ProcessEventInput = {
  actorUserId: string;
  subjectUserId?: string;
  eventType: RewardEventType;
  idempotencyKey: string;
  sourceType: string;
  sourceId: string;
  metadata?: Record<string, unknown>;
  /** Any present client amount is rejected. */
  clientAmount?: unknown;
  /** Server execution context only — never taken from request metadata. */
  actorIsAdmin?: boolean;
  /** Server verified that the source row exists and belongs to the actor. */
  sourceVerified?: boolean;
  accountCreatedAt?: string;
  accountVerified?: boolean;
  counterpartUserId?: string;
};
