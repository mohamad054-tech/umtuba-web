/**
 * Stable provider + local idempotency key: prf-prov:{ledgerId}
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildPartialRefundProviderIdempotencyKey(
  ledgerId: string
): string {
  return `prf-prov:${ledgerId.trim().toLowerCase()}`;
}

export function assertPartialRefundProviderIdempotencyKey(
  ledgerId: string,
  key: string
): { ok: true; key: string } | { ok: false; message: string } {
  if (!UUID_RE.test(ledgerId.trim())) {
    return { ok: false, message: "ledgerId must be a UUID." };
  }
  const expected = buildPartialRefundProviderIdempotencyKey(ledgerId);
  const trimmed = key.trim();
  if (trimmed !== expected) {
    return {
      ok: false,
      message: `Idempotency key must equal ${expected}.`,
    };
  }
  if (trimmed.length < 8 || trimmed.length > 128) {
    return { ok: false, message: "Idempotency key length invalid." };
  }
  return { ok: true, key: trimmed };
}
