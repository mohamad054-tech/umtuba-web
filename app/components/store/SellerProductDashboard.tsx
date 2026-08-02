"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  bulkArchiveProductsAction,
  bulkEditProductFieldsAction,
  bulkSubmitProductsAction,
} from "../../actions/storeCatalog";
import {
  sellerModerationLabel,
  sellerProductStatusLabel,
} from "../../../lib/store/sellerCatalogPresentation";
import {
  SELLER_CATALOG_HEALTH_FILTERS,
  SELLER_CATALOG_SEARCH_SORTS,
  SELLER_CATALOG_STATUS_FILTERS,
  SELLER_CATALOG_TYPE_FILTERS,
  type SellerCatalogHealthFilter,
  type SellerCatalogProductTypeFilter,
  type SellerCatalogSearchItem,
  type SellerCatalogSearchSortKey,
  type SellerCatalogStatusFilter,
} from "../../../lib/store/sellerCatalogSearchFiltering";
import { type SellerCatalogAppliedFilters } from "../../../lib/store/sellerCatalogDataAccess";
import {
  buildSellerCatalogFilterResetHref,
  type SellerCatalogResultKind,
} from "../../../lib/store/sellerCatalogPaginationExperience";
import {
  clearBulkSelection,
  deriveSellerCatalogBulkToolbar,
  mergeBulkPlanWithExecutionResults,
  planSellerCatalogBulkOperation,
  selectAllVisibleBulkItems,
  toggleBulkSelection,
  type SellerCatalogBulkOperationId,
  type SellerCatalogBulkSummary,
} from "../../../lib/store/sellerCatalogBulkOperations";
import {
  allowedOperationsForBulkField,
  deriveSellerCatalogBulkFieldToolbar,
  isSellerCatalogBulkFieldSupported,
  planSellerCatalogBulkFieldEdit,
  type SellerCatalogBulkFieldId,
  type SellerCatalogBulkFieldOperation,
  type SellerCatalogBulkFieldSelectionItem,
  type SellerCatalogBulkFieldSummary,
} from "../../../lib/store/sellerCatalogBulkFieldEditing";
import { buildSellerCatalogCategoryShortDescriptionDisplay } from "../../../lib/store/sellerCatalogCategoryShortDescription";
import { sellerCatalogAvailabilityLabel } from "../../../lib/store/sellerCatalogAvailability";
import StoreEmptyState from "./StoreEmptyState";

type PaginationLabels = {
  pageLabel: string;
  statusLabel: string;
  nextLabel: string;
  previousLabel: string;
  nextDisabled: boolean;
  previousDisabled: boolean;
};

type CategoryOption = { id: string; name: string };

type Props = {
  products: SellerCatalogSearchItem[];
  storeId: string;
  canManage: boolean;
  storeName: string;
  applied: SellerCatalogAppliedFilters;
  pageSize: number;
  hasMore: boolean;
  nextHref: string | null;
  previousHref: string | null;
  pageNumber: number;
  resultKind: SellerCatalogResultKind;
  paginationLabels: PaginationLabels;
  healthFilterScope: "none" | "page_only";
  categories: CategoryOption[];
};

function toSelectionItem(
  product: SellerCatalogSearchItem
): SellerCatalogBulkFieldSelectionItem {
  return {
    id: product.id,
    title: product.title,
    status: String(product.status),
    storeId: product.storeId,
    primaryCategoryId: product.primaryCategoryId ?? null,
    shortDescription: product.shortDescription ?? null,
  };
}

export default function SellerProductDashboard({
  products,
  storeId,
  canManage,
  applied,
  pageSize,
  hasMore,
  nextHref,
  previousHref,
  pageNumber,
  resultKind,
  paginationLabels,
  healthFilterScope,
  categories,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(applied.search);
  const [selected, setSelected] = useState<
    Record<string, SellerCatalogBulkFieldSelectionItem>
  >({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<
    SellerCatalogBulkSummary | SellerCatalogBulkFieldSummary | null
  >(null);
  const [confirmOp, setConfirmOp] =
    useState<SellerCatalogBulkOperationId | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editField, setEditField] =
    useState<SellerCatalogBulkFieldId>("category");
  const [editOperation, setEditOperation] =
    useState<SellerCatalogBulkFieldOperation>("replace");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editShortDescription, setEditShortDescription] = useState("");
  const [editPreview, setEditPreview] = useState(false);
  const [pending, startTransition] = useTransition();
  const [navPending, startNavTransition] = useTransition();

  useEffect(() => {
    setQuery(applied.search);
  }, [applied.search]);

  const selectedItems = useMemo(() => Object.values(selected), [selected]);
  const selectedCount = selectedItems.length;
  const toolbar = deriveSellerCatalogBulkToolbar({ selectedCount });
  const fieldToolbar = deriveSellerCatalogBulkFieldToolbar({ selectedCount });

  const visibleSelectionItems = products.map(toSelectionItem);
  const allVisibleSelected =
    visibleSelectionItems.length > 0 &&
    visibleSelectionItems.every((item) => Boolean(selected[item.id]));

  const confirmPlan = confirmOp
    ? planSellerCatalogBulkOperation({
        operation: confirmOp,
        storeId,
        items: selectedItems,
      })
    : null;

  const selectedCategoryName =
    categories.find((c) => c.id === editCategoryId)?.name ?? null;

  const fieldPlan =
    editOpen && editPreview
      ? planSellerCatalogBulkFieldEdit({
          field: editField,
          operation: editOperation,
          storeId,
          items: selectedItems,
          categoryId: editCategoryId,
          categoryName: selectedCategoryName,
          shortDescription: editShortDescription,
          categoryFound: editCategoryId
            ? categories.some((c) => c.id === editCategoryId)
            : undefined,
          categoryStatus: editCategoryId
            ? categories.some((c) => c.id === editCategoryId)
              ? "active"
              : undefined
            : undefined,
        })
      : null;

  const fieldOps = allowedOperationsForBulkField(editField);

  function navigateFilters(patch: {
    search?: string;
    status?: SellerCatalogStatusFilter;
    productType?: SellerCatalogProductTypeFilter;
    sort?: SellerCatalogSearchSortKey;
    health?: SellerCatalogHealthFilter;
  }) {
    const href = buildSellerCatalogFilterResetHref({
      search: patch.search ?? applied.search,
      status: patch.status ?? applied.status,
      productType: patch.productType ?? applied.productType,
      sort: patch.sort ?? applied.sort,
      health: patch.health ?? applied.health,
      limit: pageSize,
    });
    startNavTransition(() => {
      router.push(href);
    });
  }

  function navigatePage(href: string) {
    startNavTransition(() => {
      router.push(href);
    });
  }

  function openConfirm(operation: SellerCatalogBulkOperationId) {
    const action = toolbar.find((row) => row.id === operation);
    if (!action?.enabled) {
      setError(action?.reason || "Action unavailable.");
      return;
    }
    setError(null);
    setMessage(null);
    setSummary(null);
    setEditOpen(false);
    setEditPreview(false);
    setConfirmOp(operation);
  }

  function openBulkEdit() {
    if (selectedCount === 0) {
      setError("Select products first.");
      return;
    }
    setError(null);
    setMessage(null);
    setSummary(null);
    setConfirmOp(null);
    setEditField("category");
    setEditOperation("replace");
    setEditCategoryId(categories[0]?.id ?? "");
    setEditShortDescription("");
    setEditPreview(false);
    setEditOpen(true);
  }

  function runConfirmedBulk() {
    if (!confirmPlan || !confirmOp || !confirmPlan.supported) {
      setConfirmOp(null);
      return;
    }
    const eligibleIds = confirmPlan.eligible.map((item) => item.id);
    if (eligibleIds.length === 0) {
      const emptySummary = mergeBulkPlanWithExecutionResults({
        plan: confirmPlan,
        execution: [],
      });
      setSummary(emptySummary);
      setConfirmOp(null);
      setMessage(null);
      return;
    }

    const body = new FormData();
    for (const id of eligibleIds) body.append("productId", id);
    const operation = confirmOp;
    const plan = confirmPlan;
    setConfirmOp(null);
    startTransition(async () => {
      const result =
        operation === "archive"
          ? await bulkArchiveProductsAction(body)
          : await bulkSubmitProductsAction(body);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const merged = mergeBulkPlanWithExecutionResults({
        plan,
        execution: result.results.map((row) => ({
          productId: row.productId,
          ok: row.outcome === "success",
          message: row.reason,
        })),
      });
      setSummary(merged);
      if (merged.overall === "success") {
        setMessage(`${merged.label}: ${merged.succeeded} succeeded.`);
      } else {
        setMessage(
          `${merged.label}: ${merged.succeeded} succeeded, ${merged.failed} failed, ${merged.skipped} skipped.`
        );
      }
      setSelected((prev) => {
        const next = { ...prev };
        for (const row of merged.results) {
          if (row.outcome === "success") delete next[row.productId];
        }
        return next;
      });
      router.refresh();
    });
  }

  function runConfirmedFieldEdit() {
    if (!fieldPlan || !fieldPlan.supported) {
      setError(fieldPlan?.deferredReason || "Preview this edit first.");
      return;
    }
    if (selectedCount === 0) {
      setError("Select at least one product.");
      return;
    }

    const body = new FormData();
    body.set("field", fieldPlan.field);
    body.set("operation", fieldPlan.operation);
    if (fieldPlan.field === "category" && fieldPlan.operation === "replace") {
      body.set("categoryId", editCategoryId);
    }
    if (
      fieldPlan.field === "short_description" &&
      fieldPlan.operation === "replace"
    ) {
      body.set("shortDescription", editShortDescription);
    }
    for (const item of selectedItems) body.append("productId", item.id);
    const label = fieldPlan.label;
    const field = fieldPlan.field;
    const operation = fieldPlan.operation;
    const titleById = new Map(
      selectedItems.map((item) => [item.id, item.title] as const)
    );
    setEditOpen(false);
    setEditPreview(false);
    startTransition(async () => {
      const result = await bulkEditProductFieldsAction(body);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSummary({
        field,
        operation,
        label,
        succeeded: result.succeeded,
        failed: result.failed,
        skipped: result.skipped,
        total: result.results.length,
        overall: result.overall,
        results: result.results.map((row) => ({
          productId: row.productId,
          title: titleById.get(row.productId),
          outcome: row.outcome,
          reason: row.reason,
        })),
      });
      if (result.overall === "success") {
        setMessage(`${label}: ${result.succeeded} succeeded.`);
      } else {
        setMessage(
          `${label}: ${result.succeeded} succeeded, ${result.failed} failed, ${result.skipped} skipped.`
        );
      }
      setSelected((prev) => {
        const next = { ...prev };
        for (const row of result.results) {
          if (row.outcome === "success") delete next[row.productId];
        }
        return next;
      });
      router.refresh();
    });
  }

  const prevDisabled =
    paginationLabels.previousDisabled || !previousHref || navPending;
  const nextDisabled =
    paginationLabels.nextDisabled || !nextHref || navPending;

  if (resultKind === "empty_catalog") {
    return (
      <StoreEmptyState
        title="No products yet"
        description="Create a draft to start your catalog. Products stay in draft until submitted for operator review — sellers cannot self-publish."
        actionHref="/seller/store/products/new"
        actionLabel="Create draft"
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 md:p-5">
        <form
          className="flex flex-col gap-3 md:flex-row md:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            navigateFilters({ search: query });
          }}
        >
          <label className="block min-w-0 flex-1 space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Search
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, SKU, barcode, or product ID"
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 px-4 py-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
            />
          </label>
          <label className="block space-y-2 md:w-52">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Sort
            </span>
            <select
              value={applied.sort}
              onChange={(event) =>
                navigateFilters({
                  sort: event.target.value as SellerCatalogSearchSortKey,
                })
              }
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 px-4 py-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
            >
              {SELLER_CATALOG_SEARCH_SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-2xl border border-[var(--sf-line)] px-4 py-3 text-sm font-semibold text-[var(--sf-ink)]"
          >
            Apply
          </button>
        </form>

        <div
          className="mt-4 flex flex-wrap gap-2"
          role="navigation"
          aria-label="Filter by status"
        >
          {SELLER_CATALOG_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => navigateFilters({ status: filter.id })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                applied.status === filter.id
                  ? "border-[var(--sf-accent)] bg-[var(--sf-accent)] text-[#1a1712]"
                  : "border-[var(--sf-line)] text-[var(--sf-muted)] hover:border-[rgba(214,196,161,0.35)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div
          className="mt-3 flex flex-wrap gap-2"
          role="navigation"
          aria-label="Filter by health"
        >
          {SELLER_CATALOG_HEALTH_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => navigateFilters({ health: filter.id })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                applied.health === filter.id
                  ? "border-[rgba(214,196,161,0.55)] bg-[rgba(214,196,161,0.14)] text-[var(--sf-ink)]"
                  : "border-[var(--sf-line)] text-[var(--sf-faint)] hover:border-[rgba(214,196,161,0.35)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div
          className="mt-3 flex flex-wrap gap-2"
          role="navigation"
          aria-label="Filter by product type"
        >
          {SELLER_CATALOG_TYPE_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => navigateFilters({ productType: filter.id })}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                applied.productType === filter.id
                  ? "border-[rgba(214,196,161,0.55)] bg-[rgba(214,196,161,0.14)] text-[var(--sf-ink)]"
                  : "border-[var(--sf-line)] text-[var(--sf-faint)] hover:border-[rgba(214,196,161,0.35)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {healthFilterScope === "page_only" ? (
          <p className="mt-3 text-xs text-[var(--sf-muted)]">
            Ready / Needs Attention / health filters apply to this page only.
            Catalog-wide health pagination is deferred to Phase 2.
          </p>
        ) : null}
      </div>

      {canManage ? (
        <div className="sticky top-2 z-20 rounded-2xl border border-[var(--sf-line)] bg-[var(--sf-surface-2)]/95 p-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <label className="flex items-center gap-2 text-sm text-[var(--sf-muted)]">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelected((prev) =>
                      selectAllVisibleBulkItems(
                        prev,
                        visibleSelectionItems,
                        storeId
                      )
                    );
                  } else {
                    setSelected((prev) => {
                      const next = { ...prev };
                      for (const item of visibleSelectionItems) {
                        delete next[item.id];
                      }
                      return next;
                    });
                  }
                }}
                aria-label="Select all products on this page"
              />
              Select page ({selectedCount} selected)
            </label>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => setSelected(clearBulkSelection())}
              className="rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold text-[var(--sf-ink)] disabled:opacity-40"
            >
              Clear selection
            </button>
            <button
              type="button"
              disabled={pending || selectedCount === 0}
              onClick={openBulkEdit}
              className="rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold text-[var(--sf-ink)] disabled:opacity-40"
            >
              Bulk Edit
            </button>
            {toolbar.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={pending || !action.enabled}
                title={action.reason}
                onClick={() => openConfirm(action.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                  action.id === "archive"
                    ? "border-[rgba(240,168,168,0.35)] text-[var(--sf-danger)]"
                    : "border-[var(--sf-line)] text-[var(--sf-ink)]"
                }`}
              >
                {action.label}
              </button>
            ))}
            {pending ? (
              <span className="text-xs text-[var(--sf-faint)]" aria-live="polite">
                Working…
              </span>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-xs text-[var(--sf-danger)]">
              {error}
            </p>
          ) : null}
          {message ? (
            <p role="status" className="mt-2 text-xs text-[var(--sf-ok)]">
              {message}
            </p>
          ) : null}
          {summary ? (
            <div
              role="status"
              className="mt-3 rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2 text-xs text-[var(--sf-muted)]"
            >
              <p className="font-semibold text-[var(--sf-ink)]">
                {summary.label} result · {summary.overall}
              </p>
              <p className="mt-1">
                Success {summary.succeeded} · Failed {summary.failed} · Skipped{" "}
                {summary.skipped}
              </p>
              {summary.results.filter((r) => r.outcome !== "success").length >
              0 ? (
                <ul className="mt-2 max-h-28 space-y-1 overflow-auto">
                  {summary.results
                    .filter((r) => r.outcome !== "success")
                    .slice(0, 8)
                    .map((row) => (
                      <li key={`${row.productId}-${row.outcome}`}>
                        {row.title || row.productId}: {row.outcome}
                        {row.reason ? ` — ${row.reason}` : ""}
                      </li>
                    ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {editOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-edit-title"
          className="rounded-2xl border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 md:p-5"
        >
          <h2
            id="bulk-edit-title"
            className="sf-display text-lg font-semibold tracking-tight"
          >
            Bulk Edit fields
          </h2>
          <p className="mt-2 text-sm text-[var(--sf-muted)]">
            {selectedCount} selected. Preview before confirming. Unsupported
            fields stay disabled.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                Field
              </span>
              <select
                value={editField}
                onChange={(event) => {
                  const next = event.target.value as SellerCatalogBulkFieldId;
                  setEditField(next);
                  const ops = allowedOperationsForBulkField(next);
                  setEditOperation(ops[0] ?? "replace");
                  setEditPreview(false);
                }}
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 px-4 py-3 text-sm outline-none"
              >
                {fieldToolbar.map((row) => (
                  <option
                    key={row.id}
                    value={row.id}
                    disabled={!isSellerCatalogBulkFieldSupported(row.id)}
                  >
                    {row.label}
                    {!isSellerCatalogBulkFieldSupported(row.id)
                      ? " (unavailable)"
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                Operation
              </span>
              <select
                value={editOperation}
                onChange={(event) => {
                  setEditOperation(
                    event.target.value as SellerCatalogBulkFieldOperation
                  );
                  setEditPreview(false);
                }}
                disabled={!isSellerCatalogBulkFieldSupported(editField)}
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 px-4 py-3 text-sm outline-none disabled:opacity-40"
              >
                {fieldOps.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </label>

            {editField === "category" && editOperation === "replace" ? (
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                  Category
                </span>
                <select
                  value={editCategoryId}
                  onChange={(event) => {
                    setEditCategoryId(event.target.value);
                    setEditPreview(false);
                  }}
                  className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 px-4 py-3 text-sm outline-none"
                >
                  {categories.length === 0 ? (
                    <option value="">No active categories</option>
                  ) : (
                    categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
            ) : null}

            {editField === "short_description" &&
            editOperation === "replace" ? (
              <label className="block space-y-2 md:col-span-1">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                  Short description
                </span>
                <input
                  value={editShortDescription}
                  onChange={(event) => {
                    setEditShortDescription(event.target.value);
                    setEditPreview(false);
                  }}
                  maxLength={280}
                  placeholder="Up to 280 characters"
                  className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 px-4 py-3 text-sm outline-none"
                />
              </label>
            ) : null}
          </div>

          {!isSellerCatalogBulkFieldSupported(editField) ? (
            <p className="mt-3 text-xs text-[var(--sf-faint)]">
              {fieldToolbar.find((row) => row.id === editField)?.reason}
            </p>
          ) : null}

          {fieldPlan ? (
            <div className="mt-4 rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-3 text-sm text-[var(--sf-muted)]">
              <p className="font-semibold text-[var(--sf-ink)]">
                Preview · {fieldPlan.label}
              </p>
              <p className="mt-1">
                Selected {fieldPlan.selectedCount} · Eligible{" "}
                {fieldPlan.eligible.length} · Skipped {fieldPlan.skipped.length}
              </p>
              <p className="mt-1">Value: {fieldPlan.valuePreview}</p>
              <p className="mt-1">{fieldPlan.expectedImpact}</p>
              {fieldPlan.warnings.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--sf-faint)]">
                  {fieldPlan.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              {fieldPlan.skipped.length > 0 ? (
                <ul className="mt-2 max-h-28 space-y-1 overflow-auto text-xs text-[var(--sf-faint)]">
                  {fieldPlan.skipped.slice(0, 10).map((row) => (
                    <li key={row.id}>
                      {row.title}: {row.reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !isSellerCatalogBulkFieldSupported(editField)}
              onClick={() => setEditPreview(true)}
              className="rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold text-[var(--sf-ink)] disabled:opacity-40"
            >
              Preview
            </button>
            <button
              type="button"
              disabled={
                pending ||
                !fieldPlan?.supported ||
                fieldPlan.eligible.length === 0
              }
              onClick={runConfirmedFieldEdit}
              className="rounded-full bg-[var(--sf-accent)] px-4 py-2 text-sm font-bold text-[#1a1712] disabled:opacity-40"
            >
              Confirm edit
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setEditOpen(false);
                setEditPreview(false);
              }}
              className="rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold text-[var(--sf-ink)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {confirmPlan && confirmOp ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-confirm-title"
          className="rounded-2xl border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 md:p-5"
        >
          <h2
            id="bulk-confirm-title"
            className="sf-display text-lg font-semibold tracking-tight"
          >
            Confirm {confirmPlan.label}
          </h2>
          <p className="mt-2 text-sm text-[var(--sf-muted)]">
            {confirmPlan.eligible.length} product
            {confirmPlan.eligible.length === 1 ? "" : "s"} will run.{" "}
            {confirmPlan.skipped.length} will be skipped.
          </p>
          {confirmPlan.warnings.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--sf-faint)]">
              {confirmPlan.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {confirmPlan.skipped.length > 0 ? (
            <ul className="mt-3 max-h-32 space-y-1 overflow-auto text-xs text-[var(--sf-faint)]">
              {confirmPlan.skipped.slice(0, 10).map((row) => (
                <li key={row.id}>
                  {row.title}: {row.reason}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || confirmPlan.eligible.length === 0}
              onClick={runConfirmedBulk}
              className="rounded-full bg-[var(--sf-accent)] px-4 py-2 text-sm font-bold text-[#1a1712] disabled:opacity-40"
            >
              Confirm {confirmPlan.label}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmOp(null)}
              className="rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold text-[var(--sf-ink)]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div
        className="flex flex-col gap-3 rounded-2xl border border-[var(--sf-line)] bg-[var(--sf-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        role="navigation"
        aria-label="Catalog pagination"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--sf-ink)]">
            {paginationLabels.pageLabel}
          </p>
          <p
            className="mt-0.5 text-xs text-[var(--sf-faint)]"
            aria-live="polite"
          >
            {navPending ? "Loading page…" : paginationLabels.statusLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={prevDisabled}
            aria-label={`${paginationLabels.previousLabel} page`}
            onClick={() => previousHref && navigatePage(previousHref)}
            className="rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold text-[var(--sf-ink)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {paginationLabels.previousLabel}
          </button>
          <button
            type="button"
            disabled={nextDisabled}
            aria-label={`${paginationLabels.nextLabel} page`}
            onClick={() => nextHref && navigatePage(nextHref)}
            className="rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold text-[var(--sf-ink)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {paginationLabels.nextLabel}
          </button>
        </div>
      </div>

      {resultKind === "no_results" || products.length === 0 ? (
        <p
          role="status"
          className="rounded-2xl border border-dashed border-[var(--sf-line)] px-4 py-10 text-center text-sm text-[var(--sf-faint)]"
        >
          {pageNumber > 1
            ? "No products on this page. Try Previous, or reset filters."
            : "No products match this search or filter."}
        </p>
      ) : (
        <ul className="space-y-3">
          {products.map((product) => {
            const meta = buildSellerCatalogCategoryShortDescriptionDisplay({
              primaryCategoryId: product.primaryCategoryId,
              shortDescription: product.shortDescription,
              categories,
            });
            return (
            <li key={product.id}>
              <div className="group flex gap-3 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 transition hover:border-[rgba(214,196,161,0.35)] md:p-5">
                {canManage ? (
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(selected[product.id])}
                    onChange={(event) =>
                      setSelected((prev) =>
                        toggleBulkSelection(
                          prev,
                          toSelectionItem(product),
                          event.target.checked,
                          storeId
                        )
                      )
                    }
                    aria-label={`Select ${product.title}`}
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="sf-eyebrow">{product.productType}</p>
                      <h2 className="sf-display mt-1 text-lg font-semibold tracking-tight">
                        {product.title}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--sf-faint)]">
                        /{product.slug}
                        {product.skus[0] ? ` · ${product.skus[0]}` : ""}
                      </p>
                      {meta.shortDescriptionPreview ? (
                        <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
                          {meta.shortDescriptionPreview}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={`/seller/store/products/${product.id}/edit`}
                      className="shrink-0 rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold text-[var(--sf-accent-strong)] transition group-hover:border-[rgba(214,196,161,0.45)]"
                    >
                      Open workspace →
                    </Link>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--sf-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sf-muted)]">
                      {sellerProductStatusLabel(product.status)}
                    </span>
                    <span className="rounded-full border border-[var(--sf-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sf-faint)]">
                      {sellerModerationLabel(product.moderationStatus)}
                    </span>
                    <span className="rounded-full border border-[var(--sf-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sf-muted)]">
                      {sellerCatalogAvailabilityLabel(
                        product.availabilityStatus ?? "unknown"
                      )}
                    </span>
                    {meta.categoryLabel ? (
                      <span className="rounded-full border border-[var(--sf-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sf-muted)]">
                        {meta.categoryLabel}
                      </span>
                    ) : (
                      <span className="rounded-full border border-dashed border-[var(--sf-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sf-faint)]">
                        No category
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      {!hasMore && products.length > 0 ? (
        <p className="text-center text-xs text-[var(--sf-faint)]" role="status">
          End of results
        </p>
      ) : null}
    </div>
  );
}
