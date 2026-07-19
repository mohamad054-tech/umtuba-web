import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  getOwnedOrMemberStore,
  listSellerProducts,
} from "../../../lib/store/sellerStore";
import { updateStoreAction } from "../../actions/storeCatalog";

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
    redirect(APP_ROUTES.sellerSetup);
  }

  const products = await listSellerProducts(supabase, membership.store.id);
  const draftCount = products.filter((p) => p.status === "draft").length;
  const reviewCount = products.filter(
    (p) => p.status === "in_review" || p.status === "pending_review"
  ).length;
  const activeCount = products.filter((p) => p.status === "active").length;
  const verified = membership.store.verification_status === "verified";

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

          {!verified ? (
            <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Your store is not verified yet — an operator reviews new
              applications before catalog management unlocks.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/seller/store/products"
              className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              Manage products
            </Link>
            <Link
              href={APP_ROUTES.sellerOrders}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
            >
              Orders
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
          <h2 className="text-xl font-black tracking-tight">Store settings</h2>
          <p className="mt-2 text-sm text-white/45">
            City and public contact details show on your storefront&apos;s
            About tab.
          </p>
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
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                City
              </span>
              <input
                name="city"
                defaultValue={membership.store.city ?? ""}
                maxLength={80}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Contact email
                </span>
                <input
                  name="publicContactEmail"
                  type="email"
                  defaultValue={membership.store.public_contact_email ?? ""}
                  maxLength={160}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Contact phone
                </span>
                <input
                  name="publicContactPhone"
                  defaultValue={membership.store.public_contact_phone ?? ""}
                  maxLength={40}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Contact link
              </span>
              <input
                name="publicContactUrl"
                placeholder="https://…"
                defaultValue={membership.store.public_contact_url ?? ""}
                maxLength={300}
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
