"use client";

import { useState, useTransition } from "react";
import { mintBuyerDigitalAccessAction } from "../../actions/storeOrders";

type DeliveryAvailability =
  | "available"
  | "unavailable"
  | "inactive"
  | "unsupported";

type BuyerDigitalAccessButtonProps = {
  entitlementId: string;
  title: string;
  deliveryAvailability: DeliveryAvailability;
};

export default function BuyerDigitalAccessButton({
  entitlementId,
  title,
  deliveryAvailability,
}: BuyerDigitalAccessButtonProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (deliveryAvailability === "inactive") {
    return (
      <p className="text-sm text-[var(--sf-muted)]">
        Entitlement inactive for {title}.
      </p>
    );
  }

  if (
    deliveryAvailability === "unavailable" ||
    deliveryAvailability === "unsupported"
  ) {
    return (
      <p className="text-sm text-[var(--sf-muted)]">
        Secure access unavailable for {title}.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={pending}
        className="rounded-xl border border-[var(--sf-line)] bg-[var(--sf-ink)] px-3 py-1.5 text-sm font-medium text-[var(--sf-surface)] disabled:opacity-60"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await mintBuyerDigitalAccessAction(entitlementId);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            window.open(result.signedUrl, "_blank", "noopener,noreferrer");
          });
        }}
      >
        {pending ? "Preparing secure access…" : `Open secure access · ${title}`}
      </button>
      {error ? (
        <p role="alert" className="text-xs text-[var(--sf-danger)]">
          {error}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </p>
      ) : null}
    </div>
  );
}
