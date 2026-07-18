import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppTopNav from "../../../../../components/AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../../../../lib/nav";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import { listActiveCategories } from "../../../../../../lib/store/catalogQueries";
import { canManageCatalog } from "../../../../../../lib/store/permissions";
import { getSellerProductBundle } from "../../../../../../lib/store/sellerStore";
import { PRODUCT_TYPES } from "../../../../../../lib/store/types";
import { formatMinorUnits } from "../../../../../../lib/store/money";
import {
  archiveProductAction,
  attachMediaMetadataAction,
  submitProductReviewAction,
  updateDraftProductAction,
  upsertVariantAction,
} from "../../../../../actions/storeCatalog";

type EditPageProps = {
  params: Promise<{ productId: string }>;
};

export const metadata = {
  title: "Edit Product | UMTUBA",
};

export default async function EditSellerProductPage({ params }: EditPageProps) {
  const { productId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(`/seller/store/products/${productId}/edit`)}`
    );
  }

  const supabase = await createClient();
  const bundle = await getSellerProductBundle(supabase, user.id, productId);
  if (!bundle.ok) {
    if (bundle.message.includes("not found")) notFound();
    redirect("/seller/store/products");
  }

  const categories = await listActiveCategories(supabase);
  const canEdit = canManageCatalog(bundle.role);
  const primary = bundle.variants[0];

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6">
        <AppTopNav title="Edit product" subtitle={bundle.product.status} />

        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/seller/store/products"
            className="font-bold text-blue-300 hover:text-blue-200"
          >
            ← Products
          </Link>
          <span className="text-white/40">
            {bundle.product.moderation_status}
          </span>
        </div>

        {!canEdit ? (
          <p className="mt-6 rounded-2xl border border-white/15 px-4 py-6 text-sm text-white/50">
            Viewer role is read-only.
          </p>
        ) : null}

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
          <h1 className="text-2xl font-black tracking-tight">
            {bundle.product.title}
          </h1>
          <form action={updateDraftProductAction} className="mt-5 space-y-4">
            <input type="hidden" name="productId" value={bundle.product.id} />
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Title
              </span>
              <input
                name="title"
                required
                defaultValue={bundle.product.title}
                disabled={!canEdit}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Slug
              </span>
              <input
                name="slug"
                defaultValue={bundle.product.slug}
                disabled={!canEdit}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Short description
              </span>
              <input
                name="shortDescription"
                defaultValue={bundle.product.short_description ?? ""}
                disabled={!canEdit}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Description
              </span>
              <textarea
                name="description"
                rows={5}
                defaultValue={bundle.product.description ?? ""}
                disabled={!canEdit}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Type
                </span>
                <select
                  name="productType"
                  defaultValue={bundle.product.product_type}
                  disabled={!canEdit}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
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
                  defaultValue={bundle.product.primary_category_id ?? ""}
                  disabled={!canEdit}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40 disabled:opacity-50"
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
            {canEdit ? (
              <button
                type="submit"
                className="watch-focus-ring rounded-full bg-white px-5 py-3 text-sm font-black text-black"
              >
                Save product
              </button>
            ) : null}
          </form>
        </section>

        {canEdit && primary ? (
          <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
            <h2 className="text-xl font-black tracking-tight">
              Variant / price / inventory
            </h2>
            <p className="mt-2 text-sm text-white/45">
              Current:{" "}
              {primary.price
                ? formatMinorUnits(primary.price.amount_minor, primary.price.currency)
                : "no price"}
            </p>
            <form action={upsertVariantAction} className="mt-4 space-y-4">
              <input type="hidden" name="productId" value={bundle.product.id} />
              <input type="hidden" name="variantId" value={primary.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    SKU
                  </span>
                  <input
                    name="sku"
                    required
                    defaultValue={primary.sku}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Variant title
                  </span>
                  <input
                    name="variantTitle"
                    defaultValue={primary.title}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Price (major)
                  </span>
                  <input
                    name="priceMajor"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={
                      primary.price
                        ? (primary.price.amount_minor / 100).toFixed(2)
                        : "0"
                    }
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
                    defaultValue={primary.inventory?.on_hand ?? 0}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Safety stock
                  </span>
                  <input
                    name="safetyStock"
                    type="number"
                    min="0"
                    defaultValue={primary.inventory?.safety_stock ?? 0}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  name="allowBackorder"
                  defaultChecked={primary.inventory?.allow_backorder ?? false}
                />
                Allow backorder
              </label>
              <button
                type="submit"
                className="watch-focus-ring rounded-full bg-white px-5 py-3 text-sm font-black text-black"
              >
                Save variant
              </button>
            </form>
          </section>
        ) : null}

        {canEdit ? (
          <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
            <h2 className="text-xl font-black tracking-tight">Media metadata</h2>
            <p className="mt-2 text-sm text-white/45">
              Binary upload is deferred. Store a relative storage path for now
              (TODO: owned-folder Storage upload).
            </p>
            {bundle.media.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm text-white/60">
                {bundle.media.map((m) => (
                  <li key={m.id}>
                    {m.role}: {m.storage_path}
                  </li>
                ))}
              </ul>
            ) : null}
            <form action={attachMediaMetadataAction} className="mt-4 space-y-4">
              <input type="hidden" name="productId" value={bundle.product.id} />
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Storage path
                </span>
                <input
                  name="storagePath"
                  required
                  placeholder="store/products/cover.jpg"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Type
                  </span>
                  <select
                    name="mediaType"
                    defaultValue="image"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                  >
                    <option value="image">image</option>
                    <option value="video">video</option>
                    <option value="document">document</option>
                  </select>
                </label>
                <label className="block space-y-2">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    Role
                  </span>
                  <select
                    name="role"
                    defaultValue="cover"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                  >
                    <option value="cover">cover</option>
                    <option value="gallery">gallery</option>
                    <option value="detail">detail</option>
                    <option value="swatch">swatch</option>
                  </select>
                </label>
              </div>
              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  Alt text
                </span>
                <input
                  name="altText"
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 outline-none focus:border-blue-400/40"
                />
              </label>
              <button
                type="submit"
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white"
              >
                Attach metadata
              </button>
            </form>
          </section>
        ) : null}

        {canEdit ? (
          <section className="mt-6 flex flex-wrap gap-3">
            <form action={submitProductReviewAction}>
              <input type="hidden" name="productId" value={bundle.product.id} />
              <button
                type="submit"
                className="watch-focus-ring rounded-full bg-white px-5 py-3 text-sm font-black text-black"
              >
                Submit for review
              </button>
            </form>
            <form action={archiveProductAction}>
              <input type="hidden" name="productId" value={bundle.product.id} />
              <button
                type="submit"
                className="watch-focus-ring rounded-full border border-red-400/30 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-100"
              >
                Archive
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
