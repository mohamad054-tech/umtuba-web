/**
 * Contract helpers for live_started / nearby_live_started fan-out.
 * Must stay aligned with notify_on_live_started in
 * supabase/migrations/20260808_live_started_insert_notification_fix.sql
 */

export type LiveRoomNotifyStatus = "idle" | "live" | "ended";

/** When the DB trigger should fan out live_started (+ nearby). */
export function shouldNotifyLiveStarted(input: {
  op: "INSERT" | "UPDATE";
  newStatus: LiveRoomNotifyStatus | string;
  oldStatus?: LiveRoomNotifyStatus | string | null;
}): boolean {
  if (input.op === "INSERT") {
    return input.newStatus === "live";
  }
  if (input.op === "UPDATE") {
    return input.oldStatus !== "live" && input.newStatus === "live";
  }
  return false;
}

export function dedupeLiveStarted(roomId: string, followerId: string): string {
  return `live_started:${roomId}:${followerId}`;
}

export function dedupeNearbyLiveStarted(roomId: string, userId: string): string {
  return `nearby_live_started:${roomId}:${userId}`;
}
