"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toggleWishlistAction } from "../../actions/storeWishlist";
import { APP_ROUTES } from "../../lib/nav";

type WishlistButtonProps = {
  productId: string;
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
  initialWishlisted,
  nextHref,
  onToggled,
  className,
}: WishlistButtonProps) {
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setWishlisted(initialWishlisted);
  }, [initialWishlisted]);

  return (
    <div>
      <button
        type="button"
        aria-pressed={wishlisted}
        aria-label={wishlisted ? "Remove from favorites" : "Save to favorites"}
        disabled={pending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setError(null);
          startTransition(async () => {
            const result = await toggleWishlistAction({ productId });
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
            onToggled?.(result.wishlisted);
          });
        }}
        className={className ?? DEFAULT_CLASS}
      >
        <span
          aria-hidden
          className={wishlisted ? "text-[var(--sf-accent-strong,#e8d7b5)]" : undefined}
        >
          {wishlisted ? "♥" : "♡"}
        </span>
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
