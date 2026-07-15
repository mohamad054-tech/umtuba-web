/**
 * Conservative UM Points reward values — mirror of `um_points_config` defaults.
 * Keep in sync with supabase/migrations/20260717_notifications_v2_automation.sql
 */
export const UM_POINTS_REWARDS = {
  verifiedWelcome: 100,
  firstPostOfDay: 25,
  meaningfulComment: 5,
  creatorQualifiedSave: 3,
  creatorQualifiedShare: 5,
  inviteActive: 50,
  /** Growth Mode: inviter credit on referred account creation. */
  referralSignup: 20,
  dailyEarnCap: 200,
  commentMinLength: 20,
  commentDailyCapPoints: 25,
  saveDailyCapPoints: 30,
  shareDailyCapPoints: 20,
} as const;

export type UmPointsRewardKey = keyof typeof UM_POINTS_REWARDS;

export function applyDailyCap(
  alreadyEarnedToday: number,
  requestedPoints: number,
  dailyCap: number = UM_POINTS_REWARDS.dailyEarnCap
): { awarded: number; blocked: boolean; reason?: "daily_cap" } {
  if (alreadyEarnedToday >= dailyCap) {
    return { awarded: 0, blocked: true, reason: "daily_cap" };
  }
  const remaining = dailyCap - alreadyEarnedToday;
  const awarded = Math.max(0, Math.min(requestedPoints, remaining));
  if (awarded <= 0) {
    return { awarded: 0, blocked: true, reason: "daily_cap" };
  }
  return { awarded, blocked: false };
}

export function applyCategoryCap(
  categoryEarnedToday: number,
  requestedPoints: number,
  categoryCap: number
): { awarded: number; blocked: boolean; reason?: "category_cap" } {
  if (categoryEarnedToday >= categoryCap) {
    return { awarded: 0, blocked: true, reason: "category_cap" };
  }
  const remaining = categoryCap - categoryEarnedToday;
  const awarded = Math.max(0, Math.min(requestedPoints, remaining));
  if (awarded <= 0) {
    return { awarded: 0, blocked: true, reason: "category_cap" };
  }
  return { awarded, blocked: false };
}

export function isSelfInteraction(
  actorId: string | null | undefined,
  recipientId: string | null | undefined
): boolean {
  return Boolean(actorId && recipientId && actorId === recipientId);
}

export function isMeaningfulComment(
  body: string,
  minLength: number = UM_POINTS_REWARDS.commentMinLength
): boolean {
  return body.trim().length >= minLength;
}

export const VIEW_MILESTONE_THRESHOLDS = [500, 1000, 10_000, 100_000] as const;
export const COUNTRY_MILESTONE_THRESHOLDS = [5, 10, 25] as const;
export const UM_POINTS_MILESTONE_THRESHOLDS = [
  1000, 5000, 10_000, 50_000, 100_000,
] as const;

export function nextUmPointsMilestone(balance: number): number | null {
  for (const m of UM_POINTS_MILESTONE_THRESHOLDS) {
    if (balance < m) return m;
  }
  return null;
}
