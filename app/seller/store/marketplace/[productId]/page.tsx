import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import SellerOpsShell from "../../../../components/store/SellerOpsShell";
import { APP_ROUTES } from "../../../../lib/nav";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import { formatMinorUnits } from "../../../../../lib/store/money";
import { sellerListingPricingControl } from "../../../../../lib/store/marketplaceSupplierSeller";
import { getMarketplaceProductDetailForSeller } from "../../../../../lib/store/marketplaceSupplierSellerQueries";
import { addToMyStoreAction } from "../../../../actions/storeMarketplace";
import { canManageCatalog, canViewStore } from "../../../../../lib/store/permissions";
import { getOwnedOrMemberStore } from "../../../../../lib/store/sellerStore";

export const metadata = {
  title: "Marketplace product | Seller Store | UMTUBA",
};

type PageProps = {
  params: Promise<{ productId: string }> | { productId: string };
};

export default async function SellerMarketplaceProductPage({ params }: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerMarketplace)}`);
  }

  const { productId } = await Promise.resolve(params);
  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) redirect(APP_ROUTES.sellerSetup);
  if (!canViewStore(membership.role)) redirect(APP_ROUTES.seller);

  const detail = await getMarketplaceProductDetailForSeller(supabase, {
    productId,
    sellerStoreId: membership.store.id,
  });
  if (!detail.ok) notFound();

  const { item } = detail.data;
  const pricing = sellerListingPricingControl();
  const canManage = canManageCatalog(membership.role);
  const price =
    item.priceMinor != null && item.currency
      ? formatMinorUnits(item.priceMinor, item.currency)
      : "Price unavailable";

  return (
    <SellerOpsShell
      title="Supplier product"
      subtitle={item.supplier.name}
      wide
      actions={
        <Link
          href={APP_ROUTES.sellerMarketplace}
          className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold"
        >
          Back to marketplace
        </Link>
      }
    >
      <article className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-black/40">
          {item.coverUrl ? (
            <Image
              src={item.coverUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--sf-faint)]">
              No media
            </div>
          )}
        </div>
        <div className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
          <p className="sf-eyebrow">Supplier ֲ· {item.supplier.name}</p>
          <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight">
            {item.title}
          </h1>
          {item.shortDescription ? (
            <p className="mt-3 text-sm leading-relaxed text-[var(--sf-muted)]">
              {item.shortDescription}
            </p>
          ) : null}
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--sf-faint)]">Trusted offer</dt>
              <dd className="font-semibold text-[var(--sf-accent-strong)]">
                {price}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--sf-faint)]">Availability</dt>
              <dd>
                {item.availabilityKnown
                  ? (item.available ?? 0) > 0
                    ? `${item.available} available`
                    : "Unavailable"
                  : "Unknown ג€” fail closed at checkout"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--sf-faint)]">Fulfillment</dt>
              <dd>Not assumed ג€” unresolved unless trusted contracts set party</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--sf-faint)]">Seller pricing</dt>
              <dd>Read-only canonical offer</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-[var(--sf-faint)]">
            {pricing.message} No sales projections or earnings are shown.
          </p>
          {canManage ? (
            <form action={async (formData) => { await addToMyStoreAction(formData); }} className="mt-6">
              <input type="hidden" name="source_product_id" value={item.productId} />
              <button
                type="submit"
                className="watch-focus-ring w-full rounded-full border border-[rgba(106,76,255,0.45)] bg-[rgba(106,76,255,0.12)] px-5 py-3 text-sm font-bold text-[var(--sf-accent-strong)]"
              >
                {item.existingListingId
                  ? "Activate listing in My Store"
                  : "Add to My Store"}
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-[var(--sf-muted)]">
              Catalog editors or managers can add this product.
            </p>
          )}
        </div>
      </article>
    </SellerOpsShell>
  );
}
