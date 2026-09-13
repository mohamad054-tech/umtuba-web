import { createTranslator } from "../../../lib/i18n/translate";
import type { AppLocale } from "../../../lib/i18n/locales";

type StoreUmPointsCartEstimateProps = {
  locale: AppLocale;
  points: number;
  compact?: boolean;
};

export default function StoreUmPointsCartEstimate({
  locale,
  points,
  compact = false,
}: StoreUmPointsCartEstimateProps) {
  const t = createTranslator(locale);

  return (
    <div
      role="status"
      className={
        compact
          ? "rounded-xl border border-[rgba(214,196,161,0.32)] bg-[rgba(214,196,161,0.08)] px-3 py-2"
          : "rounded-2xl border border-[rgba(214,196,161,0.4)] bg-[rgba(214,196,161,0.1)] px-4 py-3"
      }
    >
      <p className="text-sm font-semibold text-[var(--sf-accent-strong)]">
        {t("store.umPoints.cartEstimate", { values: { count: points } })}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[var(--sf-muted)]">
        {t("store.umPoints.estimateNote")}
      </p>
    </div>
  );
}
