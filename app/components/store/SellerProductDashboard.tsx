"use client";

import Link from "next/link";
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
  filterSellerCatalogSearchItems,
  type SellerCatalogHealthFilter,
  type SellerCatalogProductTypeFilter,
  type SellerCatalogSearchItem,
  type SellerCatalogSearchSortKey,
  type SellerCatalogStatusFilter,
} from "../../../lib/store/sellerCatalogSearchFiltering";
import StoreEmptyState from "./StoreEmptyState";

type Props = {
  products: SellerCatalogSearchItem[];
  storeId: string;
  canManage: boolean;
  storeName: string;
};

export default function SellerProductDashboard({
  products,
  storeId,
  canManage,
}: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SellerCatalogStatusFilter>("all");
  const [health, setHealth] = useState<SellerCatalogHealthFilter>("any");
  const [productType, setProductType] =
    useState<SellerCatalogProductTypeFilter>("all");
  const [sort, setSort] = useState<SellerCatalogSearchSortKey>("updated_desc");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      filterSellerCatalogSearchItems(products, {
        storeId,
        query,
        status,
        health,
        productType,
        sort,
      }),
    [products, storeId, query, status, health, productType, sort]
  );

  const selectedIds = filtered
    .filter((item) => selected[item.id])
    .map((item) => item.id);
  const selectedStatuses = filtered
    .filter((item) => selected[item.id])
    .map((item) => item.status);
  const bulkActions = deriveSellerCatalogBulkActions({ selectedStatuses });

  function toggleAll(next: boolean) {
    const patch: Record<string, boolean> = {};
    for (const item of filtered) patch[item.id] = next;
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
    });
  }

  if (products.length === 0) {
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
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
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
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SellerCatalogSearchSortKey)
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
        </div>

        <div
          className="mt-4 flex flex-wrap gap-2"
          role="navigation"
          aria-label="Filter by status"
        >
          {SELLER_CATALOG_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setStatus(filter.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                status === filter.id
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
              onClick={() => setHealth(filter.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                health === filter.id
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
              onClick={() => setProductType(filter.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                productType === filter.id
                  ? "border-[rgba(214,196,161,0.55)] bg-[rgba(214,196,161,0.14)] text-[var(--sf-ink)]"
                  : "border-[var(--sf-line)] text-[var(--sf-faint)] hover:border-[rgba(214,196,161,0.35)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-[var(--sf-faint)]">
          Showing {filtered.length} of {products.length} products
        </p>
      </div>

      {canManage ? (
        <div className="sticky top-2 z-20 rounded-2xl border border-[var(--sf-line)] bg-[var(--sf-surface-2)]/95 p-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[var(--sf-muted)]">
              <input
                type="checkbox"
                checked={
                  filtered.length > 0 &&
                  filtered.every((item) => selected[item.id])
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

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--sf-line)] px-4 py-10 text-center text-sm text-[var(--sf-faint)]">
          No products match this search or filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((product) => (
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
    </div>
  );
}
