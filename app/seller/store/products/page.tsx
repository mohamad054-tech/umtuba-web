import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  getOwnedOrMemberStore,
  listSellerProducts,
} from "../../../../lib/store/sellerStore";

export const metadata = {
  title: "Seller Products | UMTUBA",
};

export default async function SellerProductsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent("/seller/store/products")}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    redirect(APP_ROUTES.sellerStore);
  }

  const products = await listSellerProducts(supabase, membership.store.id);

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title="Products" subtitle={membership.store.name} />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight">Your products</h1>
          <Link
            href="/seller/store/products/new"
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            New draft
          </Link>
        </div>

        {products.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-white/15 px-4 py-12 text-center text-sm text-white/45">
            No products yet. Create a draft to get started.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {products.map((p) => (
              <li
                key={p.id}
                className="rounded-2xl border border-white/10 bg-[#080816]/80 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black tracking-tight">{p.title}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {p.status} · {p.moderation_status} · {p.product_type}
                    </p>
                  </div>
                  <Link
                    href={`/seller/store/products/${p.id}/edit`}
                    className="text-sm font-bold text-blue-300 hover:text-blue-200"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Link
          href={APP_ROUTES.sellerStore}
          className="mt-8 inline-block text-sm font-bold text-white/50 hover:text-white/80"
        >
          ← Back to store
        </Link>
      </div>
    </main>
  );
}
