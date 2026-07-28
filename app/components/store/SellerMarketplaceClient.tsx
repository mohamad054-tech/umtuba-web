"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  addToMyStoreAction,
  updateSellerListingAction,
} from "../../actions/storeMarketplace";
import { formatMinorUnits } from "../../../lib/store/money";
import {
  listingDisplayTitle,
  sellerListingPricingControl,
  type MarketplaceDiscoveryItem,
  type SellerListingRow,
} from "../../../lib/store/marketplaceSupplierSeller";
import { APP_ROUTES, buildSellerProductHref } from "../../lib/nav";
import StoreEmptyState from "./StoreEmptyState";
import StoreErrorState from "./StoreErrorState";

type Props = {
  discovery: MarketplaceDiscoveryItem[];
  listings: SellerListingRow[];
  canManage: boolean;
  loadError?: string | null;
};

function moneyLabel(minor: number | null, currency: string | null): string {
  if (minor == null || !currency) return "Price unavailable";
  try {
    return formatMinorUnits(minor, currency);
  } catch {
    return "Price unavailable";
  }
}

export default function SellerMarketplaceClient({
  discovery,
  listings,
  canManage,
  loadError,
}: Props) {
  const [query, setQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pricing = sellerListingPricingControl();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return discovery.filter((item) => {
      if (q) {
        const hay = `${item.title} ${item.supplier.name} ${item.categoryName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (onlyAvailable) {
        if (!item.availabilityKnown || (item.available ?? 0) <= 0) return false;
      }
      return true;
    });
  }, [discovery, query, onlyAvailable]);

  function addToStore(productId: string) {
    if (!canManage) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("source_product_id", productId);
      const result = await addToMyStoreAction(fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(
        result.data.reused
          ? "Listing already in your store ג€” activated."
          : "Added to My Store."
      );
    });
  }

  function setListingStatus(listingId: string, status: string) {
    if (!canManage) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("listing_id", listingId);
      fd.set("status", status);
      const result = await updateSellerListingAction(fd);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage("Listing updated.");
    });
  }

  if (loadError) {
    return <StoreErrorState message={loadError} />;
  }

  return (
    <div className="space-y-8">
      <header className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">Supplier marketplace</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Discover supplier products
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--sf-muted)]">
          Add eligible supplier products to your storefront as listings. You
          market the product; supplier catalog truth and inventory stay with the
          supplier. {pricing.message}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="marketplace-search">
            Search marketplace
          </label>
          <input
            id="marketplace-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or suppliers"
            className="watch-focus-ring w-full flex-1 rounded-full border border-[var(--sf-line)] bg-black/35 px-4 py-2.5 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-[var(--sf-muted)]">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            In stock only
          </label>
        </div>
        {(message || error) && (
          <p
            className={`mt-4 text-sm ${error ? "text-red-200" : "text-[var(--sf-accent-strong)]"}`}
            role="status"
          >
            {error ?? message}
          </p>
        )}
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="sf-display text-xl font-semibold tracking-tight">
            Eligible products
          </h2>
          <p className="text-xs text-[var(--sf-faint)]">
            {filtered.length} shown
          </p>
        </div>
        {filtered.length === 0 ? (
          <StoreEmptyState
            title="No eligible supplier products"
            description="When verified suppliers mark products marketplace-eligible, they appear here."
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {filtered.map((item) => (
              <li
                key={item.productId}
                className="overflow-hidden rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)]"
              >
                <div className="relative aspect-[4/3] bg-black/40">
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 40vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-[var(--sf-faint)]">
                      No media
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                      {item.supplier.name}
                    </p>
                    <h3 className="mt-1 text-base font-semibold leading-snug">
                      {item.title}
                    </h3>
                    {item.categoryName ? (
                      <p className="mt-1 text-xs text-[var(--sf-muted)]">
                        {item.categoryName}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-[var(--sf-accent-strong)]">
                      {moneyLabel(item.priceMinor, item.currency)}
                    </span>
                    <span className="text-xs text-[var(--sf-faint)]">
                      {item.availabilityKnown
                        ? (item.available ?? 0) > 0
                          ? `${item.available} available`
                          : "Unavailable"
                        : "Availability unknown"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`${APP_ROUTES.sellerMarketplace}/${item.productId}`}
                      className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold"
                    >
                      Details
                    </Link>
                    {canManage ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => addToStore(item.productId)}
                        className="watch-focus-ring rounded-full border border-[rgba(214,196,161,0.45)] bg-[rgba(214,196,161,0.12)] px-3 py-1.5 text-xs font-semibold text-[var(--sf-accent-strong)] disabled:opacity-50"
                      >
                        {item.existingListingId
                          ? "Activate in My Store"
                          : "Add to My Store"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          My supplier-sourced listings
        </h2>
        <p className="mt-2 text-sm text-[var(--sf-muted)]">
          These are listings, not owned products. Supplier identity and stock
          remain with the source store.
        </p>
        {listings.length === 0 ? (
          <div className="mt-4">
            <StoreEmptyState
              title="No supplier listings yet"
              description="Add an eligible product above to create your first listing."
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {listings.map((listing) => (
              <li
                key={listing.id}
                className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                      Sourced ֲ· {listing.supplierName ?? "Supplier"}
                    </p>
                    <h3 className="mt-1 font-semibold">
                      {listingDisplayTitle(
                        listing.sourceTitle ?? "Product",
                        listing.displayTitleOverride
                      )}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--sf-muted)]">
                      Status {listing.status} ·{" "}
                      {moneyLabel(listing.priceMinor ?? null, listing.currency ?? null)}{" "}
                      · fulfillment unresolved unless trusted fields are set
                    </p>
                    <p className="mt-2 text-xs text-[var(--sf-faint)]">
                      Supplier participation:{" "}
                      {listing.supplierMarketplaceEnabled ? "enabled" : "disabled"}{" "}
                      · Product eligibility:{" "}
                      {listing.productMarketplaceEligible
                        ? "eligible"
                        : "ineligible"}{" "}
                      · Inventory:{" "}
                      {listing.availabilityKnown
                        ? `${listing.available ?? 0} available`
                        : "unknown"}
                    </p>
                    {listing.blockingReason ? (
                      <p
                        role="status"
                        className="mt-2 text-xs text-[var(--sf-danger)]"
                      >
                        Buyer PDP blocked: {listing.blockingReason}
                      </p>
                    ) : listing.buyerPdpAvailable ? (
                      <p
                        role="status"
                        className="mt-2 text-xs text-[var(--sf-ok)]"
                      >
                        Buyer PDP available
                      </p>
                    ) : null}
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      {listing.status !== "active" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setListingStatus(listing.id, "active")}
                          className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold"
                        >
                          Activate
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setListingStatus(listing.id, "hidden")}
                          className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold"
                        >
                          Hide
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => setListingStatus(listing.id, "archived")}
                        className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold"
                      >
                        Archive
                      </button>
                      {listing.buyerPdpPath ? (
                        <Link
                          href={listing.buyerPdpPath}
                          className="watch-focus-ring rounded-full border border-[rgba(214,196,161,0.35)] px-3 py-1.5 text-xs font-semibold text-[var(--sf-accent-strong)]"
                        >
                          Live PDP
                        </Link>
                      ) : null}
                      {listing.sourceProductId ? (
                        <Link
                          href={buildSellerProductHref(listing.sourceProductId)}
                          className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold"
                        >
                          Source product
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

