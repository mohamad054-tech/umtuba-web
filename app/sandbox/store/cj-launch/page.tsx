import ProductCard from "../../../components/store/ProductCard";
import StoreSection from "../../../components/store/StoreSection";
import StoreShell from "../../../components/store/StoreShell";
import StoreUmPointsCartEstimate from "../../../components/store/StoreUmPointsCartEstimate";
import StoreUmPointsPromoBanner from "../../../components/store/StoreUmPointsPromoBanner";
import StoreUmPointsRewardsPanel from "../../../components/store/StoreUmPointsRewardsPanel";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { createTranslator } from "../../../../lib/i18n/translate";
import {
  cjLaunchBadgeLabel,
  cjLaunchRailLabel,
} from "../../../../lib/sandbox/cjLaunch/previewCopy";
import { resolveCjLaunchPreviewLocale } from "../../../../lib/sandbox/cjLaunch/resolvePreviewLocale";
import { formatPilotMoney } from "../../../../lib/services/cj/catalogAdapter";
import {
  filterBrowseCatalog,
  loadStoreBrowseCatalog,
  parseDepartment,
  parseRail,
  subcategoriesFor,
  type StoreBrowseProduct,
  type StoreRail,
} from "../../../../lib/services/cj/expansionBrowse";
import { STORE_DEPARTMENTS, type StoreDepartment } from "../../../../lib/services/cj/expansionTaxonomy";
import { isCustomerVisibleLaunchProduct } from "../../../../lib/services/cj/productionCandidate";
import { readStoreUmPointsDemoSummary } from "../../../../lib/store/umPointsPurchaseDemo";
import { readLocalizationCatalogFile } from "../../../../lib/store/productLocalization/catalogFile";
import {
  applyCustomerLocalization,
  loadCustomerLocalizationLookup,
} from "../../../../lib/store/productLocalization/customerOverlay";
import { applyPublishableCustomerVisibility } from "../../../../lib/store/productLocalization/publishable";
import { departmentLabel, subcategoryLabel } from "../../../../lib/store/productLocalization/taxonomyLocale";
import { estimateEarnablePointsFromRetail } from "../../../../lib/store/umPointsPurchaseRewards";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<{
        category?: string;
        dept?: string;
        sub?: string;
        q?: string;
        rail?: string;
        admin?: string;
        dir?: string;
      }>
    | {
        category?: string;
        dept?: string;
        sub?: string;
        q?: string;
        rail?: string;
        admin?: string;
        dir?: string;
      };
};

export default async function CjLaunchStorePreviewPage({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const department = parseDepartment(params.dept ?? params.category);
  const subcategory = params.sub?.trim() || undefined;
  const query = params.q?.trim() || undefined;
  const rail = parseRail(params.rail);
  const admin = params.admin === "1";
  const { locale: requestLocale } = await resolveRequestLocale();
  const { locale, direction, rtlOverride } = resolveCjLaunchPreviewLocale({
    requestLocale,
    dirParam: params.dir,
  });
  const rtl = direction === "rtl";
  const t = createTranslator(locale);
  const demoRewards = readStoreUmPointsDemoSummary();
  const catalog = loadStoreBrowseCatalog();
  const localizationLookup = loadCustomerLocalizationLookup();
  const localizationById = new Map(
    (readLocalizationCatalogFile()?.products ?? []).map((row) => [row.cj_product_id, row])
  );
  const localizedItems = applyPublishableCustomerVisibility(
    catalog.items.map((row) => applyCustomerLocalization(row, locale, localizationLookup)),
    localizationById
  );
  const listed = filterBrowseCatalog(localizedItems, {
    department,
    subcategory,
    query,
    rail,
    admin,
  });
  const hidden = admin ? localizedItems.filter((row) => !row.customerVisible) : [];
  const demoSource = localizedItems.filter((row) => row.customerVisible);
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
    if (admin) qs.set("admin", "1");
    if (rtlOverride) qs.set("dir", "rtl");
    const queryString = qs.toString();
    return queryString ? `/sandbox/store/cj-launch?${queryString}` : "/sandbox/store/cj-launch";
  };

  const hrefFor = (slug: string) => {
    const qs = new URLSearchParams();
    if (admin) qs.set("admin", "1");
    if (rtlOverride) qs.set("dir", "rtl");
    const queryString = qs.toString();
    return queryString
      ? `/sandbox/store/cj-launch/${slug}?${queryString}`
      : `/sandbox/store/cj-launch/${slug}`;
  };

  const railItems = (key: StoreRail) =>
    filterBrowseCatalog(localizedItems, { rail: key, admin: false });

  const renderGrid = (rows: StoreBrowseProduct[]) => (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((draft) => {
        const held = !draft.customerVisible;
        return (
          <li key={draft.customer.id} className="flex flex-col gap-2">
            <ProductCard
              item={draft.catalogItem}
              badge={
                held
                  ? cjLaunchBadgeLabel("held", locale)
                  : draft.rails.featured
                    ? cjLaunchBadgeLabel("featured", locale)
                    : draft.rails.bestDeal
                      ? cjLaunchBadgeLabel("deal", locale)
                      : draft.rails.isNew
                        ? cjLaunchBadgeLabel("new", locale)
                        : undefined
              }
              showWishlist={false}
              href={hrefFor(draft.customer.slug)}
              locale={locale}
            />
            {admin ? (
              <dl className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-50/90">
                <dt className="font-black uppercase tracking-wider">Admin only</dt>
                <dd>
                  {draft.department} / {draft.subcategory} · Landed{" "}
                  {formatPilotMoney(draft.economics.landed_cost_minor)} · Margin{" "}
                  {draft.economics.gross_margin == null
                    ? "n/a"
                    : `${Math.round(draft.economics.gross_margin * 1000) / 10}%`}{" "}
                  · {draft.classification}
                  {draft.sync_status ? ` · ${draft.sync_status}` : ""}
                </dd>
                {!isCustomerVisibleLaunchProduct(draft) ? (
                  <dd className="mt-1 font-semibold text-amber-100">
                    INTERNAL — held/inactive. Not for sale. Not substituted.
                  </dd>
                ) : null}
              </dl>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div dir={rtl ? "rtl" : "ltr"}>
      <StoreShell title={t("store.chrome.title")} subtitle={t("store.preview.subtitle")} locale={locale}>
        <div className="mb-6">
          <StoreUmPointsPromoBanner locale={locale} href="#store-catalog" />
        </div>
        <StoreSection
          id="store-catalog"
          eyebrow={t("store.preview.eyebrow")}
          title={t("store.preview.heading")}
          description={t("store.preview.description", {
            values: { count: catalog.approvedCount + catalog.expansionCount },
          })}
        >
          <form className="mb-4 flex flex-col gap-2 sm:flex-row" action="/sandbox/store/cj-launch" method="get">
            {admin ? <input type="hidden" name="admin" value="1" /> : null}
            {rtlOverride ? <input type="hidden" name="dir" value="rtl" /> : null}
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
              placeholder={t("store.preview.searchPlaceholder")}
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
                {departmentLabel(value, locale)}
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
                  {subcategoryLabel(value, locale)}
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
                {cjLaunchRailLabel(value, locale)}
              </a>
            ))}
          </nav>

          {admin && hidden.length > 0 ? (
            <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-50/90">
              INTERNAL — {hidden.length} flagged item{hidden.length === 1 ? "" : "s"} shown
              here only. Not for sale. Not substituted.
            </p>
          ) : null}

          {catalog.items.length === 0 ? (
            <p className="rounded-2xl border border-[var(--sf-line)] px-5 py-8 text-sm text-[var(--sf-muted)]">
              {t("store.preview.emptyCatalog")}
            </p>
          ) : filtered ? (
            listed.length ? (
              renderGrid(listed)
            ) : (
              <p className="rounded-2xl border border-[var(--sf-line)] px-5 py-8 text-sm text-[var(--sf-muted)]">
                {t("store.preview.noMatch")}
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
                        {cjLaunchRailLabel(key, locale)}
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

        {demoSource.length > 0 ? (
          <StoreSection
            eyebrow={t("store.preview.rewardsEyebrow")}
            title={t("store.umPoints.demoCartTitle")}
            description={t("store.umPoints.estimateNote")}
          >
            <StoreUmPointsCartEstimate
              locale={locale}
              points={
                estimateEarnablePointsFromRetail({
                  amountMinor: demoSource
                    .slice(0, 3)
                    .reduce((sum, row) => sum + (row.customer.retail_price_minor ?? 0), 0),
                  currency: demoSource[0]?.customer.currency ?? "USD",
                }) ?? 0
              }
            />
            <div className="mt-4">
              <StoreUmPointsRewardsPanel
                locale={locale}
                demo
                balance={demoRewards.balance}
                purchaseEarned={demoRewards.purchaseEarned}
                refundReversed={demoRewards.refundReversed}
                recent={demoRewards.recent}
              />
            </div>
          </StoreSection>
        ) : null}
      </StoreShell>
    </div>
  );
}
