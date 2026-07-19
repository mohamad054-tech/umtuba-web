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
    <div className="rounded-[24px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
      <h2 className="text-lg font-black tracking-tight">About</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/60">
        {store.description || "This store has not added an about section yet."}
      </p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Currency
          </dt>
          <dd className="mt-1 font-bold">{store.default_currency}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Country
          </dt>
          <dd className="mt-1 font-bold">{store.country_code ?? "—"}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            City
          </dt>
          <dd className="mt-1 font-bold">{store.city ?? "—"}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Contact
          </dt>
          <dd className="mt-1 space-y-0.5 font-bold">
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
          className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70"
        >
          Store home
        </Link>
      }
    >
      <section className="relative mt-6 overflow-hidden rounded-[28px] border border-violet-400/20 bg-[#080816]/85">
        <div className="relative h-40 bg-gradient-to-r from-violet-800/50 via-[#0a0a18] to-fuchsia-900/40 md:h-56">
          <div
            className="absolute inset-0 opacity-40"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(167,139,250,0.45), transparent 45%), radial-gradient(circle at 80% 60%, rgba(217,70,239,0.25), transparent 40%)",
            }}
          />
          {store.cover_path ? (
            <p className="absolute bottom-3 left-4 text-xs text-white/50">
              Cover: {store.cover_path}
            </p>
          ) : (
            <p className="absolute bottom-3 left-4 text-xs uppercase tracking-[0.2em] text-white/35">
              Cover imagery
            </p>
          )}
        </div>

        <div className="relative px-5 pb-6 pt-0 md:px-7">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-[22px] border border-violet-300/40 bg-gradient-to-br from-violet-600 to-fuchsia-700 text-2xl font-black shadow-lg shadow-violet-900/40"
                aria-label={`Logo for ${store.name}`}
              >
                {store.logo_path ? (
                  <span className="sr-only">{store.logo_path}</span>
                ) : null}
                {(store.name[0] ?? "U").toUpperCase()}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight md:text-3xl">
                    {store.name}
                  </h1>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      verified
                        ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
                        : "border border-white/15 bg-white/5 text-white/45"
                    }`}
                  >
                    {verified ? "Verified" : "Verified soon"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/45">@{store.slug}</p>
                <p className="mt-2 text-xs text-white/40">
                  Followers placeholder · Ratings placeholder
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Follow coming next"
              className="cursor-not-allowed rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/40"
            >
              Follow
            </button>
          </div>
        </div>
      </section>

      <StoreProfileTabs products={productsPanel} about={aboutPanel} />
    </StoreShell>
  );
}
