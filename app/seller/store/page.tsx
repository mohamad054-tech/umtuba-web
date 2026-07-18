import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  getOwnedOrMemberStore,
  listSellerProducts,
} from "../../../lib/store/sellerStore";
import { createStoreAction, updateStoreAction } from "../../actions/storeCatalog";

export const metadata = {
  title: "Seller Store | UMTUBA",
};

export default async function SellerStorePage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerStore)}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);

  if (!membership) {
    return (
      <main
        className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      >
        <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
          <AppTopNav title="Seller" subtitle="Create store" />
          <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
              Seller
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Create your store
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Set up a storefront to draft products. Checkout is not available
              in this phase.
            </p>
            <form action={createStoreAction} className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Store name
                </span>
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Slug
                </span>
                <input
                  name="slug"
                  placeholder="my-store"
                  pattern="[a-z0-9][a-z0-9-]{1,62}[a-z0-9]"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Description
                </span>
                <textarea
                  name="description"
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Currency
                  </span>
                  <input
                    name="defaultCurrency"
                    defaultValue="USD"
                    maxLength={3}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Country
                  </span>
                  <input
                    name="countryCode"
                    placeholder="US"
                    maxLength={2}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="watch-focus-ring rounded-full bg-white px-5 py-3 text-sm font-black text-black"
              >
                Create store
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  const products = await listSellerProducts(supabase, membership.store.id);
  const draftCount = products.filter((p) => p.status === "draft").length;
  const reviewCount = products.filter((p) => p.status === "in_review").length;
  const activeCount = products.filter((p) => p.status === "active").length;

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title="Seller Store" subtitle={membership.role} />

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            @{membership.store.slug}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">
            {membership.store.name}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Verification: {membership.store.verification_status} · Status:{" "}
            {membership.store.status}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/seller/store/products"
              className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              Manage products
            </Link>
            <Link
              href={`/store/${membership.store.slug}`}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
            >
              View public store
            </Link>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Draft
              </dt>
              <dd className="mt-1 text-2xl font-black">{draftCount}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                In review
              </dt>
              <dd className="mt-1 text-2xl font-black">{reviewCount}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Active
              </dt>
              <dd className="mt-1 text-2xl font-black">{activeCount}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
          <h2 className="text-xl font-black tracking-tight">Store basics</h2>
          <form action={updateStoreAction} className="mt-4 space-y-4">
            <input type="hidden" name="storeId" value={membership.store.id} />
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Name
              </span>
              <input
                name="name"
                required
                defaultValue={membership.store.name}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Description
              </span>
              <textarea
                name="description"
                rows={4}
                defaultValue={membership.store.description ?? ""}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-white px-5 py-3 text-sm font-black text-black"
            >
              Save changes
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
