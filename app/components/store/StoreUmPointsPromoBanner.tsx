import { createTranslator } from "../../../lib/i18n/translate";
import type { AppLocale } from "../../../lib/i18n/locales";
import { getLocaleDirection } from "../../../lib/i18n/locales";

type StoreUmPointsPromoBannerProps = {
  locale: AppLocale;
  /** Optional in-page shop target. Defaults to the catalog section. */
  href?: string;
};

export default function StoreUmPointsPromoBanner({
  locale,
  href = "#store-catalog",
}: StoreUmPointsPromoBannerProps) {
  const t = createTranslator(locale);
  const dir = getLocaleDirection(locale);

  return (
    <section
      dir={dir}
      aria-label={t("store.umPoints.rewardsTitle")}
      className="relative overflow-hidden rounded-[var(--sf-radius-lg)] border border-[rgba(214,196,161,0.45)] bg-[linear-gradient(135deg,#050505_0%,#14110c_55%,#0a0907_100%)] px-4 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.35)] sm:px-6 sm:py-6 md:px-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_12%_20%,rgba(214,196,161,0.22),transparent_42%),radial-gradient(circle_at_88%_80%,rgba(214,196,161,0.12),transparent_36%)]"
      />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 md:max-w-3xl">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[rgba(214,196,161,0.72)]">
            <span aria-hidden className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[rgba(214,196,161,0.45)] text-[11px] text-[var(--sf-accent-strong)]">
              ★
            </span>
            {t("store.umPoints.rule")}
          </p>
          <h2 className="sf-display mt-2 text-2xl font-semibold tracking-tight text-[var(--sf-accent-strong)] sm:text-3xl md:text-[2.15rem]">
            {t("store.umPoints.bannerHeadline")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#f3ead8] sm:text-base">
            {t("store.umPoints.bannerPrimary")}
          </p>
          <p className="mt-1 text-sm text-[rgba(243,234,216,0.72)]">
            {t("store.umPoints.bannerCta")}
          </p>
          <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-[rgba(214,196,161,0.62)]">
            {t("store.umPoints.disclosure")}
          </p>
        </div>
        <a
          href={href}
          className="watch-focus-ring inline-flex shrink-0 items-center justify-center rounded-full border border-[rgba(214,196,161,0.55)] bg-[rgba(214,196,161,0.12)] px-5 py-3 text-sm font-bold text-[var(--sf-accent-strong)] transition hover:bg-[rgba(214,196,161,0.2)]"
        >
          {t("store.umPoints.bannerCta")}
        </a>
      </div>
    </section>
  );
}
