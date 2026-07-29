"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { APP_ROUTES, buildSellerOrderHref } from "../../lib/nav";
import {
  SELLER_INVENTORY_FILTERS,
  deriveInventoryAvailabilityState,
  deriveReservationAttention,
  deriveSellerInventoryAttention,
  filterSellerInventoryRows,
  quantityDisplay,
  sellerInventoryAvailabilityLabel,
  sellerOrderRefLabel,
  sellerReservationStatusLabel,
  type SellerInventoryFilterBucket,
  type SellerInventorySortKey,
} from "../../../lib/store/sellerInventoryPresentation";
import type {
  SellerInventoryRow,
  SellerReservationRow,
} from "../../../lib/store/sellerInventoryQueries";
import StoreEmptyState from "./StoreEmptyState";

type Props = {
  rows: SellerInventoryRow[];
  reservations: SellerReservationRow[];
  canViewReservations: boolean;
  selectedVariantId?: string | null;
};

export default function SellerInventoryWorkspace({
  rows,
  reservations,
  canViewReservations,
  selectedVariantId = null,
}: Props) {
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<SellerInventoryFilterBucket>("all");
  const [sort, setSort] = useState<SellerInventorySortKey>("attention");
  const [expandedId, setExpandedId] = useState<string | null>(
    selectedVariantId
  );

  const filtered = useMemo(
    () => filterSellerInventoryRows(rows, { query, bucket, sort }),
    [rows, query, bucket, sort]
  );

  const reservationsByVariant = useMemo(() => {
    const map = new Map<string, SellerReservationRow[]>();
    for (const row of reservations) {
      const list = map.get(row.variantId) ?? [];
      list.push(row);
      map.set(row.variantId, list);
    }
    return map;
  }, [reservations]);

  if (rows.length === 0) {
    return (
      <StoreEmptyState
        title="No inventory rows yet"
        description="Create product drafts with variants to seed inventory. This workspace is visibility-first — reserved holds come from checkout, not seller edits."
        actionHref="/seller/store/products/new"
        actionLabel="Create product draft"
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
              placeholder="Product, SKU, variant, location"
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
                setSort(event.target.value as SellerInventorySortKey)
              }
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 px-4 py-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
            >
              <option value="attention">Attention first</option>
              <option value="available_asc">Available · low to high</option>
              <option value="available_desc">Available · high to low</option>
              <option value="reserved_desc">Reserved · high to low</option>
              <option value="title_asc">Title · A–Z</option>
              <option value="updated_desc">Updated · newest</option>
            </select>
          </label>
        </div>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="navigation"
          aria-label="Filter inventory"
        >
          {SELLER_INVENTORY_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setBucket(filter.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                bucket === filter.id
                  ? "border-[var(--sf-accent)] bg-[var(--sf-accent)] text-[#1a1712]"
                  : "border-[var(--sf-line)] text-[var(--sf-muted)] hover:border-[rgba(214,196,161,0.35)]"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[var(--sf-faint)]">
          Available to sell = on hand − reserved − safety stock (trusted
          formula). Allocated / damaged / quarantined stock states are not in
          this catalog contract. Quantity is not edited here.
        </p>
      </div>

      {!canViewReservations ? (
        <p
          role="status"
          className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-4 py-3 text-sm text-[var(--sf-muted)]"
        >
          Reservation holds are visible to store owners and managers. Your role
          can still see on-hand / reserved counters on inventory rows.
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[var(--sf-line)] px-4 py-10 text-center text-sm text-[var(--sf-faint)]">
          No inventory rows match this search or filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((row) => {
            const key = `${row.variantId}:${row.warehouseKey ?? "none"}`;
            const state = deriveInventoryAvailabilityState(row);
            const attention = deriveSellerInventoryAttention(row);
            const open = expandedId === row.variantId;
            const holds = reservationsByVariant.get(row.variantId) ?? [];

            return (
              <li
                key={key}
                className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 md:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="sf-eyebrow">{row.sku}</p>
                    <h2 className="sf-display mt-1 text-lg font-semibold tracking-tight">
                      {row.productTitle}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--sf-faint)]">
                      {row.variantTitle} ·{" "}
                      {row.warehouseKey
                        ? `Location ${row.warehouseKey}`
                        : "No location row"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--sf-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--sf-muted)]">
                      {sellerInventoryAvailabilityLabel(state)}
                    </span>
                    {attention.level !== "none" ? (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          attention.level === "critical"
                            ? "border-[rgba(240,168,168,0.4)] text-[var(--sf-danger)]"
                            : attention.level === "warn"
                              ? "border-amber-400/40 text-amber-100"
                              : "border-[var(--sf-line)] text-[var(--sf-faint)]"
                        }`}
                      >
                        Attention
                      </span>
                    ) : null}
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                      On hand
                    </dt>
                    <dd className="mt-1 text-lg font-semibold">
                      {quantityDisplay(row.onHand)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                      Reserved
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-[var(--sf-accent-strong)]">
                      {quantityDisplay(row.reserved)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                      Safety
                    </dt>
                    <dd className="mt-1 text-lg font-semibold">
                      {quantityDisplay(row.safetyStock)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                      Available to sell
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-[var(--sf-ok)]">
                      {quantityDisplay(row.availableToSell)}
                    </dd>
                  </div>
                </dl>

                {attention.message ? (
                  <p className="mt-3 text-xs text-[var(--sf-accent)]">
                    {attention.message}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(open ? null : row.variantId)
                    }
                    className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
                  >
                    {open ? "Hide detail" : "Show detail"}
                  </button>
                  <Link
                    href={`/seller/store/products/${row.productId}/edit`}
                    className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
                  >
                    Open product
                  </Link>
                </div>

                {open ? (
                  <div className="mt-4 space-y-3 rounded-2xl border border-[var(--sf-line)] bg-black/20 p-4">
                    <p className="text-xs leading-relaxed text-[var(--sf-muted)]">
                      Allocated stock is not tracked in product inventory.
                      Warehouse execution and Shipping Network are out of scope.
                      Last trusted inventory update:{" "}
                      {row.inventoryUpdatedAt
                        ? new Date(row.inventoryUpdatedAt).toLocaleString()
                        : "unknown"}
                      .
                    </p>
                    {canViewReservations ? (
                      holds.length === 0 ? (
                        <p className="text-sm text-[var(--sf-faint)]">
                          No reservation holds for this variant in the recent
                          store window.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {holds.map((hold) => {
                            const holdAttention = deriveReservationAttention(hold);
                            const orderLabel = sellerOrderRefLabel(hold.orderId);
                            return (
                              <li
                                key={hold.id}
                                className="rounded-xl border border-[var(--sf-line)] px-3 py-2 text-sm"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="font-semibold">
                                    {hold.quantity} ·{" "}
                                    {sellerReservationStatusLabel(hold.status)}
                                  </span>
                                  {orderLabel && hold.orderId ? (
                                    <Link
                                      href={buildSellerOrderHref(hold.orderId)}
                                      className="text-xs font-semibold text-[var(--sf-accent)]"
                                    >
                                      {orderLabel}
                                    </Link>
                                  ) : (
                                    <span className="text-xs text-[var(--sf-faint)]">
                                      Checkout hold
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-[var(--sf-faint)]">
                                  Expires{" "}
                                  {new Date(hold.expiresAt).toLocaleString()}
                                  {hold.releaseReason
                                    ? ` · ${hold.releaseReason}`
                                    : ""}
                                </p>
                                {holdAttention.message ? (
                                  <p className="mt-1 text-xs text-[var(--sf-accent)]">
                                    {holdAttention.message}
                                  </p>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      )
                    ) : (
                      <p className="text-sm text-[var(--sf-faint)]">
                        Reservation detail requires owner or manager role.
                      </p>
                    )}
                    <Link
                      href={APP_ROUTES.sellerOrders}
                      className="inline-block text-xs font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
                    >
                      Open seller orders →
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
