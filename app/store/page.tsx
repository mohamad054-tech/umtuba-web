import Link from "next/link";
import { cookies } from "next/headers";
import ApprovedCatalogListing from "../components/store/ApprovedCatalogListing";
import StoreShell from "../components/store/StoreShell";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { LOCALE_COOKIE_NAME } from "../../lib/i18n/cookie";
import { createTranslator } from "../../lib/i18n/translate";
import { APP_ROUTES } from "../lib/nav";
import { loadApprovedCustomerStorefront } from "../../lib/store/approvedCatalog/loadCustomerStorefront";
import { resolveStoreProductLocale } from "../../lib/store/productLocalization/resolveStoreProductLocale";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Store | UMTUBA",
  description: "Browse the UMTUBA Store catalog.",
};

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
        title={t("store.chrome.title")}
        subtitle={t("store.live.subtitle")}
        locale={chromeLocale}
      >
        <ApprovedCatalogListing
          items={storefront.items}
          visibleCount={storefront.visibleCount}
          chromeLocale={chromeLocale}
          productLocale={productLocale}
          params={params}
          formAction={APP_ROUTES.store}
        />
        <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sf-line)] pt-7">
          <Link
            href={APP_ROUTES.storeSearch}
            className="text-sm font-semibold text-[var(--sf-accent-strong)] transition hover:text-[var(--sf-accent)]"
          >
            {t("store.chrome.catalog")} →
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={APP_ROUTES.storeWishlist}
              className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
            >
              {t("store.chrome.favorites")}
            </Link>
            <Link
              href={APP_ROUTES.storeCart}
              className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
            >
              {t("store.chrome.cart")}
            </Link>
            <Link
              href={APP_ROUTES.seller}
              className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
            >
              {t("store.chrome.shop")}
            </Link>
          </div>
        </div>
      </StoreShell>
    </div>
  );
}
