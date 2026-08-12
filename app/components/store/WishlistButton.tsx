"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleWishlistAction } from "../../actions/storeWishlist";
import { APP_ROUTES } from "../../lib/nav";

type WishlistButtonProps = {
  productId: string;
  /** Marketplace listing provenance when saving from a listing PDP/card. */
  sellerListingId?: string | null;
  initialWishlisted: boolean;
  /** Where to send the user back after signing in. */
  nextHref?: string;
  onToggled?: (wishlisted: boolean) => void;
  className?: string;
};

const DEFAULT_CLASS =
  "watch-focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/50 text-lg text-white backdrop-blur transition hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Shared save/unsave affordance for the PDP and the Favorites list.
 * Safe to nest inside a `Link` card — stops propagation so it never
 * triggers the card's navigation.
 */
export default function WishlistButton({
  productId,
  sellerListingId = null,
  initialWishlisted,
  nextHref,
  onToggled,
  className,
}: WishlistButtonProps) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div>
      <button
        type="button"
        aria-pressed={wishlisted}
        aria-busy={pending || undefined}
        aria-label={wishlisted ? "Remove from favorites" : "Save to favorites"}
        disabled={pending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setError(null);
          setStatus(null);
          startTransition(async () => {
            const result = await toggleWishlistAction({
              productId,
              sellerListingId,
            });
            if (!result.ok) {
              if (result.requiresAuth) {
                router.push(
                  `${APP_ROUTES.login}?next=${encodeURIComponent(
                    nextHref ?? APP_ROUTES.storeWishlist
                  )}`
                );
                return;
              }
              setError(result.message);
              return;
            }
            setWishlisted(result.wishlisted);
            setStatus(
              result.wishlisted
                ? "Saved to favorites"
                : "Removed from favorites"
            );
            onToggled?.(result.wishlisted);
          });
        }}
        className={className ?? DEFAULT_CLASS}
      >
        <span aria-hidden>{wishlisted ? "♥" : "♡"}</span>
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
      {status && !error ? (
        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>
      ) : null}
    </div>
  );
}
