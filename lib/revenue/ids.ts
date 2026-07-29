/**
 * Money + identity helpers for Unified Revenue Platform.
 */

import { createHash, randomUUID } from "crypto";

export class RevenuePlatformError extends Error {
  readonly code:
    | "invalid_input"
    | "not_found"
    | "immutable_violation"
    | "unbalanced_ledger"
    | "direct_balance_mutation_forbidden"
    | "provider_forbidden";

  constructor(
    code: RevenuePlatformError["code"],
    message: string
  ) {
    super(message);
    this.name = "RevenuePlatformError";
    this.code = code;
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRevenueUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value));
}

export function requireRevenueUuid(value: string, field: string): string {
  if (!isRevenueUuid(value)) {
    throw new RevenuePlatformError(
      "invalid_input",
      `${field} must be a UUID.`
    );
  }
  return value;
}

export function assertMinorAmount(
  amountMinor: number,
  opts: { allowZero?: boolean; field?: string } = {}
): number {
  const field = opts.field ?? "amountMinor";
  if (!Number.isInteger(amountMinor) || !Number.isFinite(amountMinor)) {
    throw new RevenuePlatformError(
      "invalid_input",
      `${field} must be a finite integer (minor units).`
    );
  }
  if (amountMinor < 0) {
    throw new RevenuePlatformError(
      "invalid_input",
      `${field} must not be negative.`
    );
  }
  if (!opts.allowZero && amountMinor === 0) {
    throw new RevenuePlatformError(
      "invalid_input",
      `${field} must be greater than zero.`
    );
  }
  return amountMinor;
}

/**
 * Deterministic id from a stable seed (for tests / idempotent proposals).
 * Not a cryptographic commitment — foundation helper only.
 */
export function deterministicRevenueId(
  namespace: string,
  seed: string
): string {
  const ns = namespace.trim();
  const s = seed.trim();
  if (!ns || !s) {
    throw new RevenuePlatformError(
      "invalid_input",
      "namespace and seed are required for deterministic ids."
    );
  }
  const hex = createHash("sha256")
    .update(`${ns}:${s}`)
    .digest("hex")
    .slice(0, 32);
  // Format as UUID v4-shaped string with fixed version/variant nibble pattern.
  const parts = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ];
  return parts.join("-");
}

export function newRevenueId(): string {
  return randomUUID();
}
