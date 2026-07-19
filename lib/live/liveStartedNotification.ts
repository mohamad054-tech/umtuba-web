/**
 * Client-side contracts mirroring
 * `notify_on_live_started` / live_rooms_notify_started (20260808).
 * Source of truth for firing rules remains the SQL trigger; these helpers
 * keep unit tests and docs aligned without touching the database.
 */

export type LiveRoomStatus = string;

export type LiveStartedNotifyOp = "INSERT" | "UPDATE";

export type LiveStartedNotifyInput = {
  op: LiveStartedNotifyOp;
  newStatus: LiveRoomStatus;
  /** Required for UPDATE; ignored for INSERT. */
  oldStatus?: LiveRoomStatus | null;
  hostId?: string | null;
  recipientId?: string | null;
};

/**
 * True when the room *becomes* live (INSERT-as-live or non-live → live).
 * False for idle/scheduled/offline inserts and live → live updates.
 */
export function shouldNotifyLiveStarted(
  input: LiveStartedNotifyInput
): boolean {
  if (input.newStatus !== "live") return false;
  if (input.op === "INSERT") return true;
  if (input.op === "UPDATE") {
    return input.oldStatus !== "live";
  }
  return false;
}

/** Host must never receive their own live_started notification. */
export function isSelfLiveStartedRecipient(
  hostId: string | null | undefined,
  recipientId: string | null | undefined
): boolean {
  if (!hostId || !recipientId) return false;
  return hostId === recipientId;
}

/** Stable dedupe key used by SQL create_notification for followers. */
export function dedupeLiveStarted(
  roomId: string,
  recipientId: string
): string {
  return `live_started:${roomId}:${recipientId}`;
}

/** Stable dedupe key used by SQL for opt-in nearby live. */
export function dedupeNearbyLiveStarted(
  roomId: string,
  recipientId: string
): string {
  return `nearby_live_started:${roomId}:${recipientId}`;
}

/**
 * Combined gate used by tests: become-live + not self.
 * Preferences and DB unique(dedupe) remain enforced in SQL.
 */
export function shouldDeliverLiveStartedNotification(
  input: LiveStartedNotifyInput
): boolean {
  if (!shouldNotifyLiveStarted(input)) return false;
  if (isSelfLiveStartedRecipient(input.hostId, input.recipientId)) {
    return false;
  }
  return true;
}
