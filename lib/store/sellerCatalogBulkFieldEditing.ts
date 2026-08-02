/**
 * Seller Catalog Bulk Field Editing Foundation V1.
 * Allowlisted field edits via existing updateDraftProduct only.
 * No tags schema, visibility invent, price/stock, publish, or new RPCs.
 */

import { canSellerEditProductFields } from "./sellerCatalogPresentation";
import {
  uniqueBulkSelectionIds,
  type SellerCatalogBulkOutcome,
  type SellerCatalogBulkSelectionItem,
} from "./sellerCatalogBulkOperations";
import { assertPrimaryCategoryEligibleForReview } from "./categoryTaxonomySeed";
import { requireSellerCatalogShortDescription } from "./sellerCatalogCategoryShortDescription";

export const SELLER_CATALOG_BULK_FIELD_EDITING_ID =
  "commerce.seller.catalog_bulk_field_editing_v1" as const;

/** Hard cap — refuse silently oversize batches. */
export const SELLER_CATALOG_BULK_FIELD_EDIT_MAX = 100;

/** Safe write concurrency when invoking per-product services. */
export const SELLER_CATALOG_BULK_FIELD_EDIT_CONCURRENCY = 5;

export type SellerCatalogBulkFieldId =
  | "category"
  | "short_description"
  | "tags"
  | "visibility"
  | "price"
  | "status"
  | "stock_quantity"
  | "availability"
  | "marketplace_eligible";

export type SellerCatalogBulkFieldOperation =
  | "replace"
  | "add"
  | "remove"
  | "clear";

export type SellerCatalogBulkFieldSelectionItem =
  SellerCatalogBulkSelectionItem & {
    primaryCategoryId?: string | null;
    shortDescription?: string | null;
  };

export type SellerCatalogBulkFieldItemResult = {
  productId: string;
  title?: string;
  outcome: SellerCatalogBulkOutcome;
  reason?: string;
};

export type SellerCatalogBulkFieldPlan = {
  field: SellerCatalogBulkFieldId;
  operation: SellerCatalogBulkFieldOperation;
  label: string;
  supported: boolean;
  deferredReason?: string;
  valuePreview: string;
  selectedCount: number;
  eligible: SellerCatalogBulkFieldSelectionItem[];
  skipped: Array<SellerCatalogBulkFieldSelectionItem & { reason: string }>;
  warnings: string[];
  expectedImpact: string;
};

export type SellerCatalogBulkFieldSummary = {
  field: SellerCatalogBulkFieldId;
  operation: SellerCatalogBulkFieldOperation;
  label: string;
  succeeded: number;
  failed: number;
  skipped: number;
  total: number;
  overall: "success" | "partial" | "failed" | "skipped_only" | "empty";
  results: SellerCatalogBulkFieldItemResult[];
};

const FIELD_LABELS: Record<SellerCatalogBulkFieldId, string> = {
  category: "Category",
  short_description: "Short description",
  tags: "Tags",
  visibility: "Visibility",
  price: "Price",
  status: "Status",
  stock_quantity: "Stock quantity",
  availability: "Availability",
  marketplace_eligible: "Marketplace eligibility",
};

const SUPPORTED_FIELDS = new Set<SellerCatalogBulkFieldId>([
  "category",
  "short_description",
]);

const FIELD_OPERATIONS: Record<
  SellerCatalogBulkFieldId,
  readonly SellerCatalogBulkFieldOperation[]
> = {
  category: ["replace", "clear"],
  short_description: ["replace", "clear"],
  tags: ["add", "remove", "replace", "clear"],
  visibility: ["replace"],
  price: ["replace"],
  status: ["replace"],
  stock_quantity: ["replace"],
  availability: ["replace"],
  marketplace_eligible: ["replace"],
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sellerCatalogBulkFieldLabel(
  field: SellerCatalogBulkFieldId
): string {
  return FIELD_LABELS[field];
}

export function isSellerCatalogBulkFieldSupported(
  field: SellerCatalogBulkFieldId
): boolean {
  return SUPPORTED_FIELDS.has(field);
}

export function deferredSellerCatalogBulkFieldReason(
  field: SellerCatalogBulkFieldId
): string | undefined {
  switch (field) {
    case "tags":
      return "Product tags are not on the store_products model yet — deferred (no migration).";
    case "visibility":
      return "No seller storefront visibility/hide field contract — deferred.";
    case "price":
      return "Bulk price edits deferred — no safe bulk currency/active-price service.";
    case "status":
      return "Bulk status changes deferred — use submit/archive bulk ops, not field mass-assign.";
    case "stock_quantity":
      return "Bulk stock edits are forbidden in this foundation.";
    case "availability":
      return "Availability is derived from trusted inventory seed fields; bulk status mass-assign is deferred.";
    case "marketplace_eligible":
      return "Marketplace eligibility bulk toggle deferred — not storefront visibility.";
    default:
      return undefined;
  }
}

export function allowedOperationsForBulkField(
  field: SellerCatalogBulkFieldId
): readonly SellerCatalogBulkFieldOperation[] {
  return FIELD_OPERATIONS[field] ?? [];
}

export function isBulkFieldOperationAllowed(
  field: SellerCatalogBulkFieldId,
  operation: SellerCatalogBulkFieldOperation
): boolean {
  return allowedOperationsForBulkField(field).includes(operation);
}

export function deriveSellerCatalogBulkFieldToolbar(input: {
  selectedCount: number;
}): Array<{
  id: SellerCatalogBulkFieldId;
  label: string;
  enabled: boolean;
  reason?: string;
}> {
  const empty = input.selectedCount === 0;
  return (
    [
      "category",
      "short_description",
      "tags",
      "visibility",
      "price",
      "status",
      "stock_quantity",
      "availability",
      "marketplace_eligible",
    ] as SellerCatalogBulkFieldId[]
  ).map((id) => {
    const supported = isSellerCatalogBulkFieldSupported(id);
    if (empty) {
      return {
        id,
        label: sellerCatalogBulkFieldLabel(id),
        enabled: false,
        reason: "Select products first.",
      };
    }
    if (!supported) {
      return {
        id,
        label: sellerCatalogBulkFieldLabel(id),
        enabled: false,
        reason: deferredSellerCatalogBulkFieldReason(id),
      };
    }
    return {
      id,
      label: sellerCatalogBulkFieldLabel(id),
      enabled: true,
    };
  });
}

export function normalizeBulkShortDescription(
  value: unknown
): { ok: true; value: string } | { ok: false; message: string } {
  return requireSellerCatalogShortDescription(value);
}

export function normalizeBulkCategoryId(
  value: unknown
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, message: "Category id is required." };
  }
  const id = value.trim();
  if (!UUID_RE.test(id)) {
    return { ok: false, message: "Category id is invalid." };
  }
  return { ok: true, value: id };
}

export function assertBulkFieldEditBatchSize(selectedCount: number):
  | { ok: true }
  | { ok: false; message: string } {
  if (!Number.isFinite(selectedCount) || selectedCount < 1) {
    return { ok: false, message: "Select at least one product." };
  }
  if (selectedCount > SELLER_CATALOG_BULK_FIELD_EDIT_MAX) {
    return {
      ok: false,
      message: `Bulk field edit supports at most ${SELLER_CATALOG_BULK_FIELD_EDIT_MAX} products. Split the selection and try again.`,
    };
  }
  return { ok: true };
}

export function parseSellerCatalogBulkFieldId(
  raw: unknown
): SellerCatalogBulkFieldId | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim() as SellerCatalogBulkFieldId;
  if (!(id in FIELD_LABELS)) return null;
  return id;
}

export function parseSellerCatalogBulkFieldOperation(
  raw: unknown
): SellerCatalogBulkFieldOperation | null {
  if (typeof raw !== "string") return null;
  const op = raw.trim() as SellerCatalogBulkFieldOperation;
  if (
    op === "replace" ||
    op === "add" ||
    op === "remove" ||
    op === "clear"
  ) {
    return op;
  }
  return null;
}

function normalizeComparableShortDescription(
  value: string | null | undefined
): string {
  return typeof value === "string" ? value.trim() : "";
}

function planValuePreview(input: {
  field: SellerCatalogBulkFieldId;
  operation: SellerCatalogBulkFieldOperation;
  categoryId?: string | null;
  categoryName?: string | null;
  shortDescription?: string | null;
}): string {
  if (input.operation === "clear") return "(clear)";
  if (input.field === "category") {
    return input.categoryName?.trim() || input.categoryId || "(none)";
  }
  if (input.field === "short_description") {
    return input.shortDescription?.trim() || "(none)";
  }
  return "(n/a)";
}

/** Keep field metadata (category/description) while enforcing store scope. */
function filterBulkFieldSelectionToStore(
  items: readonly SellerCatalogBulkFieldSelectionItem[],
  storeId: string
): {
  owned: SellerCatalogBulkFieldSelectionItem[];
  rejected: Array<SellerCatalogBulkFieldSelectionItem & { reason: string }>;
} {
  const expected = String(storeId ?? "").trim();
  const owned: SellerCatalogBulkFieldSelectionItem[] = [];
  const rejected: Array<
    SellerCatalogBulkFieldSelectionItem & { reason: string }
  > = [];
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

/**
 * Client/server shared planner. Category existence is validated server-side;
 * pass `categoryFound` / `categoryStatus` when known.
 */
export function planSellerCatalogBulkFieldEdit(input: {
  field: SellerCatalogBulkFieldId;
  operation: SellerCatalogBulkFieldOperation;
  storeId: string;
  items: readonly SellerCatalogBulkFieldSelectionItem[];
  categoryId?: string | null;
  categoryName?: string | null;
  shortDescription?: string | null;
  categoryFound?: boolean;
  categoryStatus?: string | null;
}): SellerCatalogBulkFieldPlan {
  const label = `${sellerCatalogBulkFieldLabel(input.field)} · ${input.operation}`;
  const uniqueIds = uniqueBulkSelectionIds(input.items);
  const deduped = uniqueIds
    .map((id) => input.items.find((row) => row.id === id))
    .filter(Boolean) as SellerCatalogBulkFieldSelectionItem[];

  const sizeGate = assertBulkFieldEditBatchSize(deduped.length);
  const valuePreview = planValuePreview({
    field: input.field,
    operation: input.operation,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    shortDescription: input.shortDescription,
  });

  const { owned, rejected } = filterBulkFieldSelectionToStore(
    deduped,
    input.storeId
  );

  if (!sizeGate.ok) {
    return {
      field: input.field,
      operation: input.operation,
      label,
      supported: false,
      deferredReason: sizeGate.message,
      valuePreview,
      selectedCount: deduped.length,
      eligible: [],
      skipped: owned.map((item) => ({
        ...item,
        reason: sizeGate.message,
      })),
      warnings: [sizeGate.message],
      expectedImpact: "No products will be updated.",
    };
  }

  if (!isSellerCatalogBulkFieldSupported(input.field)) {
    const reason =
      deferredSellerCatalogBulkFieldReason(input.field) ||
      "Field is not supported for bulk edit.";
    return {
      field: input.field,
      operation: input.operation,
      label,
      supported: false,
      deferredReason: reason,
      valuePreview,
      selectedCount: deduped.length,
      eligible: [],
      skipped: [
        ...rejected,
        ...owned.map((item) => ({ ...item, reason })),
      ],
      warnings: [reason],
      expectedImpact: "No products will be updated.",
    };
  }

  if (!isBulkFieldOperationAllowed(input.field, input.operation)) {
    const reason = `Operation "${input.operation}" is not allowed for ${sellerCatalogBulkFieldLabel(input.field)}.`;
    return {
      field: input.field,
      operation: input.operation,
      label,
      supported: false,
      deferredReason: reason,
      valuePreview,
      selectedCount: deduped.length,
      eligible: [],
      skipped: [
        ...rejected,
        ...owned.map((item) => ({ ...item, reason })),
      ],
      warnings: [reason],
      expectedImpact: "No products will be updated.",
    };
  }

  let normalizedCategoryId: string | null = null;
  let normalizedShort: string | null = null;
  const valueErrors: string[] = [];

  if (input.field === "category" && input.operation === "replace") {
    const parsed = normalizeBulkCategoryId(input.categoryId);
    if (!parsed.ok) {
      valueErrors.push(parsed.message);
    } else {
      const eligibility = assertPrimaryCategoryEligibleForReview({
        primaryCategoryId: parsed.value,
        categoryFound: input.categoryFound,
        categoryStatus: input.categoryStatus,
      });
      if (!eligibility.ok) {
        valueErrors.push(eligibility.message);
      } else {
        normalizedCategoryId = parsed.value;
      }
    }
  }

  if (input.field === "short_description" && input.operation === "replace") {
    const parsed = normalizeBulkShortDescription(input.shortDescription);
    if (!parsed.ok) {
      valueErrors.push(parsed.message);
    } else {
      normalizedShort = parsed.value;
    }
  }

  if (valueErrors.length > 0) {
    const reason = valueErrors[0]!;
    return {
      field: input.field,
      operation: input.operation,
      label,
      supported: false,
      deferredReason: reason,
      valuePreview,
      selectedCount: deduped.length,
      eligible: [],
      skipped: [
        ...rejected,
        ...owned.map((item) => ({ ...item, reason })),
      ],
      warnings: valueErrors,
      expectedImpact: "No products will be updated.",
    };
  }

  const eligible: SellerCatalogBulkFieldSelectionItem[] = [];
  const skipped: Array<
    SellerCatalogBulkFieldSelectionItem & { reason: string }
  > = [...rejected];

  for (const item of owned) {
    if (!canSellerEditProductFields(item.status)) {
      skipped.push({
        ...item,
        reason:
          "Only draft, in-review, or rejected products can be field-edited.",
      });
      continue;
    }

    if (input.field === "category") {
      if (input.operation === "replace") {
        if (
          String(item.primaryCategoryId ?? "") === String(normalizedCategoryId)
        ) {
          skipped.push({
            ...item,
            reason: "Already has this category (no-op).",
          });
          continue;
        }
        eligible.push(item);
        continue;
      }
      if (input.operation === "clear") {
        if (!item.primaryCategoryId) {
          skipped.push({
            ...item,
            reason: "Category already empty (no-op).",
          });
          continue;
        }
        eligible.push(item);
        continue;
      }
    }

    if (input.field === "short_description") {
      const current = normalizeComparableShortDescription(
        item.shortDescription
      );
      if (input.operation === "replace") {
        if (current === String(normalizedShort)) {
          skipped.push({
            ...item,
            reason: "Short description already matches (no-op).",
          });
          continue;
        }
        eligible.push(item);
        continue;
      }
      if (input.operation === "clear") {
        if (!current) {
          skipped.push({
            ...item,
            reason: "Short description already empty (no-op).",
          });
          continue;
        }
        eligible.push(item);
        continue;
      }
    }

    skipped.push({
      ...item,
      reason: "Unable to plan this product for the selected field edit.",
    });
  }

  const warnings: string[] = [];
  if (skipped.length > 0) {
    warnings.push(
      `${skipped.length} product${skipped.length === 1 ? "" : "s"} will be skipped.`
    );
  }
  if (eligible.length === 0) {
    warnings.push("No eligible products for this field edit.");
  }

  const expectedImpact =
    eligible.length === 0
      ? "No products will be updated."
      : `Will update ${eligible.length} product${eligible.length === 1 ? "" : "s"} (${sellerCatalogBulkFieldLabel(input.field)} ${input.operation}).`;

  return {
    field: input.field,
    operation: input.operation,
    label,
    supported: true,
    valuePreview,
    selectedCount: deduped.length,
    eligible,
    skipped,
    warnings,
    expectedImpact,
  };
}

export function buildSellerCatalogBulkFieldSummary(input: {
  field: SellerCatalogBulkFieldId;
  operation: SellerCatalogBulkFieldOperation;
  results: SellerCatalogBulkFieldItemResult[];
}): SellerCatalogBulkFieldSummary {
  const label = `${sellerCatalogBulkFieldLabel(input.field)} · ${input.operation}`;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of input.results) {
    if (row.outcome === "success") succeeded += 1;
    else if (row.outcome === "failed") failed += 1;
    else skipped += 1;
  }
  const total = input.results.length;
  let overall: SellerCatalogBulkFieldSummary["overall"] = "empty";
  if (total === 0) overall = "empty";
  else if (succeeded === total) overall = "success";
  else if (succeeded === 0 && failed === 0) overall = "skipped_only";
  else if (succeeded === 0) overall = "failed";
  else overall = "partial";

  return {
    field: input.field,
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

export function mergeBulkFieldPlanWithExecutionResults(input: {
  plan: SellerCatalogBulkFieldPlan;
  execution: Array<{
    productId: string;
    ok: boolean;
    skipped?: boolean;
    message?: string;
  }>;
}): SellerCatalogBulkFieldSummary {
  const byId = new Map(
    input.execution.map((row) => [row.productId, row] as const)
  );
  const results: SellerCatalogBulkFieldItemResult[] = [];

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
    if (exec.skipped) {
      results.push({
        productId: eligible.id,
        title: eligible.title,
        outcome: "skipped",
        reason: exec.message || "Skipped.",
      });
      continue;
    }
    results.push({
      productId: eligible.id,
      title: eligible.title,
      outcome: exec.ok ? "success" : "failed",
      reason: exec.ok ? undefined : exec.message || "Update failed.",
    });
  }

  return buildSellerCatalogBulkFieldSummary({
    field: input.plan.field,
    operation: input.plan.operation,
    results,
  });
}

/** Build updateDraftProduct payload for one planned field edit. */
export function buildBulkFieldUpdateDraftPayload(input: {
  field: "category" | "short_description";
  operation: SellerCatalogBulkFieldOperation;
  categoryId?: string | null;
  shortDescription?: string | null;
}): Record<string, unknown> {
  if (input.field === "category") {
    if (input.operation === "clear") {
      return { clearPrimaryCategory: true };
    }
    return { categoryId: input.categoryId };
  }
  if (input.operation === "clear") {
    return { shortDescription: "" };
  }
  return { shortDescription: input.shortDescription };
}

export async function mapWithConcurrencyLimit<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const concurrency = Math.max(1, Math.min(limit, items.length || 1));
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]!, index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () =>
      runWorker()
    )
  );
  return results;
}
