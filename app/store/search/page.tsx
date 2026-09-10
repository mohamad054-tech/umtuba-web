import ApprovedCatalogListing from "../../components/store/ApprovedCatalogListing";
import StoreShell from "../../components/store/StoreShell";
import { APP_ROUTES } from "../../lib/nav";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { storeSearchMetadata } from "../../../lib/site/routeMetadata";
import { loadApprovedCustomerStorefront } from "../../../lib/store/approvedCatalog/loadCustomerStorefront";
import { resolveStoreProductLocale } from "../../../lib/store/productLocalization/resolveStoreProductLocale";

export const dynamic = "force-dynamic";

export const metadata = storeSearchMetadata;

type SearchPageProps = {
  searchParams?:
    | Promise<{
        q?: string;
        category?: string;
        dept?: string;
        sub?: string;
        rail?: string;
      }>
    | {
        q?: string;
        category?: string;
        dept?: string;
        sub?: string;
        rail?: string;
      };
};

export default async function StoreSearchPage({ searchParams }: SearchPageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const { locale, direction } = await resolveRequestLocale();
  const productLocale = resolveStoreProductLocale({ requestLocale: locale });
  const t = createTranslator(locale);
  const storefront = loadApprovedCustomerStorefront(productLocale);

  return (
    <div dir={direction}>
      <StoreShell title={t("store.search.navTitle")} subtitle={t("store.search.navSubtitle")}>
        <ApprovedCatalogListing
          items={storefront.items}
          visibleCount={storefront.visibleCount}
          locale={locale}
          productLocale={productLocale}
          params={params}
          formAction={APP_ROUTES.storeSearch}
        />
      </StoreShell>
    </div>
  );
}
