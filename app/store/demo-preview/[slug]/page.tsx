import Link from "next/link";
import { notFound } from "next/navigation";
import StoreEmptyState from "../../../components/store/StoreEmptyState";
import StoreShell from "../../../components/store/StoreShell";
import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import {
  demoCheckoutSandbox,
  describeDemoPdp,
} from "../../../../lib/store/demo/surface";
import { formatMinorUnits } from "../../../../lib/store/money";
import { resolveDemoPreviewAccess } from "../../../../lib/store/demoPreviewAccess";
import { APP_ROUTES } from "../../../lib/nav";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ demo_token?: string }>;
};

export const metadata = {
  title: "Demo product preview | UMTUBA",
  robots: { index: false, follow: false },
};

export default async function StoreDemoProductPreviewPage({
  params,
  searchParams,
}: PageProps) {
  const { slug } = await params;
  const query = (await searchParams) ?? {};
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const access = await resolveDemoPreviewAccess(query.demo_token);

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

  const pdp = describeDemoPdp(slug);
  if (!pdp) notFound();
  const checkout = demoCheckoutSandbox();
  const tokenQs = query.demo_token
    ? `?demo_token=${encodeURIComponent(query.demo_token)}`
    : "";

  return (
    <StoreShell title={pdp.product.title} subtitle={t("store.demo.subtitle")}>
      <p
        role="status"
        className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      >
        <span className="me-2 inline-flex rounded-full border border-amber-300/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {t("store.demo.badge")}
        </span>
        {t("store.demo.banner")}
      </p>
      <p className="mt-4 text-sm text-[var(--sf-muted)]">
        <Link
          href={`/store/demo-preview${tokenQs}`}
          className="font-semibold text-[var(--sf-accent-strong)]"
        >
          ← {t("store.demo.title")}
        </Link>
      </p>
      <h1 className="sf-display mt-4 text-3xl font-semibold">{pdp.product.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--sf-muted)]">
        {pdp.product.description}
      </p>
      <p className="mt-4 text-lg font-semibold text-[var(--sf-accent-strong)]">
        {formatMinorUnits(pdp.product.variants[0]?.priceMinor ?? 0, "USD")}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {pdp.product.variants.map((variant) => (
          <li
            key={variant.id}
            className="rounded-full border border-[var(--sf-line)] px-3 py-1 text-sm"
          >
            {variant.title}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-amber-100">
        {t("store.demo.notPurchasable")} · {t("store.demo.notReal")}
      </p>
      <button
        type="button"
        disabled
        className="sf-btn sf-btn-primary mt-4 opacity-60"
      >
        {t("store.product.addToCart")}
      </button>
      <p className="mt-2 text-sm text-[var(--sf-faint)]">
        {checkout.allowed ? "" : t("store.demo.checkoutBlocked")}
      </p>
    </StoreShell>
  );
}
