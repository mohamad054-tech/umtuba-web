import { redirect } from "next/navigation";
import AppTopNav from "../../../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../../../lib/nav";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import { listActiveCategories } from "../../../../../lib/store/catalogQueries";
import { getOwnedOrMemberStore } from "../../../../../lib/store/sellerStore";
import { PRODUCT_TYPES } from "../../../../../lib/store/types";
import { createDraftProductAction } from "../../../../actions/storeCatalog";
import { canManageCatalog } from "../../../../../lib/store/permissions";

export const metadata = {
  title: "New Product | UMTUBA",
};

export default async function NewSellerProductPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent("/seller/store/products/new")}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) redirect(APP_ROUTES.sellerStore);
  if (!canManageCatalog(membership.role)) {
    redirect("/seller/store/products");
  }

  const categories = await listActiveCategories(supabase);

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <AppTopNav title="New product" subtitle="Draft" />

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
          <h1 className="text-2xl font-black tracking-tight">Create draft</h1>
          <p className="mt-2 text-sm text-white/50">
            Products stay in draft until submitted for review. Sellers cannot
            self-activate.
          </p>

          {categories.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              No categories available. Add{" "}
              <code className="text-amber-50">product_categories</code> rows
              before submitting for review.
            </p>
          ) : null}

          <form action={createDraftProductAction} className="mt-6 space-y-4">
            <input type="hidden" name="storeId" value={membership.store.id} />
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Title
              </span>
              <input
                name="title"
                required
                minLength={2}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Slug
              </span>
              <input
                name="slug"
                placeholder="optional"
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Short description
              </span>
              <input
                name="shortDescription"
                maxLength={280}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Description
              </span>
              <textarea
                name="description"
                rows={5}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Type
                </span>
                <select
                  name="productType"
                  defaultValue="physical"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                >
                  {PRODUCT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Category
                </span>
                <select
                  name="categoryId"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  SKU
                </span>
                <input
                  name="sku"
                  placeholder="AUTO"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Price (major)
                </span>
                <input
                  name="priceMajor"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  On hand
                </span>
                <input
                  name="onHand"
                  type="number"
                  min="0"
                  defaultValue="0"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
            </div>
            <input type="hidden" name="currency" value={membership.store.default_currency} />
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-white px-5 py-3 text-sm font-black text-black"
            >
              Create draft
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
