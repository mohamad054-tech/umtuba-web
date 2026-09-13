import Link from "next/link";
import { notFound } from "next/navigation";
import StoreShell from "../../../../components/store/StoreShell";
import StoreUmPointsEarnHint from "../../../../components/store/StoreUmPointsEarnHint";
import ProductImageGallery from "../ProductImageGallery";
import { resolveRequestLocale } from "../../../../../lib/i18n/server";
import { createTranslator } from "../../../../../lib/i18n/translate";
import { resolveCjLaunchPreviewLocale } from "../../../../../lib/sandbox/cjLaunch/resolvePreviewLocale";
import { formatMinorUnits } from "../../../../../lib/store/money";
import { estimateEarnablePointsFromRetail } from "../../../../../lib/store/umPointsPurchaseRewards";
import { formatPilotMoney } from "../../../../../lib/services/cj/catalogAdapter";
import {
  findBrowseProductBySlug,
  loadStoreBrowseCatalog,
} from "../../../../../lib/services/cj/expansionBrowse";
import { readLocalizationCatalogFile } from "../../../../../lib/store/productLocalization/catalogFile";
import {
  applyCustomerLocalization,
  loadCustomerLocalizationLookup,
} from "../../../../../lib/store/productLocalization/customerOverlay";
import { applyPublishableCustomerVisibility } from "../../../../../lib/store/productLocalization/publishable";
import { departmentLabel, subcategoryLabel } from "../../../../../lib/store/productLocalization/taxonomyLocale";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?:
    | Promise<{ admin?: string; dir?: string }>
    | { admin?: string; dir?: string };
};

export default async function CjLaunchProductPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const admin = query.admin === "1";
  const { locale: requestLocale } = await resolveRequestLocale();
  const { locale, direction, rtlOverride } = resolveCjLaunchPreviewLocale({
    requestLocale,
    dirParam: query.dir,
  });
  const rtl = direction === "rtl";
  const t = createTranslator(locale);
  const catalog = loadStoreBrowseCatalog();
  const localizationById = new Map(
    (readLocalizationCatalogFile()?.products ?? []).map((row) => [row.cj_product_id, row])
  );
  const visibleItems = applyPublishableCustomerVisibility(catalog.items, localizationById);
  const found = findBrowseProductBySlug(visibleItems, slug);
  const draft = found
    ? applyCustomerLocalization(found, locale, loadCustomerLocalizationLookup())
    : found;
  if (!draft) notFound();
  const customerVisible = draft.customerVisible;
  if (!admin && !customerVisible) notFound();

  const price =
    draft.customer.retail_price_minor != null
      ? formatMinorUnits(draft.customer.retail_price_minor, draft.customer.currency, locale)
      : null;
  const earnablePoints = estimateEarnablePointsFromRetail({
    amountMinor: draft.customer.retail_price_minor,
    currency: draft.customer.currency,
  });
  const qs = new URLSearchParams();
  if (admin) qs.set("admin", "1");
  if (rtlOverride) qs.set("dir", "rtl");
  const back = qs.toString() ? `/sandbox/store/cj-launch?${qs}` : "/sandbox/store/cj-launch";

  return (
    <div dir={rtl ? "rtl" : "ltr"}>
      <StoreShell
        title={draft.customer.title}
        subtitle={t("store.preview.productSubtitle")}
        locale={locale}
      >
        <nav className="mt-4 text-xs text-[var(--sf-faint)]">
          <Link href={back} className="watch-focus-ring rounded hover:text-[var(--sf-accent-strong)]">
            {t("store.preview.backToStore")}
          </Link>
        </nav>

        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <ProductImageGallery
            productKey={draft.customer.slug}
            images={
              draft.customer.gallery_urls.length > 0
                ? draft.customer.gallery_urls
                : draft.customer.cover_url
                  ? [draft.customer.cover_url]
                  : []
            }
            alt=""
            galleryLabel={t("store.preview.gallery")}
            galleryListLabel={t("store.preview.galleryList")}
          />

          <section className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 backdrop-blur-xl md:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sf-faint)]">
              {departmentLabel(draft.department, locale)} · {subcategoryLabel(draft.subcategory, locale)}
            </p>
            <h1 dir="auto" className="sf-display mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              {draft.customer.title}
            </h1>
            <p dir="auto" className="mt-2 text-sm text-[var(--sf-muted)]">
              {draft.customer.short_description}
            </p>
            <p className="mt-5 text-3xl font-semibold text-[var(--sf-accent-strong)]">
              {price ?? t("store.preview.priceUnavailable")}
            </p>
            {earnablePoints != null ? (
              <StoreUmPointsEarnHint
                locale={locale}
                points={earnablePoints}
                variant="product"
              />
            ) : null}
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--sf-faint)]">
              {t("store.umPoints.estimateNote")}
            </p>
            <p
              className={`mt-1 text-sm ${
                customerVisible ? "text-[var(--sf-ok)]" : "text-[var(--sf-danger)]"
              }`}
            >
              {customerVisible ? draft.customer.availability_label : t("store.preview.notForSale")}
            </p>
            <p className="mt-2 text-sm text-[var(--sf-muted)]">{draft.customer.delivery_label}</p>
            <p dir="auto" className="mt-6 text-sm leading-relaxed text-[var(--sf-muted)]">
              {draft.customer.description}
            </p>
            <p
              role="status"
              className="mt-6 rounded-2xl border border-[rgba(214,196,161,0.28)] bg-[rgba(214,196,161,0.08)] px-3 py-2 text-xs text-[var(--sf-accent-strong)]"
            >
              {t("store.preview.draftNotice")}
            </p>
            {admin ? (
              <dl className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 text-xs text-amber-50">
                <dt className="font-black uppercase tracking-wider">Admin only</dt>
                <dd className="mt-1">
                  Landed {formatPilotMoney(draft.economics.landed_cost_minor)} · Profit{" "}
                  {formatPilotMoney(draft.economics.gross_profit_minor)} · Margin{" "}
                  {draft.economics.gross_margin == null
                    ? "n/a"
                    : `${Math.round(draft.economics.gross_margin * 1000) / 10}%`}
                </dd>
                <dd className="mt-1">
                  {draft.classification} · {draft.source}
                  {draft.sync_status ? ` · ${draft.sync_status}` : ""}
                </dd>
                {!customerVisible ? (
                  <dd className="mt-1 font-semibold text-amber-100">
                    INTERNAL — not for sale. Flagged; not substituted.
                  </dd>
                ) : null}
              </dl>
            ) : null}
          </section>
        </div>
      </StoreShell>
    </div>
  );
}
