/**
 * Stable domain error mapping for partial-refund ledger service-role RPCs.
 * Never logs credentials or raw provider payloads.
 */

import type { PartialRefundLedgerFailureCode } from "./types";

const KNOWN_CODES: readonly PartialRefundLedgerFailureCode[] = [
  "duplicate_ledger_id",
  "duplicate_commit",
  "duplicate_idempotency_key",
  "unknown_refund",
  "currency_mismatch",
  "negative_amount",
  "zero_amount",
  "over_refund",
  "over_quantity",
  "missing_capture",
  "missing_order_item",
  "missing_ownership",
  "concurrent_conflict",
  "stale_version",
  "unsupported_runtime",
  "unsupported_transition",
  "invalid_state",
  "malformed_id",
  "malformed_idempotency_key",
  "empty_lines",
  "inconsistent_line_math",
] as const;

export type PartialRefundServiceAdapterErrorCode =
  | PartialRefundLedgerFailureCode
  | "rpc_failed"
  | "malformed_rpc_response"
  | "service_role_required"
  | "browser_forbidden";

const CODE_SET = new Set<string>(KNOWN_CODES);

/**
 * Map a Postgres/Supabase exception message to a stable ledger failure code.
 * Prefer exact raised tokens from 20260900 RPCs.
 */
export function mapPartialRefundRpcErrorMessage(
  message: string | null | undefined
): PartialRefundLedgerFailureCode | "rpc_failed" {
  const raw = (message ?? "").trim();
  if (!raw) return "rpc_failed";

  // Prefer last path segment / last token that matches a known code.
  const tokens = raw
    .split(/[\s:]+/)
    .map((t) => t.replace(/[^a-z0-9_]/gi, "").toLowerCase())
    .filter(Boolean);

  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    const t = tokens[i]!;
    if (CODE_SET.has(t)) {
      return t as PartialRefundLedgerFailureCode;
    }
  }

  for (const code of KNOWN_CODES) {
    if (raw.includes(code)) return code;
  }

  return "rpc_failed";
}

export function safeRpcErrorMessage(
  code: PartialRefundServiceAdapterErrorCode,
  fallback: string
): string {
  switch (code) {
    case "stale_version":
      return "Capture accounting version is stale.";
    case "duplicate_idempotency_key":
      return "Idempotency key reuse with a conflicting plan.";
    case "over_refund":
      return "Refund would exceed remaining capture balance.";
    case "over_quantity":
      return "Refund quantity would exceed purchased quantity.";
    case "malformed_rpc_response":
      return "Privileged ledger RPC returned a malformed payload.";
    case "service_role_required":
      return "Partial refund ledger adapter requires an injected service-role RPC port.";
    case "browser_forbidden":
      return "Partial refund ledger service adapter cannot run in the browser.";
    case "rpc_failed":
      return fallback || "Privileged ledger RPC failed.";
    default:
      return fallback || `Ledger RPC failed (${code}).`;
  }
}
