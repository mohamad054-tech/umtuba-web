"use client";

import { useTranslation } from "../i18n";

type ProductLoadingStateProps = {
  label?: string;
  /** Full-page centered shell (Suspense fallbacks). */
  fullPage?: boolean;
};

/**
 * Branded loading status — polite live region, stable footprint to limit layout shift.
 */
export default function ProductLoadingState({
  label,
  fullPage = false,
}: ProductLoadingStateProps) {
  const { t } = useTranslation();
  const resolvedLabel = label ?? t("status.loading");

  const pill = (
    <p
      className="inline-flex min-h-11 min-w-[12rem] items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/70 backdrop-blur"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {resolvedLabel}
    </p>
  );

  if (!fullPage) {
    return pill;
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050510] text-white max-sm:pb-[var(--app-mobile-bottom-nav-offset,0px)]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[20%] h-96 w-96 rounded-full bg-sky-500/15 blur-3xl" />
      </div>
      <div className="relative z-10">{pill}</div>
    </main>
  );
}
