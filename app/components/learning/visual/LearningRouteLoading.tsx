"use client";

import AppTopNav from "../../AppTopNav";
import { useTranslation } from "../../i18n";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../../lib/nav";

/**
 * Instant Learning chrome + content-preserving skeleton.
 * Must stay a client component so the route loading.tsx never awaits cookies.
 */
export default function LearningRouteLoading() {
  const { t } = useTranslation();

  return (
    <main
      className={`learning-visual-root relative min-h-screen overflow-x-hidden text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 bg-[#070714]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,_rgba(88,70,180,0.28),_transparent_58%),radial-gradient(circle_at_85%_10%,_rgba(37,99,235,0.18),_transparent_42%)]" />
      <div className="relative">
        <AppTopNav title={t("nav.learning")} subtitle={t("status.loading")} />
        <p className="mx-auto w-full max-w-7xl px-4 pt-3 text-[11px] font-semibold tracking-wide text-violet-200/70 md:px-6">
          {t("status.loading")}
        </p>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
          <div className="mb-6 flex flex-wrap gap-2" aria-hidden>
            <div className="h-8 w-24 animate-pulse rounded-full border border-white/15 bg-white/5" />
            <div className="h-8 w-28 animate-pulse rounded-full border border-white/15 bg-white/5" />
            <div className="h-8 w-32 animate-pulse rounded-full border border-white/15 bg-white/5" />
          </div>
          <div className="overflow-hidden rounded-[32px] border border-white/10">
            <div className="min-h-[220px] animate-pulse bg-white/[0.04] md:min-h-[320px]" />
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-48 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.04]" />
            <div className="h-48 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.04]" />
            <div className="h-48 animate-pulse rounded-[24px] border border-white/10 bg-white/[0.04]" />
          </div>
        </div>
      </div>
    </main>
  );
}
