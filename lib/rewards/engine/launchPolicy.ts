/**
 * launch_v1 UM Points matrix — internal platform points only.
 * Generous for ~3 months of Launch Growth Mode. Server is authoritative.
 * No crypto, cash-out, or transferable financial asset.
 */

import { REWARDS_POLICY_LAUNCH_V1, type RewardEventType } from "./types";

export const LAUNCH_GROWTH_MODE = "3_MONTHS" as const;
export const LAUNCH_GROWTH_REVIEW_TARGET = "APPROX_3_MONTHS" as const;
export const LAUNCH_POLICY_VERSION = REWARDS_POLICY_LAUNCH_V1;
export const LAUNCH_DAILY_EARN_CAP = 400;
export const LAUNCH_REFERRAL_DAILY_CAP = 100;

/** Relative to VIDEO_PUBLISHED = 10. */
export const LAUNCH_V1_POINTS = {
  ACCOUNT_CREATED: 100,
  REFERRAL_SIGNUP: 0,
  REFERRAL_QUALIFIED: 40,
  FIRST_POST: 15,
  POST_PUBLISHED: 6,
  VIDEO_PUBLISHED: 10,
  COMMENT_CREATED: 3,
  REPLY_CREATED: 4,
  LIKE_GIVEN: 1,
  LIKE_RECEIVED: 1,
  SAVE_CREATED: 2,
  SAVE_RECEIVED: 2,
  SHARE_CREATED: 3,
  SHARE_RECEIVED: 3,
  FOLLOW_GIVEN: 2,
  FOLLOW_RECEIVED: 3,
  DAILY_ENGAGEMENT: 5,
  SOUND_CREATED: 8,
  SOUND_USED: 5,
  CHALLENGE_PARTICIPATE: 8,
  CHALLENGE_COMPLETE: 15,
  CREATOR_MILESTONE: 20,
  COURSE_ENROLLED: 5,
  LESSON_COMPLETED: 8,
  COURSE_COMPLETED: 25,
  QUIZ_PASSED: 10,
  CERTIFICATE_EARNED: 30,
  LEARNING_STREAK: 5,
  STREAK_REACHED: 5,
  MILESTONE_REACHED: 20,
  GAME_PARTICIPATE: 3,
  GAME_COMPLETED: 8,
  GAME_ACHIEVEMENT: 12,
  GAME_TOURNAMENT: 20,
  GAME_SCORE_MILESTONE: 10,
  STORE_PURCHASE: 15,
  STORE_SALE: 15,
  STORE_MILESTONE: 25,
  ADMIN_GRANT: 0,
  ADMIN_REVERSAL: 0,
} as const satisfies Record<RewardEventType, number>;

export const LAUNCH_V1_ENABLED: Record<RewardEventType, boolean> = {
  ACCOUNT_CREATED: true,
  REFERRAL_SIGNUP: false,
  REFERRAL_QUALIFIED: true,
  FIRST_POST: true,
  POST_PUBLISHED: true,
  VIDEO_PUBLISHED: true,
  COMMENT_CREATED: true,
  REPLY_CREATED: true,
  LIKE_GIVEN: true,
  LIKE_RECEIVED: true,
  SAVE_CREATED: true,
  SAVE_RECEIVED: true,
  SHARE_CREATED: true,
  SHARE_RECEIVED: true,
  FOLLOW_GIVEN: true,
  FOLLOW_RECEIVED: true,
  DAILY_ENGAGEMENT: true,
  SOUND_CREATED: true,
  SOUND_USED: true,
  CHALLENGE_PARTICIPATE: true,
  CHALLENGE_COMPLETE: true,
  CREATOR_MILESTONE: true,
  COURSE_ENROLLED: true,
  LESSON_COMPLETED: true,
  COURSE_COMPLETED: true,
  QUIZ_PASSED: true,
  CERTIFICATE_EARNED: true,
  LEARNING_STREAK: true,
  STREAK_REACHED: true,
  MILESTONE_REACHED: true,
  GAME_PARTICIPATE: true,
  GAME_COMPLETED: true,
  GAME_ACHIEVEMENT: true,
  GAME_TOURNAMENT: true,
  GAME_SCORE_MILESTONE: true,
  STORE_PURCHASE: true,
  STORE_SALE: true,
  STORE_MILESTONE: true,
  ADMIN_GRANT: false,
  ADMIN_REVERSAL: false,
};

export const REFERRED_USER_EXTRA_POINTS = 0;

export const HISTORY_REASON_LABELS: Record<string, string> = {
  ACCOUNT_CREATED: "Welcome bonus",
  REFERRAL_QUALIFIED: "Referral joined",
  FIRST_POST: "First post",
  POST_PUBLISHED: "Post published",
  VIDEO_PUBLISHED: "Video published",
  COMMENT_CREATED: "Comment posted",
  REPLY_CREATED: "Reply posted",
  LIKE_GIVEN: "Like given",
  LIKE_RECEIVED: "Like received",
  SAVE_CREATED: "Save",
  SAVE_RECEIVED: "Your post was saved",
  SHARE_CREATED: "Share",
  SHARE_RECEIVED: "Your post was shared",
  FOLLOW_GIVEN: "Follow",
  FOLLOW_RECEIVED: "New follower",
  DAILY_ENGAGEMENT: "Daily check-in",
  SOUND_CREATED: "Sound created",
  SOUND_USED: "Someone used your sound",
  CHALLENGE_PARTICIPATE: "Challenge joined",
  CHALLENGE_COMPLETE: "Challenge completed",
  CREATOR_MILESTONE: "Creator milestone",
  COURSE_ENROLLED: "Course started",
  LESSON_COMPLETED: "Lesson completed",
  COURSE_COMPLETED: "Course completed",
  QUIZ_PASSED: "Quiz passed",
  CERTIFICATE_EARNED: "Certificate earned",
  LEARNING_STREAK: "Learning streak",
  STREAK_REACHED: "Streak reached",
  MILESTONE_REACHED: "Milestone reached",
  GAME_PARTICIPATE: "Game played",
  GAME_COMPLETED: "Game completed",
  GAME_ACHIEVEMENT: "Game achievement",
  GAME_TOURNAMENT: "Tournament",
  GAME_SCORE_MILESTONE: "Score milestone",
  STORE_PURCHASE: "Store purchase",
  STORE_SALE: "Store sale",
  STORE_MILESTONE: "Store milestone",
  ADMIN_GRANT: "Admin grant",
  ADMIN_REVERSAL: "Reversal",
};

export function launchPointsFor(eventType: RewardEventType): number {
  return LAUNCH_V1_POINTS[eventType];
}

export function isLaunchRuleEnabled(eventType: RewardEventType): boolean {
  return LAUNCH_V1_ENABLED[eventType] && LAUNCH_V1_POINTS[eventType] > 0;
}

export function countLaunchEnabledRules(): number {
  return (Object.keys(LAUNCH_V1_POINTS) as RewardEventType[]).filter(
    (eventType) => isLaunchRuleEnabled(eventType)
  ).length;
}

export function historyLabelForReason(reasonCode: string): string {
  return HISTORY_REASON_LABELS[reasonCode] ?? reasonCode;
}

export function buildJoinReferralPath(code: string): string {
  return `/join?ref=${encodeURIComponent(code)}`;
}

export function buildJoinReferralUrl(
  code: string,
  origin = "https://umtuba.com"
): string {
  return `${origin.replace(/\/$/, "")}${buildJoinReferralPath(code)}`;
}

export function buildWhatsAppShareUrl(inviteUrl: string, message: string): string {
  const text = `${message} ${inviteUrl}`.trim();
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
