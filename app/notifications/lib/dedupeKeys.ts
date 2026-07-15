/** Stable dedupe keys for Notifications V2 (must match SQL helpers). */

export function dedupePostReachedCountry(
  postId: string | number,
  countryCode: string
): string {
  return `post_reached_country:${postId}:${countryCode.trim().toUpperCase()}`;
}

export function dedupePostTrendingCountry(
  postId: string | number,
  countryCode: string
): string {
  return `post_trending_country:${postId}:${countryCode.trim().toUpperCase()}`;
}

export function dedupePostMilestoneViews(
  postId: string | number,
  views: number
): string {
  return `post_milestone:views:${postId}:${views}`;
}

export function dedupePostMilestoneCountries(
  postId: string | number,
  countryCount: number
): string {
  return `post_milestone:countries:${postId}:${countryCount}`;
}

export function dedupePostJourneySummary(
  postId: string | number,
  dayUtc: string
): string {
  return `post_journey_summary:${postId}:${dayUtc}`;
}

export function dedupeUmPointsEarned(clientDedupeKey: string): string {
  return `um_points_earned:${clientDedupeKey.trim()}`;
}

export function dedupeRewardMilestoneUmPoints(
  userId: string,
  threshold: number
): string {
  return `reward_milestone:um_points:${userId}:${threshold}`;
}

export function dedupeNearbyLive(roomId: string, userId: string): string {
  return `nearby_live_started:${roomId}:${userId}`;
}

export function dedupeAiInsight(userId: string, insightKey: string): string {
  return `ai_creator_insight:${userId}:${insightKey.trim()}`;
}

/** View milestones that should fire once per post. */
export const VIEW_MILESTONES = [500, 1000, 10_000, 100_000] as const;

/** Country-count milestones. */
export const COUNTRY_MILESTONES = [5, 10, 25] as const;

/** UM Points balance milestones. */
export const UM_POINTS_MILESTONES = [
  1000, 5000, 10_000, 50_000, 100_000,
] as const;

export function viewMilestonesReached(views: number): number[] {
  return VIEW_MILESTONES.filter((m) => views >= m);
}

export function countryMilestonesReached(countryCount: number): number[] {
  return COUNTRY_MILESTONES.filter((m) => countryCount >= m);
}

export function umPointsMilestonesReached(balance: number): number[] {
  return UM_POINTS_MILESTONES.filter((m) => balance >= m);
}
