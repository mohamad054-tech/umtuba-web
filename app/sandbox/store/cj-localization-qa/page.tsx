import Link from "next/link";
import StoreUmPointsEarnHint from "../../../components/store/StoreUmPointsEarnHint";
import {
  CJ_LOCALIZATION_QA_BANNER,
  CJ_LOCALIZATION_QA_SUBTITLE,
} from "../../../../lib/sandbox/cjLocalizationQa/copy";
import { createTranslator } from "../../../../lib/i18n/translate";
import { formatMinorUnits } from "../../../../lib/store/money";
import { readLocalizationCatalogFile } from "../../../../lib/store/productLocalization/catalogFile";
import {
  buildLocalizationQaSampleFile,
  readLocalizationQaSampleFile,
} from "../../../../lib/store/productLocalization/sampleFile";
import { estimateEarnablePointsFromRetail } from "../../../../lib/store/umPointsPurchaseRewards";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ dir?: string }> | { dir?: string };
};

export default async function CjLocalizationQaPage({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const rtl = params.dir === "rtl";
  const sample = readLocalizationQaSampleFile() ?? buildLocalizationQaSampleFile();
  const catalog = readLocalizationCatalogFile();
  const tEn = createTranslator("en");
  const tAr = createTranslator("ar");

  return (
    <main
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[var(--sf-bg,#07070c)] px-3 py-6 text-[var(--sf-ink,#f6f1e8)] sm:px-6"
    >
      <div className="mx-auto max-w-[1400px]">
        <p className="text-[10px] font-black tracking-[0.22em] text-amber-200/90">
          {CJ_LOCALIZATION_QA_BANNER}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Product localization QA — gold standard + catalog
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-white/70">{CJ_LOCALIZATION_QA_SUBTITLE}</p>
        <p className="mt-2 text-sm text-emerald-200/90">Owner PASS on the frozen 20-product gold sample.</p>
        <p className="mt-2 text-sm text-white/60">
          Provider: {sample.provider} · Paid AI used: no · Gold quality gate: {sample.quality_gate.status}
        </p>
        {catalog ? (
          <dl className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-white/45">Localized</dt>
              <dd>
                {catalog.metrics.gold_standard_preserved + catalog.metrics.local_pass} /{" "}
                {catalog.metrics.total_products}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Titles / descriptions / specs</dt>
              <dd>
                {catalog.metrics.titles_complete} / {catalog.metrics.descriptions_complete} /{" "}
                {catalog.metrics.specifications_complete}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Numeric facts preserved</dt>
              <dd>{catalog.metrics.numeric_facts_preserved}</dd>
            </div>
            <div>
              <dt className="text-white/45">Manual review / paid AI</dt>
              <dd>
                {catalog.metrics.manual_review_required} · artifacts {catalog.metrics.untranslated_artifacts} ·
                claims {catalog.metrics.unsupported_claims}
              </dd>
            </div>
            <div>
              <dt className="text-white/45">Catalog QA flags</dt>
              <dd>
                IP {catalog.metrics.ip_review ?? 0} · price {catalog.metrics.price_review ?? 0} · shipping{" "}
                {catalog.metrics.shipping_review ?? 0} · unavailable {catalog.metrics.unavailable ?? 0} ·
                duplicates {catalog.metrics.duplicates_flagged ?? 0}
              </dd>
            </div>
          </dl>
        ) : null}
        <p className="mt-2 text-sm text-amber-100/80">{catalog?.next_action ?? sample.next_action}</p>

        <nav className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link className="underline decoration-white/30 hover:decoration-white" href="/sandbox/store/cj-launch">
            Main CJ listing (unchanged)
          </Link>
          <Link
            className="underline decoration-white/30 hover:decoration-white"
            href={rtl ? "/sandbox/store/cj-localization-qa" : "/sandbox/store/cj-localization-qa?dir=rtl"}
          >
            {rtl ? "LTR chrome" : "RTL chrome"}
          </Link>
        </nav>

        <ol className="mt-8 space-y-8">
          {sample.products.map((row, index) => {
            const priceEn = formatMinorUnits(row.retail_price_minor, row.currency, "en");
            const priceAr = formatMinorUnits(row.retail_price_minor, row.currency, "ar");
            const points =
              estimateEarnablePointsFromRetail({
                amountMinor: row.retail_price_minor,
                currency: row.currency,
              }) ?? 0;
            return (
              <li
                key={row.cj_product_id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                <header className="flex flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 text-xs text-white/60">
                  <span className="font-mono">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    {row.localized.department_en} / {row.localized.subcategory_en}
                  </span>
                  <span dir="rtl">
                    {row.localized.department_ar} / {row.localized.subcategory_ar}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5">{row.source}</span>
                  <span className={row.quality.ok ? "text-emerald-300" : "text-rose-300"}>
                    {row.quality.ok ? "quality pass" : "quality fail"}
                  </span>
                </header>

                <div className="grid gap-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1.2fr)]">
                  <section className="min-w-0 border-white/10 p-4 lg:border-e">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-200/80">
                      Original CJ
                    </h2>
                    {row.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.cover_url}
                        alt=""
                        className="mt-3 h-36 w-full rounded-xl object-cover"
                      />
                    ) : null}
                    <p className="mt-3 break-words text-sm leading-6 text-white/85">{row.source_title}</p>
                    <p className="mt-2 break-words text-xs leading-5 text-white/50">{row.source_description}</p>
                    <p className="mt-3 text-sm">
                      {priceEn} / <span dir="rtl">{priceAr}</span>
                    </p>
                  </section>

                  <section className="min-w-0 border-white/10 p-4 lg:border-e">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-200/80">
                      Clean English
                    </h2>
                    <h3 className="mt-3 text-lg font-semibold leading-snug">{row.localized.title_en_clean}</h3>
                    <p className="mt-2 text-sm font-medium text-white/70">{priceEn}</p>
                    <p className="mt-3 text-sm leading-6 text-white/80">{row.localized.description_en_clean}</p>
                    <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-white/70">
                      {row.localized.specifications_en.map((spec) => (
                        <li key={spec} className="break-words">
                          {spec}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-white/45">
                      {tEn("store.umPoints.earnWithPurchase", { values: { count: points } })}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      Keywords: {row.localized.search_keywords_en.join(" · ")}
                    </p>
                  </section>

                  <section className="min-w-0 p-4" dir="rtl" lang="ar">
                    <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200/80">
                      العربية المهنية
                    </h2>
                    <h3 className="mt-3 text-lg font-semibold leading-snug">{row.localized.title_ar}</h3>
                    <p className="mt-2 text-sm font-medium text-white/70">{priceAr}</p>
                    <p className="mt-3 text-sm leading-7 text-white/80">{row.localized.description_ar}</p>
                    <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-white/70">
                      {row.localized.specifications_ar.map((spec) => (
                        <li key={spec} className="break-words">
                          {spec}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3">
                      <StoreUmPointsEarnHint locale="ar" points={points} />
                    </div>
                    <p className="mt-2 text-xs text-white/40">
                      كلمات البحث: {row.localized.search_keywords_ar.join(" · ")}
                    </p>
                    <p className="mt-2 text-xs text-white/45" dir="rtl">
                      {tAr("store.umPoints.earnWithPurchase", { values: { count: points } })}
                    </p>
                  </section>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </main>
  );
}
