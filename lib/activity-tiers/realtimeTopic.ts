/**
 * Realtime channel topics for activity-tier balance subscriptions.
 * Topics must be unique per hook instance so concurrent mounts
 * (e.g. AppTopNav + Watch) never call .on() on an already-subscribed channel.
 */

export function buildActivityTierRealtimeTopic(
  userId: string,
  instanceId: string
): string {
  const uid = userId.trim();
  const instance = instanceId.trim();
  if (!uid || !instance) {
    throw new Error("userId and instanceId are required for activity-tier topic");
  }
  return `activity-tier:${uid}:${instance}`;
}

/** Opaque id for one subscription lifecycle (one useActivityTier mount). */
export function createActivityTierRealtimeInstanceId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
