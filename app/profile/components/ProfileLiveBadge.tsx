"use client";

import { useTranslation } from "../../components/i18n";

type ProfileLiveBadgeProps = {
  className?: string;
};

/**
 * Live presence badge — polite announcement + pulse that respects reduced motion (§15 / §21).
 */
export default function ProfileLiveBadge({
  className = "",
}: ProfileLiveBadgeProps) {
  const { t } = useTranslation();
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={t("profile.liveNowAria")}
      className={`inline-flex items-center gap-1.5 rounded-full border border-red-400/35 bg-red-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-red-200 ${className}`}
    >
      <span
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 motion-reduce:animate-none"
        aria-hidden
      />
      {t("profile.live")}
    </span>
  );
}
