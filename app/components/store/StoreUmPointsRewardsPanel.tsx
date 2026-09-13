import { createTranslator } from "../../../lib/i18n/translate";
import type { AppLocale } from "../../../lib/i18n/locales";
import type { StoreUmPointsLedgerEvent } from "../../../lib/store/umPointsPurchaseLedger";

type StoreUmPointsRewardsPanelProps = {
  locale: AppLocale;
  balance: number;
  purchaseEarned: number;
  refundReversed: number;
  recent: StoreUmPointsLedgerEvent[];
  demo?: boolean;
};

export default function StoreUmPointsRewardsPanel({
  locale,
  balance,
  purchaseEarned,
  refundReversed,
  recent,
  demo = false,
}: StoreUmPointsRewardsPanelProps) {
  const t = createTranslator(locale);

  return (
    <section
      aria-label={t("store.umPoints.rewardsTitle")}
      className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sf-faint)]">
        {t("store.umPoints.rewardsTitle")}
      </p>
      {demo ? (
        <p role="note" className="mt-2 text-xs text-amber-100/80">
          {t("store.umPoints.demoLedgerNotice")}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[rgba(214,196,161,0.28)] bg-[rgba(214,196,161,0.08)] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--sf-faint)]">
            {t("store.umPoints.balance")}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--sf-accent-strong)]">
            {balance}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--sf-line)] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--sf-faint)]">
            {t("store.umPoints.purchaseEarned")}
          </p>
          <p className="mt-1 text-xl font-semibold">{purchaseEarned}</p>
        </div>
        <div className="rounded-2xl border border-[var(--sf-line)] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--sf-faint)]">
            {t("store.umPoints.refundReversed")}
          </p>
          <p className="mt-1 text-xl font-semibold">{refundReversed}</p>
        </div>
      </div>
      <h3 className="mt-5 text-sm font-semibold">{t("store.umPoints.recentActivity")}</h3>
      <ul className="mt-2 space-y-2">
        {recent.map((event) => (
          <li
            key={event.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-[var(--sf-line)] px-3 py-2 text-sm"
          >
            <span className="text-[var(--sf-muted)]">{event.reason}</span>
            <span className="font-semibold text-[var(--sf-accent-strong)]">
              {event.pointsDelta > 0 ? `+${event.pointsDelta}` : event.pointsDelta}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[11px] leading-relaxed text-[var(--sf-faint)]">
        {t("store.umPoints.disclosure")}
      </p>
    </section>
  );
}
