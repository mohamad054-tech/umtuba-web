"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toggleWishlistAction } from "../../actions/storeWishlist";
import { APP_ROUTES } from "../../lib/nav";
import { useTranslation } from "../i18n";

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
  const { t } = useTranslation();
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
        aria-label={wishlisted ? t("store.wishlist.remove") : t("store.wishlist.save")}
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
        <HeartIcon filled={wishlisted} />
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 ${
        filled ? "text-[var(--sf-accent-strong,#e8d7b5)]" : "text-current"
      }`}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20s-7.15-4.28-9.28-8.08C1.18 9.22 2.12 6.28 4.9 5.28c1.72-.62 3.56.08 4.66 1.5L12 9.28l2.44-2.5c1.1-1.42 2.94-2.12 4.66-1.5 2.78 1 3.72 3.94 2.18 6.64C19.15 15.72 12 20 12 20Z"
      />
    </svg>
  );
}
