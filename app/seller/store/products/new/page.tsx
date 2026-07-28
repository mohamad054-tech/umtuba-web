import Link from "next/link";
import { redirect } from "next/navigation";
import SellerOpsShell from "../../../../components/store/SellerOpsShell";
import { APP_ROUTES } from "../../../../lib/nav";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import { listActiveCategories } from "../../../../../lib/store/catalogQueries";
import { getOwnedOrMemberStore } from "../../../../../lib/store/sellerStore";
import { PRODUCT_TYPES } from "../../../../../lib/store/types";
import { createDraftProductAction } from "../../../../actions/storeCatalog";
import { canManageCatalog } from "../../../../../lib/store/permissions";

export const metadata = {
  title: "New Product | UMTUBA",
};

type PageProps = {
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export default async function NewSellerProductPage({ searchParams }: PageProps) {
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
  const params = await Promise.resolve(searchParams ?? {});
  const error =
    typeof params.error === "string" && params.error.trim()
      ? params.error.trim()
      : null;

  return (
    <SellerOpsShell title="New product" subtitle="Draft" wide>
      <div className="mt-4">
        <Link
          href="/seller/store/products"
          className="text-sm font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
        >
          ← Products
        </Link>
      </div>

      <section className="mt-6 rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">Create</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight">
          New product draft
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
          Starts as draft with a default variant, price, and inventory row.
          Submit for review from the editor when ready — sellers cannot
          self-publish.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)] px-4 py-3 text-sm text-[var(--sf-danger)]"
          >
            {error}
          </p>
        ) : null}

        {categories.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            No categories available. Add a primary category before submitting
            for review.
          </p>
        ) : null}

        <form action={createDraftProductAction} className="mt-6 space-y-4">
          <input type="hidden" name="storeId" value={membership.store.id} />
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Title
            </span>
            <input
              name="title"
              required
              minLength={2}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Slug
            </span>
            <input
              name="slug"
              placeholder="optional"
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Short description
            </span>
            <input
              name="shortDescription"
              maxLength={280}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Description
            </span>
            <textarea
              name="description"
              rows={5}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                Type
              </span>
              <select
                name="productType"
                defaultValue="physical"
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                Category
              </span>
              <select
                name="categoryId"
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
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
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                SKU
              </span>
              <input
                name="sku"
                placeholder="AUTO"
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                Price (major)
              </span>
              <input
                name="priceMajor"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                On hand
              </span>
              <input
                name="onHand"
                type="number"
                min="0"
                defaultValue="0"
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
            </label>
          </div>
          <input
            type="hidden"
            name="currency"
            value={membership.store.default_currency}
          />
          <div className="sticky bottom-3 z-10 rounded-2xl border border-[var(--sf-line)] bg-[var(--sf-surface-2)]/95 p-3 backdrop-blur-md">
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-[var(--sf-accent)] px-5 py-3 text-sm font-bold text-[#1a1712]"
            >
              Create draft
            </button>
          </div>
        </form>
      </section>
    </SellerOpsShell>
  );
}
