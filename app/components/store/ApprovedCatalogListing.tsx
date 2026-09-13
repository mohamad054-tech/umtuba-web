import ProductCard from "./ProductCard";
import StoreSection from "./StoreSection";
import StoreUmPointsPromoBanner from "./StoreUmPointsPromoBanner";
import type { AppLocale } from "../../../lib/i18n/locales";
import { createTranslator } from "../../../lib/i18n/translate";
import { APP_ROUTES, buildApprovedStoreItemHref } from "../../lib/nav/routes";
import {
  filterBrowseCatalog,
  parseDepartment,
  parseRail,
  subcategoriesFor,
  type StoreBrowseProduct,
  type StoreRail,
} from "../../../lib/services/cj/expansionBrowse";
import { STORE_DEPARTMENTS, type StoreDepartment } from "../../../lib/services/cj/expansionTaxonomy";
import type { StoreLocale } from "../../../lib/store/productLocalization/requiredLocales";
import { departmentLabel, subcategoryLabel } from "../../../lib/store/productLocalization/taxonomyLocale";

export type ApprovedCatalogSearch = {
  category?: string;
  dept?: string;
  sub?: string;
  q?: string;
  rail?: string;
};

type ApprovedCatalogListingProps = {
  items: StoreBrowseProduct[];
  visibleCount: number;
  chromeLocale: AppLocale;
  productLocale: StoreLocale;
  params: ApprovedCatalogSearch;
  formAction: string;
};

function railLabel(rail: StoreRail | "ALL", locale: AppLocale): string {
  const t = createTranslator(locale);
  if (rail === "ALL") return t("store.preview.allProducts");
  if (rail === "featured") return t("store.preview.featured");
  if (rail === "new") return t("store.preview.new");
  if (rail === "top_picks") return t("store.preview.topPicks");
  return t("store.preview.bestDeals");
}

function badgeLabel(
  draft: StoreBrowseProduct,
  locale: AppLocale
): string | undefined {
  const t = createTranslator(locale);
  if (draft.rails.featured) return t("store.preview.badgeFeatured");
  if (draft.rails.bestDeal) return t("store.preview.badgeDeal");
  if (draft.rails.isNew) return t("store.preview.badgeNew");
  return undefined;
}

export default function ApprovedCatalogListing({
  items,
  visibleCount,
  chromeLocale,
  productLocale,
  params,
  formAction,
}: ApprovedCatalogListingProps) {
  const t = createTranslator(chromeLocale);
  const department = parseDepartment(params.dept ?? params.category);
  const subcategory = params.sub?.trim() || undefined;
  const query = params.q?.trim() || undefined;
  const rail = parseRail(params.rail);
  const listed = filterBrowseCatalog(items, {
    department,
    subcategory,
    query,
    rail,
    admin: false,
  });
  const filtered = Boolean(query || department !== "ALL" || subcategory || rail !== "ALL");

  const qsBase = (next: {
    dept?: StoreDepartment | "ALL";
    sub?: string;
    q?: string;
    rail?: StoreRail | "ALL";
  }) => {
    const qs = new URLSearchParams();
    const dept = next.dept ?? department;
    const sub = next.sub === undefined ? subcategory : next.sub;
    const q = next.q === undefined ? query : next.q;
    const nextRail = next.rail ?? rail;
    if (dept !== "ALL") qs.set("dept", dept);
    if (sub) qs.set("sub", sub);
    if (q) qs.set("q", q);
    if (nextRail !== "ALL") qs.set("rail", nextRail);
    const queryString = qs.toString();
    return queryString ? `${formAction}?${queryString}` : formAction;
  };

  const renderGrid = (rows: StoreBrowseProduct[]) => (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((draft) => (
        <li key={draft.customer.id} className="flex flex-col gap-2">
          <ProductCard
            item={draft.catalogItem}
            badge={badgeLabel(draft, chromeLocale)}
            showWishlist={false}
            href={buildApprovedStoreItemHref(draft.customer.slug)}
            locale={chromeLocale}
          />
        </li>
      ))}
    </ul>
  );

  const railItems = (key: StoreRail) =>
    filterBrowseCatalog(items, { rail: key, admin: false });

  return (
    <>
      <div className="mb-6">
        <StoreUmPointsPromoBanner locale={chromeLocale} href="#store-catalog" />
      </div>
      <StoreSection
        id="store-catalog"
        eyebrow={t("store.live.eyebrow")}
        title={t("store.live.heading")}
        description={t("store.live.description", {
          values: { count: visibleCount },
        })}
      >
        <form className="mb-4 flex flex-col gap-2 sm:flex-row" action={formAction} method="get">
          {department !== "ALL" ? <input type="hidden" name="dept" value={department} /> : null}
          {subcategory ? <input type="hidden" name="sub" value={subcategory} /> : null}
          {rail !== "ALL" ? <input type="hidden" name="rail" value={rail} /> : null}
          <label className="sr-only" htmlFor="store-search">
            {t("store.preview.searchLabel")}
          </label>
          <input
            id="store-search"
            name="q"
            defaultValue={query}
            placeholder={t("store.live.searchPlaceholder")}
            className="min-h-11 flex-1 rounded-full border border-[var(--sf-line)] bg-[var(--sf-surface)] px-4 text-sm text-[var(--sf-ink)]"
          />
          <button
            type="submit"
            className="min-h-11 rounded-full border border-[rgba(214,196,161,0.55)] px-4 text-[11px] font-bold uppercase tracking-wider text-[var(--sf-accent-strong)]"
          >
            {t("store.chrome.search")}
          </button>
        </form>

        <nav className="mb-3 flex flex-wrap gap-2" aria-label={t("store.preview.departmentFilter")}>
          <a
            href={qsBase({ dept: "ALL", sub: "" })}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
              department === "ALL"
                ? "border-[rgba(214,196,161,0.55)] bg-[rgba(214,196,161,0.12)] text-[var(--sf-accent-strong)]"
                : "border-[var(--sf-line)] text-[var(--sf-faint)]"
            }`}
          >
            {t("store.preview.all")}
          </a>
          {STORE_DEPARTMENTS.map((value) => (
            <a
              key={value}
              href={qsBase({ dept: value, sub: "" })}
              className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                department === value
                  ? "border-[rgba(214,196,161,0.55)] bg-[rgba(214,196,161,0.12)] text-[var(--sf-accent-strong)]"
                  : "border-[var(--sf-line)] text-[var(--sf-faint)]"
              }`}
            >
              {departmentLabel(value, productLocale)}
            </a>
          ))}
        </nav>

        {department !== "ALL" ? (
          <nav className="mb-3 flex flex-wrap gap-2" aria-label={t("store.preview.subcategoryFilter")}>
            {subcategoriesFor(department).map((value) => (
              <a
                key={value}
                href={qsBase({ dept: department, sub: value })}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  subcategory === value
                    ? "border-[rgba(214,196,161,0.55)] bg-[rgba(214,196,161,0.12)] text-[var(--sf-accent-strong)]"
                    : "border-[var(--sf-line)] text-[var(--sf-faint)]"
                }`}
              >
                {subcategoryLabel(value, productLocale)}
              </a>
            ))}
          </nav>
        ) : null}

        <nav className="mb-5 flex flex-wrap gap-2" aria-label={t("store.preview.rails")}>
          {(["ALL", "featured", "new", "top_picks", "best_deals"] as const).map((value) => (
            <a
              key={value}
              href={qsBase({ rail: value })}
              className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                rail === value
                  ? "border-[rgba(214,196,161,0.55)] bg-[rgba(214,196,161,0.12)] text-[var(--sf-accent-strong)]"
                  : "border-[var(--sf-line)] text-[var(--sf-faint)]"
              }`}
            >
              {railLabel(value, chromeLocale)}
            </a>
          ))}
        </nav>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-[var(--sf-line)] px-5 py-8 text-sm text-[var(--sf-muted)]">
            {t("store.live.emptyCatalog")}
          </p>
        ) : filtered ? (
          listed.length ? (
            renderGrid(listed)
          ) : (
            <p className="rounded-2xl border border-[var(--sf-line)] px-5 py-8 text-sm text-[var(--sf-muted)]">
              {t("store.live.noMatch")}
            </p>
          )
        ) : (
          <div className="flex flex-col gap-8">
            {(["featured", "new", "top_picks", "best_deals"] as const).map((key) => {
              const rows = railItems(key).slice(0, 8);
              if (!rows.length) return null;
              return (
                <section key={key} aria-labelledby={`rail-${key}`}>
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <h3 id={`rail-${key}`} className="text-sm font-black uppercase tracking-[0.16em]">
                      {railLabel(key, chromeLocale)}
                    </h3>
                    <a
                      href={qsBase({ rail: key })}
                      className="text-[11px] font-bold uppercase tracking-wider text-[var(--sf-accent-strong)]"
                    >
                      {t("store.preview.viewAll")}
                    </a>
                  </div>
                  {renderGrid(rows)}
                </section>
              );
            })}
            <section aria-labelledby="all-departments">
              <h3 id="all-departments" className="mb-3 text-sm font-black uppercase tracking-[0.16em]">
                {t("store.preview.allDepartments")}
              </h3>
              {renderGrid(listed.slice(0, 24))}
            </section>
          </div>
        )}
      </StoreSection>
    </>
  );
}
