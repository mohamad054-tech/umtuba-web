import { createTranslator } from "../../../lib/i18n/translate";
import type { AppLocale } from "../../../lib/i18n/locales";

type StoreUmPointsEarnHintProps = {
  locale: AppLocale;
  points: number;
  variant?: "card" | "product" | "confirmed";
};

export default function StoreUmPointsEarnHint({
  locale,
  points,
  variant = "product",
}: StoreUmPointsEarnHintProps) {
  const t = createTranslator(locale);
  const key =
    variant === "confirmed"
      ? "store.umPoints.earnedConfirmed"
      : variant === "card"
        ? "store.umPoints.cardEarn"
        : "store.umPoints.earnWithPurchase";

  return (
    <p
      className={
        variant === "card"
          ? "mt-1 text-[11px] font-semibold text-[var(--sf-accent-strong)]"
          : "mt-3 rounded-2xl border border-[rgba(214,196,161,0.28)] bg-[rgba(214,196,161,0.08)] px-3 py-2 text-sm text-[var(--sf-accent-strong)]"
      }
    >
      {t(key, { values: { count: points } })}
    </p>
  );
}
