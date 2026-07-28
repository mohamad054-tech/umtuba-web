import Link from "next/link";
import { notFound } from "next/navigation";
import StoreErrorState from "../../../../components/store/StoreErrorState";
import StoreShell from "../../../../components/store/StoreShell";
import { APP_ROUTES } from "../../../../lib/nav";
import {
  pickRecommended,
  pickTrending,
} from "../../../../lib/storefront/deriveSections";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  getPublicProductDetail,
  listPublicCatalog,
} from "../../../../../lib/store/catalogQueries";
import { listPublicVideosForProduct } from "../../../../../lib/store/videoCommerceQueries";
import { isProductWishlisted } from "../../../../../lib/store/wishlist";
import type { PublicCatalogItem } from "../../../../../lib/store/types";
import ProductDetailClient from "./ProductDetailClient";

type ProductPageProps = {
  params: Promise<{ storeSlug: string; productSlug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps) {
  const { productSlug } = await params;
  return { title: `${productSlug} | UMTUBA Store` };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { storeSlug, productSlug } = await params;
  const supabase = await createClient();
  const { detail, error } = await getPublicProductDetail(
    supabase,
    storeSlug,
    productSlug
  );

  if (error) {
    return (
      <StoreShell title="Product" subtitle="Store" wide={false}>
        <div className="mt-6">
          <StoreErrorState message={error} />
        </div>
      </StoreShell>
    );
  }

  if (!detail) notFound();

  const [user, catalog, videos] = await Promise.all([
    getServerUser(),
    listPublicCatalog(supabase, { limit: 24 }),
    listPublicVideosForProduct(supabase, detail.product.id),
  ]);
  const related = pickTrending(
    catalog.items.filter(
      (i: PublicCatalogItem) =>
        i.product.id !== detail.product.id &&
        (i.store.id === detail.store.id ||
          i.product.primary_category_id === detail.product.primary_category_id)
    ),
    4
  );
  const recommended = pickRecommended(catalog.items, detail.product.id, 4);
  const wishlisted = await isProductWishlisted(
    supabase,
    user?.id,
    detail.product.id
  );

  return (
    <StoreShell
      title={detail.product.title}
      subtitle="Product"
      actions={
        <nav aria-label="Breadcrumb" className="hidden text-xs md:block">
          <ol className="flex items-center gap-2 text-white/50">
            <li>
              <Link
                href={APP_ROUTES.store}
                className="watch-focus-ring rounded hover:text-[var(--sf-accent-strong)]"
              >
                Store
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href={`/store/${detail.store.slug}`}
                className="watch-focus-ring rounded hover:text-[var(--sf-accent-strong)]"
              >
                {detail.store.name}
              </Link>
            </li>
          </ol>
        </nav>
      }
    >
      <ProductDetailClient
        detail={detail}
        related={related}
        recommended={recommended}
        videos={videos.items}
        initialWishlisted={wishlisted}
      />
    </StoreShell>
  );
}
