/**
 * UEOS Foundation V1 helpers.
 * Money movement must go only through DB write-gate RPCs
 * (`ueos_ensure_account`, `ueos_post_journal`). This module does not write
 * ledger tables directly.
 */

export {
  UEOS_FUTURE_TOKEN_ASSET,
  UEOS_SEEDED_ACTIVE_FIAT_ASSETS,
  UEOS_SEEDED_POINTS_ASSET,
  UEOS_WRITE_GATE_RPCS,
} from "./types";

export type {
  UeosAccountKind,
  UeosAssetKind,
  UeosAssetLifecycleStatus,
  UeosCreatedBy,
  UeosEnsureAccountInput,
  UeosJournalEventType,
  UeosLedgerDirection,
  UeosOwnerType,
  UeosPolicyStatus,
  UeosPostLineInput,
  UeosProductStatus,
} from "./types";

import type { UeosEnsureAccountInput, UeosPostLineInput } from "./types";

/** Maps app line inputs to the JSON array expected by `ueos_post_journal`. */
export function toUeosPostLinesJson(lines: UeosPostLineInput[]): unknown[] {
  return lines.map((line) => {
    const row: Record<string, unknown> = {
      account_id: line.accountId,
      direction: line.direction,
      amount_minor: line.amountMinor,
    };
    if (line.assetCode) {
      row.asset_code = line.assetCode;
    }
    return row;
  });
}

/** Args object for documentation / future service-role callers. */
export function buildUeosEnsureAccountArgs(input: UeosEnsureAccountInput) {
  return {
    p_owner_type: input.ownerType,
    p_owner_id: input.ownerId,
    p_account_kind: input.accountKind,
    p_asset_code: input.assetCode,
    p_product_scope: input.productScope,
  };
}

export function isUeosPostableLifecycle(
  lifecycleStatus: string | null | undefined
): boolean {
  return lifecycleStatus === "active";
}

export function isUeosFutureTokenAsset(assetCode: string): boolean {
  return assetCode.trim().toUpperCase() === "UMT";
}
