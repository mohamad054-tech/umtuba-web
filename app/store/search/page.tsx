import { cookies } from "next/headers";
import ApprovedCatalogListing from "../../components/store/ApprovedCatalogListing";
import StoreShell from "../../components/store/StoreShell";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { LOCALE_COOKIE_NAME } from "../../../lib/i18n/cookie";
import { createTranslator } from "../../../lib/i18n/translate";
import { APP_ROUTES } from "../../lib/nav";
import { loadApprovedCustomerStorefront } from "../../../lib/store/approvedCatalog/loadCustomerStorefront";
import { resolveStoreProductLocale } from "../../../lib/store/productLocalization/resolveStoreProductLocale";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search Store | UMTUBA",
  description: "Search UMTUBA Store products.",
};

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
  const { locale: chromeLocale, direction } = await resolveRequestLocale();
  const rawCookie = (await cookies()).get(LOCALE_COOKIE_NAME)?.value ?? null;
  const productLocale = resolveStoreProductLocale({
    requestLocale: chromeLocale,
    rawCookie,
  });
  const t = createTranslator(chromeLocale);
  const storefront = loadApprovedCustomerStorefront(productLocale);

  return (
    <div dir={direction}>
      <StoreShell
        title={t("store.chrome.catalog")}
        subtitle={t("store.live.subtitle")}
        locale={chromeLocale}
      >
        <ApprovedCatalogListing
          items={storefront.items}
          visibleCount={storefront.visibleCount}
          chromeLocale={chromeLocale}
          productLocale={productLocale}
          params={params}
          formAction={APP_ROUTES.storeSearch}
        />
      </StoreShell>
    </div>
  );
}
