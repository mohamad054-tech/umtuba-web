/**
 * Idempotency helpers for reservation-only actions.
 * Keys are derived server-side from trusted selection when not supplied.
 */

import { createHash } from "node:crypto";
import type { PartialRefundLineIntent } from "../partialRefundPath/types";

const IDEM_MIN = 8;
const IDEM_MAX = 128;

export function validateOptionalIdempotencyKey(
  raw: string | null | undefined
): { ok: true; key: string | null } | { ok: false; message: string } {
  if (raw == null || raw.trim() === "") {
    return { ok: true, key: null };
  }
  const t = raw.trim();
  if (t.length < IDEM_MIN || t.length > IDEM_MAX) {
    return {
      ok: false,
      message: `Idempotency key must be ${IDEM_MIN}–${IDEM_MAX} characters.`,
    };
  }
  return { ok: true, key: t };
}

/**
 * Stable server-derived idempotency key from capture + sorted line intents.
 * Does not incorporate client money fields.
 */
export function deriveReservationIdempotencyKey(
  captureEventId: string,
  intent: readonly PartialRefundLineIntent[]
): string {
  const sorted = [...intent]
    .map((i) => ({
      orderItemId: i.orderItemId.trim().toLowerCase(),
      requestedQuantity: Math.trunc(i.requestedQuantity),
    }))
    .sort((a, b) => a.orderItemId.localeCompare(b.orderItemId));
  const payload = JSON.stringify({
    v: 1,
    captureEventId: captureEventId.trim().toLowerCase(),
    lines: sorted,
  });
  const hash = createHash("sha256").update(payload).digest("hex").slice(0, 40);
  return `prf-res-v1:${hash}`;
}
