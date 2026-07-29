import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SellerOpsShell from "../../../../../components/store/SellerOpsShell";
import SellerProductMediaStudio from "../../../../../components/store/SellerProductMediaStudio";
import { APP_ROUTES } from "../../../../../lib/nav";
import { createClient, getServerUser } from "../../../../../../lib/supabase/server";
import { listActiveCategories } from "../../../../../../lib/store/catalogQueries";
import { canManageCatalog } from "../../../../../../lib/store/permissions";
import { createAuthorizedProductMediaSignedUrl } from "../../../../../../lib/store/productMediaUrl";
import {
  canSellerArchiveProduct,
  canSellerEditProductFields,
  canSellerEditVariants,
  canSellerSubmitForReview,
  sellerModerationLabel,
  sellerProductStatusLabel,
  sellerPublishingWorkflowSteps,
  sellerSeoPreview,
} from "../../../../../../lib/store/sellerCatalogPresentation";
import { productEditorInventoryAlignmentCopy } from "../../../../../../lib/store/sellerInventoryPresentation";
import { getOwnedOrMemberStore, getSellerProductBundle } from "../../../../../../lib/store/sellerStore";
import { PRODUCT_TYPES } from "../../../../../../lib/store/types";
import { formatMinorUnits } from "../../../../../../lib/store/money";
import {
  archiveProductAction,
  submitProductReviewAction,
  updateDraftProductAction,
  updateProductMarketplaceEligibilityAction,
  upsertVariantAction,
} from "../../../../../actions/storeCatalog";
import {
  collectProductMarketplaceBlockers,
  explainMarketplaceProductToggle,
} from "../../../../../../lib/store/marketplaceEligibility";
import { countActiveListingsForProduct } from "../../../../../../lib/store/marketplaceSupplierSellerQueries";

type EditPageProps = {
  params: Promise<{ productId: string }>;
  searchParams?: Promise<{ error?: string }> | { error?: string };
};

export const metadata = {
  title: "Edit Product | UMTUBA",
};

export default async function EditSellerProductPage({
  params,
  searchParams,
}: EditPageProps) {
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
  const canEditRole = canManageCatalog(bundle.role);
  const canEditFields =
    canEditRole && canSellerEditProductFields(bundle.product.status);
  const canEditVariants =
    canEditRole && canSellerEditVariants(bundle.product.status);
  const canSubmit =
    canEditRole && canSellerSubmitForReview(bundle.product.status);
  const canArchive =
    canEditRole && canSellerArchiveProduct(bundle.product.status);

  const mediaPreviews = await Promise.all(
    bundle.media.map(async (m) => ({
      ...m,
      mediaUrl: await createAuthorizedProductMediaSignedUrl(supabase, {
        storagePath: m.storage_path,
        productId: bundle.product.id,
        storeId: bundle.product.store_id,
        userId: user.id,
      }),
    }))
  );

  const membership = await getOwnedOrMemberStore(supabase, user.id);
  const activeListingCount = await countActiveListingsForProduct(
    supabase,
    bundle.product.id
  );
  const primaryPrice = bundle.variants[0]?.price ?? null;
  const eligibilityBlockers = collectProductMarketplaceBlockers({
    marketplaceSupplierEnabled: Boolean(
      membership?.store.marketplace_supplier_enabled
    ),
    supplierStoreStatus: membership?.store.status ?? "inactive",
    supplierVerificationStatus:
      membership?.store.verification_status ?? "unverified",
    marketplaceEligible: Boolean(bundle.product.marketplace_eligible),
    productStatus: bundle.product.status,
    moderationStatus: bundle.product.moderation_status,
    priceAmountMinor: primaryPrice
      ? Number(primaryPrice.amount_minor)
      : null,
    priceCurrency: primaryPrice ? String(primaryPrice.currency) : null,
  });

  const workflow = sellerPublishingWorkflowSteps({
    status: bundle.product.status,
    moderationStatus: bundle.product.moderation_status,
  });
  const seo = sellerSeoPreview({
    title: bundle.product.title,
    shortDescription: bundle.product.short_description,
    slug: bundle.product.slug,
  });
  const inventoryAlignment = productEditorInventoryAlignmentCopy();
  const query = await Promise.resolve(searchParams ?? {});
  const error =
    typeof query.error === "string" && query.error.trim()
      ? query.error.trim()
      : null;
  const selectedCategory = categories.find(
    (c) => c.id === bundle.product.primary_category_id
  );

  return (
    <SellerOpsShell
      title="Product workspace"
      subtitle={sellerProductStatusLabel(bundle.product.status)}
      wide
    >
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <Link
          href="/seller/store/products"
          className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
        >
          ← Products
        </Link>
        <Link
          href={APP_ROUTES.sellerStore}
          className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
        >
          Dashboard
        </Link>
        <Link
          href={APP_ROUTES.sellerInventory}
          className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
        >
          Inventory
        </Link>
        <Link
          href={APP_ROUTES.sellerOrders}
          className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
        >
          Orders
        </Link>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)] px-4 py-3 text-sm text-[var(--sf-danger)]"
        >
          {error}
        </p>
      ) : null}

      {bundle.product.review_note ? (
        <div
          role="status"
          className="mt-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50"
        >
          <p className="font-bold">Operator note</p>
          <p className="mt-1 text-amber-50/85">{bundle.product.review_note}</p>
        </div>
      ) : null}

      <header className="mt-6 rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">{bundle.product.product_type}</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          {bundle.product.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--sf-faint)]">
          /{bundle.product.slug} · {sellerModerationLabel(bundle.product.moderation_status)}
        </p>
        <ol className="mt-5 flex flex-wrap gap-2" aria-label="Publishing workflow">
          {workflow.map((step) => (
            <li
              key={step.id}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                step.state === "current"
                  ? "border-[var(--sf-accent)] bg-[var(--sf-accent)] text-[#1a1712]"
                  : step.state === "done"
                    ? "border-[var(--sf-line)] text-[var(--sf-ok)]"
                    : "border-[var(--sf-line)] text-[var(--sf-faint)]"
              }`}
            >
              {step.label}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-[var(--sf-faint)]">
          Trusted lifecycle only. “Published” means status <code>active</code>{" "}
          with approved moderation. Sellers submit for review; operators
          activate.
        </p>
      </header>

      {!canEditRole ? (
        <p className="mt-6 rounded-2xl border border-[var(--sf-line)] px-4 py-6 text-sm text-[var(--sf-faint)]">
          Viewer role is read-only.
        </p>
      ) : null}

      <section className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Product details
        </h2>
        <form action={updateDraftProductAction} className="mt-5 space-y-4">
          <input type="hidden" name="productId" value={bundle.product.id} />
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Title
            </span>
            <input
              name="title"
              required
              defaultValue={bundle.product.title}
              disabled={!canEditFields}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)] disabled:opacity-50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Slug
            </span>
            <input
              name="slug"
              defaultValue={bundle.product.slug}
              disabled={!canEditFields}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)] disabled:opacity-50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Short description
            </span>
            <input
              name="shortDescription"
              defaultValue={bundle.product.short_description ?? ""}
              disabled={!canEditFields}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)] disabled:opacity-50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Description
            </span>
            <textarea
              name="description"
              rows={6}
              defaultValue={bundle.product.description ?? ""}
              disabled={!canEditFields}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)] disabled:opacity-50"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                Type
              </span>
              <select
                name="productType"
                defaultValue={bundle.product.product_type}
                disabled={!canEditFields}
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)] disabled:opacity-50"
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
                defaultValue={bundle.product.primary_category_id ?? ""}
                disabled={!canEditFields}
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)] disabled:opacity-50"
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
          {canEditFields ? (
            <div className="sticky bottom-3 z-10 rounded-2xl border border-[var(--sf-line)] bg-[var(--sf-surface-2)]/95 p-3 backdrop-blur-md">
              <button
                type="submit"
                className="watch-focus-ring rounded-full bg-[var(--sf-accent)] px-5 py-3 text-sm font-bold text-[#1a1712]"
              >
                Save product
              </button>
            </div>
          ) : (
            <p className="text-sm text-[var(--sf-faint)]">
              Product fields are locked for this status. Archive or wait for
              operator return-to-draft if changes are needed.
            </p>
          )}
        </form>
      </section>

      <section className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Marketplace eligibility
        </h2>
        <p className="mt-2 text-sm text-[var(--sf-muted)]">
          {explainMarketplaceProductToggle()}
        </p>
        <p className="mt-3 text-sm text-[var(--sf-ink)]">
          Active seller listings referencing this product:{" "}
          <span className="font-semibold">{activeListingCount}</span>
        </p>
        {eligibilityBlockers.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-[var(--sf-danger)]" role="status">
            {eligibilityBlockers.map((b) => (
              <li key={b.code}>• {b.message}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-[var(--sf-ok)]" role="status">
            No eligibility blockers detected for discovery gates.
          </p>
        )}
        {canEditRole ? (
          <form
            action={updateProductMarketplaceEligibilityAction}
            className="mt-4 space-y-3"
          >
            <input type="hidden" name="productId" value={bundle.product.id} />
            <label className="flex items-start gap-3 rounded-2xl border border-[var(--sf-line)] bg-black/25 p-4">
              <input
                type="checkbox"
                name="marketplaceEligible"
                defaultChecked={Boolean(bundle.product.marketplace_eligible)}
                className="mt-1 h-4 w-4 rounded border-[var(--sf-line)]"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Mark marketplace-eligible
                </span>
                <span className="mt-1 block text-xs text-[var(--sf-muted)]">
                  Sellers cannot change your product truth, prices, or inventory.
                  Store marketplace participation must also be enabled.
                </span>
              </span>
            </label>
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-[var(--sf-accent)] px-5 py-3 text-sm font-bold text-[#1a1712]"
            >
              Save eligibility
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Collections & category
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
          Seller-managed collection entities are not part of the trusted catalog
          contract. Assign or change the primary category above — storefront
          curated collections derive from categories.
        </p>
        <p className="mt-3 text-sm text-[var(--sf-ink)]">
          Current category:{" "}
          <span className="font-semibold">
            {selectedCategory?.name ?? "None selected"}
          </span>
        </p>
      </section>

      <section className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          SEO preview
        </h2>
        <p className="mt-2 text-sm text-[var(--sf-muted)]">{seo.note}</p>
        <div className="mt-4 rounded-2xl border border-[var(--sf-line)] bg-black/30 p-4">
          <p className="text-base font-semibold text-[var(--sf-accent-strong)]">
            {seo.title}
          </p>
          <p className="mt-1 text-xs text-[var(--sf-faint)]">
            /store/…/{bundle.product.slug}
          </p>
          <p className="mt-2 text-sm text-[var(--sf-muted)]">{seo.description}</p>
        </div>
      </section>

      <section className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Variants
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
          Uses trusted variant / price / inventory contracts. Color, size, and
          capacity map to option values. Barcode is not in the trusted schema.
        </p>
        <div className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100/80">
            {inventoryAlignment.eyebrow}
          </p>
          <p className="mt-1 text-amber-50/90">{inventoryAlignment.body}</p>
          <p className="mt-2 text-xs text-amber-100/75">
            {inventoryAlignment.reservedNote}
          </p>
          <Link
            href={`${APP_ROUTES.sellerInventory}?variant=${bundle.variants[0]?.id ?? ""}`}
            className="mt-3 inline-block text-sm font-semibold text-[var(--sf-accent-strong)]"
          >
            Open inventory workspace →
          </Link>
        </div>

        <ul className="mt-4 space-y-3">
          {bundle.variants.map((variant) => (
            <li
              key={variant.id}
              className="rounded-2xl border border-[var(--sf-line)] bg-black/20 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{variant.title}</p>
                  <p className="mt-1 text-xs text-[var(--sf-faint)]">
                    {variant.sku} · {variant.status}
                    {Object.keys(variant.option_values).length > 0
                      ? ` · ${Object.entries(variant.option_values)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}`
                      : ""}
                  </p>
                  <p className="mt-2 text-xs text-[var(--sf-muted)]">
                    Reserved (system): {variant.inventory?.reserved ?? "—"} ·{" "}
                    <Link
                      href={`${APP_ROUTES.sellerInventory}?variant=${variant.id}`}
                      className="font-semibold text-[var(--sf-accent)]"
                    >
                      Inventory detail
                    </Link>
                  </p>
                </div>
                <p className="text-sm font-semibold text-[var(--sf-accent-strong)]">
                  {variant.price
                    ? formatMinorUnits(
                        variant.price.amount_minor,
                        variant.price.currency
                      )
                    : "No price"}
                </p>
              </div>

              {canEditVariants ? (
                <form action={upsertVariantAction} className="mt-4 space-y-3">
                  <input type="hidden" name="productId" value={bundle.product.id} />
                  <input type="hidden" name="variantId" value={variant.id} />
                  <input
                    type="hidden"
                    name="currency"
                    value={variant.price?.currency ?? "USD"}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                        SKU
                      </span>
                      <input
                        name="sku"
                        required
                        defaultValue={variant.sku}
                        className="w-full rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                        Variant title
                      </span>
                      <input
                        name="variantTitle"
                        defaultValue={variant.title}
                        className="w-full rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                        Color
                      </span>
                      <input
                        name="optionColor"
                        defaultValue={variant.option_values.Color ?? ""}
                        className="w-full rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                        Size
                      </span>
                      <input
                        name="optionSize"
                        defaultValue={variant.option_values.Size ?? ""}
                        className="w-full rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                        Capacity
                      </span>
                      <input
                        name="optionCapacity"
                        defaultValue={variant.option_values.Capacity ?? ""}
                        className="w-full rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
                      />
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                        Price
                      </span>
                      <input
                        name="priceMajor"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={
                          variant.price
                            ? (variant.price.amount_minor / 100).toFixed(2)
                            : "0"
                        }
                        className="w-full rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                        Compare-at
                      </span>
                      <input
                        name="compareAtMajor"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={
                          variant.price?.compare_at_amount_minor != null
                            ? (
                                variant.price.compare_at_amount_minor / 100
                              ).toFixed(2)
                            : ""
                        }
                        className="w-full rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                        On hand (seed)
                      </span>
                      <input
                        name="onHand"
                        type="number"
                        min="0"
                        defaultValue={variant.inventory?.on_hand ?? 0}
                        className="w-full rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
                      />
                    </label>
                    <div className="block space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                        Reserved (system)
                      </span>
                      <p className="rounded-xl border border-[var(--sf-line)] bg-black/20 p-3 text-sm text-[var(--sf-muted)]">
                        {variant.inventory?.reserved ?? 0}
                      </p>
                    </div>
                  </div>
                  <label className="block space-y-1 sm:max-w-xs">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                      Safety stock
                    </span>
                    <input
                      name="safetyStock"
                      type="number"
                      min="0"
                      defaultValue={variant.inventory?.safety_stock ?? 0}
                      className="w-full rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[var(--sf-muted)]">
                    <input
                      type="checkbox"
                      name="allowBackorder"
                      defaultChecked={variant.inventory?.allow_backorder ?? false}
                    />
                    Allow backorder
                  </label>
                  <button
                    type="submit"
                    className="watch-focus-ring rounded-full bg-[var(--sf-accent)] px-4 py-2 text-sm font-bold text-[#1a1712]"
                  >
                    Save variant
                  </button>
                </form>
              ) : (
                <p className="mt-3 text-sm text-[var(--sf-faint)]">
                  Variant stock seed edits are locked for this product status.
                  Use{" "}
                  <Link
                    href={`${APP_ROUTES.sellerInventory}?variant=${variant.id}`}
                    className="font-semibold text-[var(--sf-accent)]"
                  >
                    Inventory
                  </Link>{" "}
                  for visibility. No movement ledger is available to sellers.
                </p>
              )}
            </li>
          ))}
        </ul>

        {canEditVariants ? (
          <form
            action={upsertVariantAction}
            className="mt-6 space-y-3 rounded-2xl border border-dashed border-[var(--sf-line)] p-4"
          >
            <h3 className="text-sm font-semibold">Add variant</h3>
            <input type="hidden" name="productId" value={bundle.product.id} />
            <input type="hidden" name="currency" value="USD" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="sku"
                required
                placeholder="SKU"
                className="rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
              <input
                name="variantTitle"
                placeholder="Variant title"
                className="rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                name="optionColor"
                placeholder="Color"
                className="rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
              <input
                name="optionSize"
                placeholder="Size"
                className="rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
              <input
                name="optionCapacity"
                placeholder="Capacity"
                className="rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                name="priceMajor"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
                placeholder="Price"
                className="rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
              <input
                name="compareAtMajor"
                type="number"
                step="0.01"
                min="0"
                placeholder="Compare-at"
                className="rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
              <input
                name="onHand"
                type="number"
                min="0"
                defaultValue="0"
                placeholder="On hand"
                className="rounded-xl border border-[var(--sf-line)] bg-black/40 p-3 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
            </div>
            <button
              type="submit"
              className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold"
            >
              Add variant
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Media
        </h2>
        <div className="mt-4">
          <SellerProductMediaStudio
            productId={bundle.product.id}
            storeId={bundle.product.store_id}
            media={mediaPreviews}
            canEdit={canEditRole}
          />
        </div>
      </section>

      {canEditRole ? (
        <section className="mt-6 flex flex-wrap gap-3 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
          {canSubmit ? (
            <form action={submitProductReviewAction}>
              <input type="hidden" name="productId" value={bundle.product.id} />
              <button
                type="submit"
                className="watch-focus-ring rounded-full bg-[var(--sf-accent)] px-5 py-3 text-sm font-bold text-[#1a1712]"
              >
                Submit for review
              </button>
            </form>
          ) : null}
          {canArchive ? (
            <form action={archiveProductAction}>
              <input type="hidden" name="productId" value={bundle.product.id} />
              <button
                type="submit"
                className="watch-focus-ring rounded-full border border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)] px-5 py-3 text-sm font-bold text-[var(--sf-danger)]"
              >
                Archive
              </button>
            </form>
          ) : null}
          <p className="w-full text-xs leading-relaxed text-[var(--sf-faint)]">
            No AI publish path. Inventory reserved holds and payment are not
            mutated here. Shipping Network is out of scope.
          </p>
        </section>
      ) : null}
    </SellerOpsShell>
  );
}
