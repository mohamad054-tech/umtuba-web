import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "../../components/store/ProductCard";
import StoreEmptyState from "../../components/store/StoreEmptyState";
import StoreErrorState from "../../components/store/StoreErrorState";
import StoreProfileTabs from "../../components/store/StoreProfileTabs";
import StoreShell from "../../components/store/StoreShell";
import { APP_ROUTES } from "../../lib/nav";
import { createClient } from "../../../lib/supabase/server";
import {
  getPublicStoreBySlug,
  listPublicCatalog,
} from "../../../lib/store/catalogQueries";
import { isSafeStoreBrandingUrl } from "../../../lib/store/storeBranding";
import { STOREFRONT_FLAGS } from "../../../lib/store/storefrontFlags";

type StoreProfilePageProps = {
  params: Promise<{ storeSlug: string }>;
};

export async function generateMetadata({ params }: StoreProfilePageProps) {
  const { storeSlug } = await params;
  return {
    title: `${storeSlug} | UMTUBA Store`,
  };
}

export default async function StoreProfilePage({ params }: StoreProfilePageProps) {
  const { storeSlug } = await params;
  const supabase = await createClient();
  const store = await getPublicStoreBySlug(supabase, storeSlug);
  if (!store) notFound();

  const catalog = await listPublicCatalog(supabase, {
    storeSlug: store.slug,
  });

  const verified = store.verification_status === "verified";
  const coverUrl = isSafeStoreBrandingUrl(store.cover_path)
    ? store.cover_path.trim()
    : null;
  const logoUrl = isSafeStoreBrandingUrl(store.logo_path)
    ? store.logo_path.trim()
    : null;

  const productsPanel = catalog.error ? (
    <StoreErrorState message={catalog.error} />
  ) : catalog.items.length === 0 ? (
    <StoreEmptyState
      title="No active products"
      description="This store has no approved active listings yet."
    />
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {catalog.items.map((item) => (
        <ProductCard key={item.product.id} item={item} />
      ))}
    </div>
  );

  const aboutPanel = (
    <div className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
      <h2 className="sf-display text-lg font-semibold tracking-tight">About</h2>
      <p
        dir="auto"
        className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--sf-muted)]"
      >
        {store.description || "This store has not added an about section yet."}
      </p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
        <div className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sf-faint)]">
            Currency
          </dt>
          <dd className="mt-1 font-semibold">{store.default_currency}</dd>
        </div>
        <div className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sf-faint)]">
            Country
          </dt>
          <dd className="mt-1 font-semibold">{store.country_code ?? "—"}</dd>
        </div>
        <div className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sf-faint)]">
            City
          </dt>
          <dd className="mt-1 font-semibold">{store.city ?? "—"}</dd>
        </div>
        <div className="rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--sf-faint)]">
            Contact
          </dt>
          <dd className="mt-1 space-y-0.5 font-semibold">
            {store.public_contact_email || store.public_contact_phone ? (
              <>
                {store.public_contact_email ? (
                  <p className="truncate">{store.public_contact_email}</p>
                ) : null}
                {store.public_contact_phone ? (
                  <p className="truncate">{store.public_contact_phone}</p>
                ) : null}
              </>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );

  return (
    <StoreShell
      title={store.name}
      subtitle="Store"
      actions={
        <Link
          href={APP_ROUTES.store}
          className="watch-focus-ring rounded-full border border-[var(--sf-line)] bg-white/5 px-3 py-1.5 text-xs font-semibold text-[var(--sf-muted)]"
        >
          Store home
        </Link>
      }
    >
      <section className="relative mt-6 overflow-hidden rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)]">
        <div className="relative h-40 overflow-hidden bg-[var(--sf-surface-2)] md:h-56">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div
              className="absolute inset-0"
              aria-hidden
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #12121a 0%, #0a0a10 48%, #1a1712 100%), radial-gradient(circle at 78% 22%, rgba(214,196,161,0.22), transparent 42%)",
              }}
            />
          )}
        </div>

        <div className="relative px-5 pb-6 pt-0 md:px-7">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div
                className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[22px] border border-[rgba(214,196,161,0.4)] bg-[linear-gradient(145deg,rgba(214,196,161,0.28),rgba(255,255,255,0.06))] text-2xl font-semibold text-[var(--sf-accent-strong)] shadow-lg shadow-black/40"
                aria-label={`Logo for ${store.name}`}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  (store.name[0] ?? "U").toUpperCase()
                )}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1
                    dir="auto"
                    className="sf-display text-2xl font-semibold tracking-tight md:text-3xl"
                  >
                    {store.name}
                  </h1>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      verified
                        ? "border border-[rgba(159,214,184,0.35)] bg-[rgba(159,214,184,0.12)] text-[var(--sf-ok)]"
                        : "border border-[var(--sf-line)] bg-white/5 text-[var(--sf-faint)]"
                    }`}
                  >
                    {verified ? "Verified" : "Unverified"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--sf-faint)]">@{store.slug}</p>
                {store.tagline ? (
                  <p dir="auto" className="mt-2 text-sm text-[var(--sf-muted)]">
                    {store.tagline}
                  </p>
                ) : null}
                {STOREFRONT_FLAGS.SHOW_STORE_PROFILE_RATINGS_TAB ? (
                  <p className="mt-2 text-xs text-[var(--sf-faint)]">
                    Ratings not available yet
                  </p>
                ) : null}
              </div>
            </div>

            {STOREFRONT_FLAGS.SHOW_STORE_FOLLOW_UI ? (
              <button
                type="button"
                disabled
                aria-disabled="true"
                title="Follow is not available yet"
                className="cursor-not-allowed rounded-full border border-[var(--sf-line)] bg-white/5 px-5 py-2.5 text-sm font-semibold text-[var(--sf-faint)]"
              >
                Follow
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <StoreProfileTabs products={productsPanel} about={aboutPanel} />
    </StoreShell>
  );
}
