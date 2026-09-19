"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useI18n, useTranslation } from "../i18n";
import type { AnalyticsConsent } from "../../../lib/analytics/consent";
import { ANALYTICS_CONSENT_BANNER_OFFSET_VAR } from "../../lib/nav/mobileNav";

export default function AnalyticsConsentBanner({
  onChoice,
}: {
  onChoice: (value: AnalyticsConsent) => void;
}) {
  const { direction } = useI18n();
  const { t } = useTranslation();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const el = node;

    function publishHeight() {
      const height = el.getBoundingClientRect().height;
      document.body.setAttribute("data-analytics-consent-visible", "1");
      document.body.style.setProperty(
        ANALYTICS_CONSENT_BANNER_OFFSET_VAR,
        `${Math.ceil(height)}px`
      );
    }

    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.body.removeAttribute("data-analytics-consent-visible");
      document.body.style.removeProperty(ANALYTICS_CONSENT_BANNER_OFFSET_VAR);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={t("analytics.consent.aria")}
      data-analytics-consent-banner="true"
      dir={direction}
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-white/15 bg-[#0c1842]/95 px-3 py-1.5 text-white shadow-2xl backdrop-blur-md pb-[max(0.4rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="mx-auto flex max-w-4xl items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-xs leading-5 text-white/85 sm:text-sm">
          {t("analytics.consent.body")}{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-white"
          >
            {t("analytics.consent.privacy")}
          </Link>
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            data-analytics-consent="decline"
            className="min-h-9 rounded-full border border-white/20 px-3 text-xs font-semibold text-white/80"
            onClick={() => onChoice("denied")}
          >
            {t("analytics.consent.decline")}
          </button>
          <button
            type="button"
            data-analytics-consent="accept"
            className="min-h-9 rounded-full bg-[#f0a93b] px-3 text-xs font-bold text-[#0c1842]"
            onClick={() => onChoice("accepted")}
          >
            {t("analytics.consent.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
