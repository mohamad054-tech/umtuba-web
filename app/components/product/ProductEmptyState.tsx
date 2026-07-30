"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { useTranslation } from "../i18n";

type ProductEmptyStateProps = {
  title?: string;
  description?: string;
  eyebrow?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string | null;
  secondaryLabel?: string | null;
  /** Inline card (no full-page shell) for use inside existing shells. */
  compact?: boolean;
  /** Prefer a button retry over a navigation link. */
  onPrimaryAction?: () => void;
  primaryBusy?: boolean;
  children?: ReactNode;
};

/**
 * Shared empty / unavailable surface for production-ready pages.
 * Avoids “Coming soon” prototype language that looks like unfinished chrome.
 */
export default function ProductEmptyState({
  title,
  description,
  eyebrow = "UMTUBA",
  primaryHref = APP_ROUTES.discover,
  primaryLabel,
  secondaryHref = APP_ROUTES.live,
  secondaryLabel,
  compact = false,
  onPrimaryAction,
  primaryBusy = false,
  children,
}: ProductEmptyStateProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("empty.title");
  const resolvedDescription = description ?? t("empty.description");
  const resolvedPrimaryLabel = primaryLabel ?? t("nav.discover");
  const resolvedSecondaryLabel = secondaryLabel ?? t("nav.live");

  const card = (
    <div
      className={`w-full max-w-md rounded-[28px] border border-dashed border-white/15 bg-[#080816]/85 px-6 py-8 text-center backdrop-blur-xl ${
        compact ? "" : "relative z-10"
      }`}
      role="status"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
        {eyebrow}
      </p>
      {compact ? (
        <h2 className="mt-3 text-xl font-black tracking-tight">{resolvedTitle}</h2>
      ) : (
        <h1 className="mt-3 text-2xl font-black tracking-tight">{resolvedTitle}</h1>
      )}
      <p className="mt-3 text-sm leading-7 text-white/55">{resolvedDescription}</p>

      <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {onPrimaryAction ? (
          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={primaryBusy}
            className="watch-focus-ring inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {primaryBusy ? t("status.working") : resolvedPrimaryLabel}
          </button>
        ) : (
          <Link
            href={primaryHref}
            className="watch-focus-ring inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
          >
            {resolvedPrimaryLabel}
          </Link>
        )}
        {secondaryHref && resolvedSecondaryLabel ? (
          <Link
            href={secondaryHref}
            className="watch-focus-ring inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10"
          >
            {resolvedSecondaryLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  );

  if (compact) {
    return card;
  }

  return (
    <main
      className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050510] px-4 text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[18%] h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-3xl" />
      </div>
      {card}
    </main>
  );
}
