"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  bulkArchiveProductsAction,
  bulkSubmitProductsAction,
} from "../../actions/storeCatalog";
import {
  deriveSellerCatalogBulkActions,
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
import {
  buildSellerCatalogProductsHref,
  type SellerCatalogAppliedFilters,
} from "../../../lib/store/sellerCatalogDataAccess";
import StoreEmptyState from "./StoreEmptyState";

type Props = {
  products: SellerCatalogSearchItem[];
  storeId: string;
  canManage: boolean;
  storeName: string;
  applied: SellerCatalogAppliedFilters;
  pageSize: number;
  hasMore: boolean;
  nextHref: string | null;
  healthFilterScope: "none" | "page_only";
};

export default function SellerProductDashboard({
  products,
  canManage,
  applied,
  pageSize,
  hasMore,
  nextHref,
  healthFilterScope,
}: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(applied.search);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedIds = products
    .filter((item) => selected[item.id])
    .map((item) => item.id);
  const selectedStatuses = products
    .filter((item) => selected[item.id])
    .map((item) => item.status);
  const bulkActions = deriveSellerCatalogBulkActions({ selectedStatuses });

  function navigate(patch: {
    search?: string;
    status?: SellerCatalogStatusFilter;
    productType?: SellerCatalogProductTypeFilter;
    sort?: SellerCatalogSearchSortKey;
    health?: SellerCatalogHealthFilter;
  }) {
    const href = buildSellerCatalogProductsHref({
      search: patch.search ?? applied.search,
      status: patch.status ?? applied.status,
      productType: patch.productType ?? applied.productType,
      sort: patch.sort ?? applied.sort,
      health: patch.health ?? applied.health,
      limit: pageSize,
      cursor: null,
    });
    router.push(href);
  }

  function toggleAll(next: boolean) {
    const patch: Record<string, boolean> = {};
    for (const item of products) patch[item.id] = next;
    setSelected((prev) => ({ ...prev, ...patch }));
  }

  function runBulk(action: "submit_review" | "archive") {
    if (!canManage || selectedIds.length === 0) return;
    const gate = bulkActions.find((a) => a.id === action);
    if (!gate?.enabled) {
      setError(gate?.reason || "Action unavailable.");
      return;
    }
    setError(null);
    setMessage(null);
    const body = new FormData();
    for (const id of selectedIds) body.append("productId", id);
    startTransition(async () => {
      const result =
        action === "archive"
          ? await bulkArchiveProductsAction(body)
          : await bulkSubmitProductsAction(body);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (action === "archive" && "archived" in result) {
        setMessage(
          `Archived ${result.archived} product${result.archived === 1 ? "" : "s"}${
            result.failed ? ` · ${result.failed} failed` : ""
          }.`
        );
      } else if ("submitted" in result) {
        setMessage(
          `Submitted ${result.submitted} product${result.submitted === 1 ? "" : "s"}${
            result.failed ? ` · ${result.failed} failed` : ""
          }.`
        );
      }
      setSelected({});
      router.refresh();
    });
  }

  const emptyCatalog = useMemo(
    () =>
      products.length === 0 &&
      !applied.search &&
      applied.status === "all" &&
      applied.productType === "all" &&
      applied.health === "any" &&
      !hasMore,
    [products.length, applied, hasMore]
  );

  if (emptyCatalog) {
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
            navigate({ search: query });
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
                navigate({
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
              onClick={() => navigate({ status: filter.id })}
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
              onClick={() => navigate({ health: filter.id })}
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
              onClick={() => navigate({ productType: filter.id })}
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

        <p className="mt-3 text-xs text-[var(--sf-faint)]">
          Showing {products.length} on this page
          {hasMore ? " · more available" : ""}
        </p>
        {healthFilterScope === "page_only" ? (
          <p className="mt-2 text-xs text-[var(--sf-muted)]">
            Ready / Needs Attention / health filters apply to this page only.
            Catalog-wide health pagination is deferred to Phase 2.
          </p>
        ) : null}
      </div>

      {canManage ? (
        <div className="sticky top-2 z-20 rounded-2xl border border-[var(--sf-line)] bg-[var(--sf-surface-2)]/95 p-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[var(--sf-muted)]">
              <input
                type="checkbox"
                checked={
                  products.length > 0 &&
                  products.every((item) => selected[item.id])
                }
                onChange={(event) => toggleAll(event.target.checked)}
              />
              Select visible ({selectedIds.length})
            </label>
            <button
              type="button"
              disabled={pending || !bulkActions[0]?.enabled}
              onClick={() => runBulk("submit_review")}
              className="rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold text-[var(--sf-ink)] disabled:opacity-40"
            >
              Submit for review
            </button>
            <button
              type="button"
              disabled={pending || !bulkActions[1]?.enabled}
              onClick={() => runBulk("archive")}
              className="rounded-full border border-[rgba(240,168,168,0.35)] px-3 py-1.5 text-xs font-semibold text-[var(--sf-danger)] disabled:opacity-40"
            >
              Archive
            </button>
            {pending ? (
              <span className="text-xs text-[var(--sf-faint)]">Working…</span>
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
        </div>
      ) : null}

      {products.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--sf-line)] px-4 py-10 text-center text-sm text-[var(--sf-faint)]">
          No products match this search or filter on this page.
        </p>
      ) : (
        <ul className="space-y-3">
          {products.map((product) => (
            <li key={product.id}>
              <div className="group flex gap-3 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 transition hover:border-[rgba(214,196,161,0.35)] md:p-5">
                {canManage ? (
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(selected[product.id])}
                    onChange={(event) =>
                      setSelected((prev) => ({
                        ...prev,
                        [product.id]: event.target.checked,
                      }))
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
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {nextHref ? (
        <div className="flex justify-center pt-2">
          <Link
            href={nextHref}
            className="rounded-full border border-[var(--sf-line)] px-5 py-2.5 text-sm font-semibold text-[var(--sf-ink)] hover:border-[rgba(214,196,161,0.45)]"
          >
            Load more
          </Link>
        </div>
      ) : null}
    </div>
  );
}
