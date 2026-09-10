import Link from "next/link";
import BecomeASellerHook from "../components/store/BecomeASellerHook";
import ApprovedCatalogListing from "../components/store/ApprovedCatalogListing";
import StoreShell from "../components/store/StoreShell";
import StoreTrustStrip from "../components/store/StoreTrustStrip";
import JsonLd from "../components/JsonLd";
import { APP_ROUTES, buildApprovedStoreItemHref } from "../lib/nav";
import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { buildBreadcrumbListJsonLd, buildItemListJsonLd } from "../../lib/site/jsonLd";
import { buildLocalizedRouteMetadata } from "../../lib/site/localizedSeo";
import { loadApprovedCustomerStorefront } from "../../lib/store/approvedCatalog/loadCustomerStorefront";
import { resolveStoreProductLocale } from "../../lib/store/productLocalization/resolveStoreProductLocale";
import { filterBrowseCatalog } from "../../lib/services/cj/expansionBrowse";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await resolveRequestLocale();
  return buildLocalizedRouteMetadata({
    key: "store",
    path: "/store",
    locale,
  });
}

type PageProps = {
  searchParams?:
    | Promise<{
        category?: string;
        dept?: string;
        sub?: string;
        q?: string;
        rail?: string;
      }>
    | {
        category?: string;
        dept?: string;
        sub?: string;
        q?: string;
        rail?: string;
      };
};

export default async function StoreHomePage({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const { locale, direction } = await resolveRequestLocale();
  const productLocale = resolveStoreProductLocale({ requestLocale: locale });
  const t = createTranslator(locale);
  const storefront = loadApprovedCustomerStorefront(productLocale);
  const visible = filterBrowseCatalog(storefront.items, { admin: false });

  return (
    <div dir={direction}>
      <JsonLd
        data={buildBreadcrumbListJsonLd([
          { name: "UMTUBA", path: "/" },
          { name: t("store.shell.title"), path: "/store" },
        ])}
      />
      <JsonLd
        data={buildItemListJsonLd({
          name: t("store.shell.title"),
          items: visible.slice(0, 24).map((item) => ({
            name: item.customer.title,
            path: buildApprovedStoreItemHref(item.customer.slug),
          })),
        })}
      />
      <StoreShell title={t("store.shell.title")} subtitle={t("store.shell.subtitle")}>
        <StoreTrustStrip />
        <div className="mt-8">
          <BecomeASellerHook
            eyebrow={t("store.home.becomeSellerEyebrow")}
            title={t("store.home.becomeSellerTitle")}
            body={t("store.home.becomeSellerBody")}
            cta={t("store.home.becomeSellerCta")}
          />
        </div>
        <div className="mt-8">
          <ApprovedCatalogListing
            items={storefront.items}
            visibleCount={storefront.visibleCount}
            locale={locale}
            productLocale={productLocale}
            params={params}
            formAction={APP_ROUTES.store}
          />
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sf-line)] pt-7">
          <Link
            href={APP_ROUTES.storeSearch}
            className="text-sm font-semibold text-[var(--sf-accent-strong)] transition hover:text-[var(--sf-accent)]"
          >
            {t("store.home.openCatalog")}
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={APP_ROUTES.storeWishlist}
              className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
            >
              {t("store.home.favorites")}
            </Link>
            <Link
              href={APP_ROUTES.storeCart}
              className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
            >
              {t("store.home.cart")}
            </Link>
            <Link
              href={APP_ROUTES.seller}
              className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
            >
              {t("store.home.sellOnUmtuba")}
            </Link>
          </div>
        </div>
      </StoreShell>
    </div>
  );
}
