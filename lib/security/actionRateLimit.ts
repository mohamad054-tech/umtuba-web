/**
 * In-memory per-process rate limiter for server actions (single-server v1).
 * Keyed by authenticated user id, else by request IP.
 */

export const ACTION_RATE_LIMITS = {
  view: { limit: 60, windowMs: 60_000 },
  share: { limit: 20, windowMs: 60_000 },
  watchSignal: { limit: 60, windowMs: 60_000 },
  videoCommerce: { limit: 40, windowMs: 60_000 },
  report: { limit: 5, windowMs: 60_000 },
  caption: { limit: 10, windowMs: 60_000 },
} as const;

export type ActionRateLimitName = keyof typeof ACTION_RATE_LIMITS;

export type ActionRateLimitDecision =
  | { ok: true }
  | { ok: false; retryAfterMs: number };

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 20_000;

export function consumeActionRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): ActionRateLimitDecision {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS && (!existing || existing.resetAt <= now)) {
      pruneExpiredActionRateLimits(now);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterMs: Math.max(0, existing.resetAt - now) };
  }

  existing.count += 1;
  return { ok: true };
}

export function pruneExpiredActionRateLimits(now = Date.now()): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function resetActionRateLimitsForTests(): void {
  buckets.clear();
}

export function actionRateLimitBucketKey(
  action: ActionRateLimitName,
  actor: string
): string {
  return `${action}:${actor}`;
}

export function resolveActionRateLimitActor(
  userId: string | null | undefined,
  ip: string | null | undefined
): string {
  const uid = userId?.trim();
  if (uid) {
    return `u:${uid}`;
  }
  const trimmed = ip?.trim() ?? "";
  if (trimmed) {
    return `ip:${trimmed}`;
  }
  return "ip:unknown";
}

export function clientIpFromHeaders(headerStore: {
  get(name: string): string | null;
}): string | null {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return (
    headerStore.get("x-real-ip")?.trim() ||
    headerStore.get("cf-connecting-ip")?.trim() ||
    null
  );
}

export async function consumeNamedActionRateLimit(
  action: ActionRateLimitName,
  userId: string | null | undefined
): Promise<ActionRateLimitDecision> {
  const config = ACTION_RATE_LIMITS[action];
  let ip: string | null = null;
  if (!userId) {
    const { headers } = await import("next/headers");
    ip = clientIpFromHeaders(await headers());
  }
  const key = actionRateLimitBucketKey(
    action,
    resolveActionRateLimitActor(userId, ip)
  );
  return consumeActionRateLimit(key, config.limit, config.windowMs);
}
