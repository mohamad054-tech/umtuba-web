"use client";

import Link from "next/link";
import type { BuyerDigitalAccessLibraryItem } from "../../../lib/store/buyerDigitalPostPurchase";
import { APP_ROUTES, buildStoreOrderHref } from "../../lib/nav";
import BuyerDigitalAccessButton from "./BuyerDigitalAccessButton";
import StoreEmptyState from "./StoreEmptyState";

type Props = {
  items: BuyerDigitalAccessLibraryItem[];
};

function formatGrantedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function BuyerDigitalAccessLibrary({ items }: Props) {
  if (items.length === 0) {
    return (
      <StoreEmptyState
        title="No digital access yet"
        description="After a paid digital purchase, secure access appears here. Physical orders do not create digital access entries."
        actionHref={APP_ROUTES.storeOrders}
        actionLabel="Back to my orders"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const title = item.titleSnapshot?.trim() || "Digital item";
        return (
          <li
            key={item.entitlementId}
            className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 md:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="sf-eyebrow">Digital access</p>
                <h2 className="sf-display mt-1 text-lg font-semibold tracking-tight">
                  {title}
                </h2>
                <p className="mt-1 text-sm text-[var(--sf-faint)]">
                  Granted {formatGrantedAt(item.grantedAt)}
                  {item.skuSnapshot ? ` · ${item.skuSnapshot}` : ""}
                </p>
              </div>
              <Link
                href={buildStoreOrderHref(item.orderId)}
                className="text-xs font-semibold text-[var(--sf-accent-strong)]"
              >
                Related order →
              </Link>
            </div>
            <div className="mt-4">
              <BuyerDigitalAccessButton
                entitlementId={item.entitlementId}
                title={title}
                deliveryAvailability={item.deliveryAvailability}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
