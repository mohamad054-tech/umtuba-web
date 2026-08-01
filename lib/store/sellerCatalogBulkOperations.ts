/**
 * Seller Catalog Bulk Operations Foundation V1.
 * Plans and summarizes bulk actions using existing eligibility rules.
 * Does not invent seller self-publish / restore / unpublish services.
 */

import {
  canSellerArchiveProduct,
  canSellerSubmitForReview,
} from "./sellerCatalogPresentation";

export const SELLER_CATALOG_BULK_OPERATIONS_ID =
  "commerce.seller.catalog_bulk_operations_v1" as const;

export type SellerCatalogBulkOperationId =
  | "submit_review"
  | "archive"
  | "publish"
  | "unpublish"
  | "restore";

export type SellerCatalogBulkSelectionItem = {
  id: string;
  title: string;
  status: string;
  storeId: string;
};

export type SellerCatalogBulkOutcome = "success" | "failed" | "skipped";

export type SellerCatalogBulkItemResult = {
  productId: string;
  title?: string;
  outcome: SellerCatalogBulkOutcome;
  reason?: string;
};

export type SellerCatalogBulkPlan = {
  operation: SellerCatalogBulkOperationId;
  label: string;
  supported: boolean;
  deferredReason?: string;
  eligible: SellerCatalogBulkSelectionItem[];
  skipped: Array<SellerCatalogBulkSelectionItem & { reason: string }>;
  warnings: string[];
};

export type SellerCatalogBulkSummary = {
  operation: SellerCatalogBulkOperationId;
  label: string;
  succeeded: number;
  failed: number;
  skipped: number;
  total: number;
  overall: "success" | "partial" | "failed" | "skipped_only" | "empty";
  results: SellerCatalogBulkItemResult[];
};

const OP_LABELS: Record<SellerCatalogBulkOperationId, string> = {
  submit_review: "Submit for review",
  archive: "Archive",
  publish: "Publish",
  unpublish: "Unpublish",
  restore: "Restore",
};

export function sellerCatalogBulkOperationLabel(
  operation: SellerCatalogBulkOperationId
): string {
  return OP_LABELS[operation];
}

export function isSellerCatalogBulkOperationSupported(
  operation: SellerCatalogBulkOperationId
): boolean {
  return operation === "submit_review" || operation === "archive";
}

export function deferredSellerCatalogBulkReason(
  operation: SellerCatalogBulkOperationId
): string | undefined {
  switch (operation) {
    case "publish":
      return "Sellers cannot self-publish. Publishing requires operator approval after review.";
    case "unpublish":
      return "Seller unpublish/hide is not available in the trusted catalog services yet.";
    case "restore":
      return "Restore from archived is not available in the trusted catalog services yet.";
    default:
      return undefined;
  }
}

export function uniqueBulkSelectionIds(
  items: readonly SellerCatalogBulkSelectionItem[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const id = String(item.id ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Keep only selections owned by the active store (fail-closed). */
export function filterBulkSelectionToStore(
  items: readonly SellerCatalogBulkSelectionItem[],
  storeId: string
): {
  owned: SellerCatalogBulkSelectionItem[];
  rejected: Array<SellerCatalogBulkSelectionItem & { reason: string }>;
} {
  const expected = String(storeId ?? "").trim();
  const owned: SellerCatalogBulkSelectionItem[] = [];
  const rejected: Array<SellerCatalogBulkSelectionItem & { reason: string }> =
    [];
  for (const item of items) {
    if (String(item.storeId ?? "") !== expected) {
      rejected.push({
        ...item,
        reason: "Product is outside the active store scope.",
      });
      continue;
    }
    owned.push(item);
  }
  return { owned, rejected };
}

export function toggleBulkSelection(
  current: Record<string, SellerCatalogBulkSelectionItem>,
  item: SellerCatalogBulkSelectionItem,
  selected: boolean,
  storeId: string
): Record<string, SellerCatalogBulkSelectionItem> {
  const next = { ...current };
  if (String(item.storeId) !== String(storeId)) {
    return next;
  }
  if (selected) {
    next[item.id] = {
      id: item.id,
      title: item.title,
      status: item.status,
      storeId: item.storeId,
    };
  } else {
    delete next[item.id];
  }
  return next;
}

/** Select-all applies to the current page items only. */
export function selectAllVisibleBulkItems(
  current: Record<string, SellerCatalogBulkSelectionItem>,
  visible: readonly SellerCatalogBulkSelectionItem[],
  storeId: string
): Record<string, SellerCatalogBulkSelectionItem> {
  let next = { ...current };
  for (const item of visible) {
    next = toggleBulkSelection(next, item, true, storeId);
  }
  return next;
}

export function clearBulkSelection(): Record<
  string,
  SellerCatalogBulkSelectionItem
> {
  return {};
}

export function planSellerCatalogBulkOperation(input: {
  operation: SellerCatalogBulkOperationId;
  storeId: string;
  items: readonly SellerCatalogBulkSelectionItem[];
}): SellerCatalogBulkPlan {
  const label = sellerCatalogBulkOperationLabel(input.operation);
  const { owned, rejected } = filterBulkSelectionToStore(
    input.items,
    input.storeId
  );

  if (!isSellerCatalogBulkOperationSupported(input.operation)) {
    return {
      operation: input.operation,
      label,
      supported: false,
      deferredReason: deferredSellerCatalogBulkReason(input.operation),
      eligible: [],
      skipped: [
        ...rejected,
        ...owned.map((item) => ({
          ...item,
          reason:
            deferredSellerCatalogBulkReason(input.operation) ||
            "Operation is not available.",
        })),
      ],
      warnings: [
        deferredSellerCatalogBulkReason(input.operation) ||
          "This bulk operation is deferred.",
      ],
    };
  }

  const eligible: SellerCatalogBulkSelectionItem[] = [];
  const skipped: Array<SellerCatalogBulkSelectionItem & { reason: string }> = [
    ...rejected,
  ];

  for (const item of owned) {
    if (input.operation === "submit_review") {
      if (!canSellerSubmitForReview(item.status)) {
        skipped.push({
          ...item,
          reason:
            "Only draft, in-review, or rejected products can be submitted for review.",
        });
        continue;
      }
      eligible.push(item);
      continue;
    }

    if (input.operation === "archive") {
      if (!canSellerArchiveProduct(item.status)) {
        skipped.push({
          ...item,
          reason: "Already-archived products cannot be archived again.",
        });
        continue;
      }
      eligible.push(item);
    }
  }

  const warnings: string[] = [];
  if (skipped.length > 0) {
    warnings.push(
      `${skipped.length} product${skipped.length === 1 ? "" : "s"} will be skipped.`
    );
  }
  if (eligible.length === 0) {
    warnings.push("No eligible products for this operation.");
  }

  return {
    operation: input.operation,
    label,
    supported: true,
    eligible,
    skipped,
    warnings,
  };
}

export function deriveSellerCatalogBulkToolbar(input: {
  selectedCount: number;
}): Array<{
  id: SellerCatalogBulkOperationId;
  label: string;
  enabled: boolean;
  reason?: string;
}> {
  const empty = input.selectedCount === 0;
  return (
    [
      "submit_review",
      "archive",
      "publish",
      "unpublish",
      "restore",
    ] as SellerCatalogBulkOperationId[]
  ).map((id) => {
    const supported = isSellerCatalogBulkOperationSupported(id);
    if (empty) {
      return {
        id,
        label: sellerCatalogBulkOperationLabel(id),
        enabled: false,
        reason: "Select products first.",
      };
    }
    if (!supported) {
      return {
        id,
        label: sellerCatalogBulkOperationLabel(id),
        enabled: false,
        reason: deferredSellerCatalogBulkReason(id),
      };
    }
    return {
      id,
      label: sellerCatalogBulkOperationLabel(id),
      enabled: true,
    };
  });
}

export function buildSellerCatalogBulkSummary(input: {
  operation: SellerCatalogBulkOperationId;
  results: SellerCatalogBulkItemResult[];
}): SellerCatalogBulkSummary {
  const label = sellerCatalogBulkOperationLabel(input.operation);
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of input.results) {
    if (row.outcome === "success") succeeded += 1;
    else if (row.outcome === "failed") failed += 1;
    else skipped += 1;
  }
  const total = input.results.length;
  let overall: SellerCatalogBulkSummary["overall"] = "empty";
  if (total === 0) overall = "empty";
  else if (succeeded === total) overall = "success";
  else if (succeeded === 0 && failed === 0) overall = "skipped_only";
  else if (succeeded === 0) overall = "failed";
  else overall = "partial";

  return {
    operation: input.operation,
    label,
    succeeded,
    failed,
    skipped,
    total,
    overall,
    results: input.results,
  };
}

export function mergeBulkPlanWithExecutionResults(input: {
  plan: SellerCatalogBulkPlan;
  execution: Array<{
    productId: string;
    ok: boolean;
    message?: string;
  }>;
}): SellerCatalogBulkSummary {
  const byId = new Map(
    input.execution.map((row) => [row.productId, row] as const)
  );
  const results: SellerCatalogBulkItemResult[] = [];

  for (const skipped of input.plan.skipped) {
    results.push({
      productId: skipped.id,
      title: skipped.title,
      outcome: "skipped",
      reason: skipped.reason,
    });
  }

  for (const eligible of input.plan.eligible) {
    const exec = byId.get(eligible.id);
    if (!exec) {
      results.push({
        productId: eligible.id,
        title: eligible.title,
        outcome: "failed",
        reason: "No execution result returned.",
      });
      continue;
    }
    results.push({
      productId: eligible.id,
      title: eligible.title,
      outcome: exec.ok ? "success" : "failed",
      reason: exec.ok ? undefined : exec.message || "Operation failed.",
    });
  }

  return buildSellerCatalogBulkSummary({
    operation: input.plan.operation,
    results,
  });
}
