import Link from "next/link";
import StoreEmptyState from "../../components/store/StoreEmptyState";
import StorePageHeader from "../../components/store/StorePageHeader";
import StoreShell from "../../components/store/StoreShell";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { DEMO_CATEGORY_SLUGS } from "../../../lib/store/demo/types";
import { searchDemoCatalog } from "../../../lib/store/demo/surface";
import { formatMinorUnits } from "../../../lib/store/money";
import { resolveDemoPreviewAccess } from "../../../lib/store/demoPreviewAccess";
import { APP_ROUTES } from "../../lib/nav";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    demo_token?: string;
  }>;
};

export const metadata = {
  title: "Demo catalog preview | UMTUBA",
  robots: { index: false, follow: false },
};

export default async function StoreDemoPreviewPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const access = await resolveDemoPreviewAccess(params.demo_token);

  if (!access.ok) {
    return (
      <StoreShell title={t("store.demo.title")} subtitle={t("store.demo.subtitle")}>
        <StoreEmptyState
          title={t("store.demo.deniedTitle")}
          description={t("store.demo.deniedBody")}
          actionHref={APP_ROUTES.store}
          actionLabel={t("store.empty.catalogAction")}
        />
      </StoreShell>
    );
  }

  const category = DEMO_CATEGORY_SLUGS.includes(
    params.category as (typeof DEMO_CATEGORY_SLUGS)[number]
  )
    ? (params.category as (typeof DEMO_CATEGORY_SLUGS)[number])
    : "all";
  const view = searchDemoCatalog({
    q: typeof params.q === "string" ? params.q : "",
    category,
  });
  const tokenQs = params.demo_token
    ? `&demo_token=${encodeURIComponent(params.demo_token)}`
    : "";

  return (
    <StoreShell title={t("store.demo.title")} subtitle={t("store.demo.subtitle")}>
      <p
        role="status"
        className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      >
        <span className="me-2 inline-flex rounded-full border border-amber-300/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {t("store.demo.badge")}
        </span>
        {t("store.demo.banner")}
      </p>
      <StorePageHeader
        eyebrow={t("store.demo.badge")}
        title={t("store.demo.title")}
        description={t("store.demo.notReal")}
      />
      <form className="mt-6 flex flex-wrap gap-3" method="get">
        {params.demo_token ? (
          <input type="hidden" name="demo_token" value={params.demo_token} />
        ) : null}
        <input
          name="q"
          defaultValue={typeof params.q === "string" ? params.q : ""}
          placeholder={t("store.chrome.searchPlaceholder")}
          className="sf-input max-w-sm"
        />
        <select
          name="category"
          defaultValue={category}
          className="sf-select max-w-xs"
        >
          <option value="all">{t("store.search.all")}</option>
          {DEMO_CATEGORY_SLUGS.map((slug) => (
            <option key={slug} value={slug}>
              {slug}
            </option>
          ))}
        </select>
        <button type="submit" className="sf-btn sf-btn-primary">
          {t("store.chrome.searchSubmit")}
        </button>
      </form>
      {view.state === "empty" ? (
        <div className="mt-6">
          <StoreEmptyState
            title={t("store.search.noMatchesTitle")}
            description={t("store.search.noMatchesDescription")}
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {view.items.map((product) => (
            <li key={product.id}>
              <Link
                href={`/store/demo-preview/${product.slug}${tokenQs ? `?${tokenQs.slice(1)}` : ""}`}
                className="watch-focus-ring block rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4"
              >
                <span className="inline-flex rounded-full border border-amber-300/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100">
                  {t("store.demo.badge")}
                </span>
                <h2 className="sf-display mt-3 text-lg font-semibold">{product.title}</h2>
                <p className="mt-2 text-sm text-[var(--sf-muted)]">
                  {product.shortDescription}
                </p>
                <p className="mt-3 text-sm font-semibold text-[var(--sf-accent-strong)]">
                  {formatMinorUnits(product.variants[0]?.priceMinor ?? 0, "USD")}
                </p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-amber-100">
                  {t("store.demo.notPurchasable")}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </StoreShell>
  );
}
