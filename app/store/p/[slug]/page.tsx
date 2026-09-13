import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ProductImageGallery from "../../../components/store/ProductImageGallery";
import StoreShell from "../../../components/store/StoreShell";
import StoreUmPointsEarnHint from "../../../components/store/StoreUmPointsEarnHint";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { LOCALE_COOKIE_NAME } from "../../../../lib/i18n/cookie";
import { createTranslator } from "../../../../lib/i18n/translate";
import { APP_ROUTES } from "../../../lib/nav";
import { formatMinorUnits } from "../../../../lib/store/money";
import { estimateEarnablePointsFromRetail } from "../../../../lib/store/umPointsPurchaseRewards";
import { findBrowseProductBySlug } from "../../../../lib/services/cj/expansionBrowse";
import { loadApprovedCustomerStorefront } from "../../../../lib/store/approvedCatalog/loadCustomerStorefront";
import { resolveStoreProductLocale } from "../../../../lib/store/productLocalization/resolveStoreProductLocale";
import { departmentLabel, subcategoryLabel } from "../../../../lib/store/productLocalization/taxonomyLocale";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export default async function ApprovedStoreProductPage({ params }: PageProps) {
  const { slug } = await Promise.resolve(params);
  const { locale: chromeLocale, direction } = await resolveRequestLocale();
  const rawCookie = (await cookies()).get(LOCALE_COOKIE_NAME)?.value ?? null;
  const productLocale = resolveStoreProductLocale({
    requestLocale: chromeLocale,
    rawCookie,
  });
  const t = createTranslator(chromeLocale);
  const storefront = loadApprovedCustomerStorefront(productLocale);
  const draft = findBrowseProductBySlug(storefront.items, slug);
  if (!draft || !draft.customerVisible) notFound();

  const price =
    draft.customer.retail_price_minor != null
      ? formatMinorUnits(draft.customer.retail_price_minor, draft.customer.currency, chromeLocale)
      : null;
  const earnablePoints = estimateEarnablePointsFromRetail({
    amountMinor: draft.customer.retail_price_minor,
    currency: draft.customer.currency,
  });

  return (
    <div dir={direction}>
      <StoreShell
        title={draft.customer.title}
        subtitle={t("store.live.productSubtitle")}
        locale={chromeLocale}
      >
        <nav className="mt-4 text-xs text-[var(--sf-faint)]">
          <Link href={APP_ROUTES.store} className="watch-focus-ring rounded hover:text-[var(--sf-accent-strong)]">
            {t("store.live.backToStore")}
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
              {departmentLabel(draft.department, productLocale)} ·{" "}
              {subcategoryLabel(draft.subcategory, productLocale)}
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
              <StoreUmPointsEarnHint locale={chromeLocale} points={earnablePoints} variant="product" />
            ) : null}
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--sf-faint)]">
              {t("store.umPoints.estimateNote")}
            </p>
            <p className="mt-1 text-sm text-[var(--sf-ok)]">{draft.customer.availability_label}</p>
            <p className="mt-2 text-sm text-[var(--sf-muted)]">{draft.customer.delivery_label}</p>
            <p dir="auto" className="mt-6 text-sm leading-relaxed text-[var(--sf-muted)]">
              {draft.customer.description}
            </p>
            <p
              role="status"
              className="mt-6 rounded-2xl border border-[rgba(214,196,161,0.28)] bg-[rgba(214,196,161,0.08)] px-3 py-2 text-xs text-[var(--sf-accent-strong)]"
            >
              {t("store.live.browseNotice")}
            </p>
          </section>
        </div>
      </StoreShell>
    </div>
  );
}
