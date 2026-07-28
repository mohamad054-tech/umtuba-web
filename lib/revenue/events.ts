/**
 * Revenue event contracts — validation only.
 */

import {
  assertMinorAmount,
  isRevenueUuid,
  newRevenueId,
  requireRevenueUuid,
  RevenuePlatformError,
} from "./ids";
import { assertRevenueSourceId } from "./sources";
import {
  REVENUE_CURRENCIES,
  REVENUE_EVENT_TYPES,
  type RevenueCurrency,
  type RevenueEvent,
  type RevenueEventType,
  type RevenueMoney,
} from "./types";

const EVENT_SET = new Set<string>(REVENUE_EVENT_TYPES);
const CURRENCY_SET = new Set<string>(REVENUE_CURRENCIES);
const MAX_META = 16;

export function assertRevenueEventType(
  eventType: string
): asserts eventType is RevenueEventType {
  if (!EVENT_SET.has(eventType)) {
    throw new RevenuePlatformError(
      "invalid_input",
      `Unknown revenue event type: ${eventType}`
    );
  }
}

export function validateRevenueMoney(
  money: RevenueMoney,
  opts: { allowZero?: boolean } = {}
): RevenueMoney {
  if (!CURRENCY_SET.has(money.currency)) {
    throw new RevenuePlatformError(
      "invalid_input",
      `Unsupported currency: ${money.currency}`
    );
  }
  return {
    currency: money.currency as RevenueCurrency,
    amountMinor: assertMinorAmount(money.amountMinor, {
      allowZero: opts.allowZero,
    }),
  };
}

function sanitizeMetadata(
  metadata: RevenueEvent["metadata"] | undefined
): RevenueEvent["metadata"] {
  const out: RevenueEvent["metadata"] = {};
  if (!metadata) return out;
  const keys = Object.keys(metadata);
  if (keys.length > MAX_META) {
    throw new RevenuePlatformError("invalid_input", "Too many metadata keys.");
  }
  for (const key of keys) {
    const k = key.trim();
    if (!k) {
      throw new RevenuePlatformError("invalid_input", "Empty metadata key.");
    }
    const lower = k.toLowerCase();
    if (
      lower.includes("apikey") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("providerpayload")
    ) {
      throw new RevenuePlatformError(
        "provider_forbidden",
        `Forbidden metadata key: ${k}`
      );
    }
    const value = metadata[key];
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw new RevenuePlatformError(
        "invalid_input",
        `Unsupported metadata type for ${k}.`
      );
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new RevenuePlatformError(
        "invalid_input",
        `Non-finite metadata for ${k}.`
      );
    }
    out[k] = value;
  }
  return out;
}

export function validateRevenueEvent(
  input: Omit<RevenueEvent, "eventId" | "occurredAt"> & {
    eventId?: string;
    occurredAt?: string;
  }
): RevenueEvent {
  assertRevenueEventType(input.eventType);
  assertRevenueSourceId(input.sourceId);

  const eventId = input.eventId?.trim()
    ? requireRevenueUuid(input.eventId, "eventId")
    : newRevenueId();

  if (input.transactionId != null && !isRevenueUuid(input.transactionId)) {
    throw new RevenuePlatformError(
      "invalid_input",
      "transactionId must be a UUID when provided."
    );
  }
  if (input.walletId != null && !isRevenueUuid(input.walletId)) {
    throw new RevenuePlatformError(
      "invalid_input",
      "walletId must be a UUID when provided."
    );
  }

  return {
    eventId,
    eventType: input.eventType,
    sourceId: input.sourceId,
    transactionId: input.transactionId ?? null,
    walletId: input.walletId ?? null,
    money: input.money ? validateRevenueMoney(input.money) : null,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    metadata: sanitizeMetadata(input.metadata),
  };
}
