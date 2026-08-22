import Link from "next/link";
import { notFound } from "next/navigation";
import StoreErrorState from "../../../../components/store/StoreErrorState";
import StoreShell from "../../../../components/store/StoreShell";
import { APP_ROUTES } from "../../../../lib/nav";
import {
  pickRecommended,
  pickTrending,
} from "../../../../lib/storefront/deriveSections";
import { createTranslator } from "../../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../../lib/i18n/server";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  getPublicProductDetail,
  listPublicCatalog,
} from "../../../../../lib/store/catalogQueries";
import { listPublicVideosForProduct } from "../../../../../lib/store/videoCommerceQueries";
import { isProductWishlisted } from "../../../../../lib/store/wishlist";
import type { PublicCatalogItem } from "../../../../../lib/store/types";
import ProductDetailClient from "./ProductDetailClient";
import JsonLd from "../../../../components/JsonLd";
import {
  buildBreadcrumbListJsonLd,
  buildProductJsonLd,
} from "../../../../../lib/site/jsonLd";
import { buildPageMetadata } from "../../../../../lib/site/metadata";
import { BRAND } from "../../../../../lib/site/brand";
import { isSafePublicShareImageUrl } from "../../../../../lib/site/metadata";

type ProductPageProps = {
  params: Promise<{ storeSlug: string; productSlug: string }>;
};

export async function generateMetadata({ params }: ProductPageProps) {
  const { storeSlug, productSlug } = await params;
  const { locale } = await resolveRequestLocale();
  const supabase = await createClient();
  const { detail } = await getPublicProductDetail(
    supabase,
    storeSlug,
    productSlug
  );
  const path = `/store/${storeSlug}/product/${productSlug}`;
  if (!detail) {
    return buildPageMetadata({
      title: "Product",
      description: `A ${BRAND.name} Store product.`,
      path,
      index: "noindex",
      locale,
    });
  }
  const title = detail.displayTitle?.trim() || detail.product.title;
  const description =
    detail.product.short_description?.trim() ||
    detail.product.description?.trim() ||
    `${title} at ${detail.store.name} on ${BRAND.name} Store.`;
  const image = detail.media
    .map((item) => item.mediaUrl)
    .find((url) => isSafePublicShareImageUrl(url));
  return buildPageMetadata({
    title,
    description,
    path,
    index: "index",
    locale,
    imageUrl: image,
    imageAlt: title,
  });
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { storeSlug, productSlug } = await params;
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const { detail, error } = await getPublicProductDetail(
    supabase,
    storeSlug,
    productSlug
  );

  if (error) {
    return (
      <StoreShell title={t("store.product.navSubtitle")} subtitle={t("store.shell.title")} wide={false}>
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
  const priced = detail.variants.find((row) => row.price);
  const image = detail.media
    .map((item) => item.mediaUrl)
    .find((url) => isSafePublicShareImageUrl(url));
  const productPath = `/store/${detail.store.slug}/product/${detail.product.slug}`;

  return (
    <>
    <JsonLd
      data={buildBreadcrumbListJsonLd([
        { name: "UMTUBA", path: "/" },
        { name: t("store.shell.title"), path: APP_ROUTES.store },
        { name: detail.store.name, path: `/store/${detail.store.slug}` },
        { name: detail.product.title, path: productPath },
      ])}
    />
    <JsonLd
      data={buildProductJsonLd({
        name: detail.displayTitle?.trim() || detail.product.title,
        description:
          detail.product.short_description || detail.product.description,
        path: productPath,
        imageUrl: image,
        priceMinor: priced?.price?.amount_minor ?? null,
        currency: priced?.price?.currency ?? null,
        available: priced?.available ?? null,
        sellerName: detail.store.name,
        forSale: detail.purchaseAllowed !== false,
      })}
    />
    <StoreShell
      title={detail.product.title}
      subtitle={t("store.product.navSubtitle")}
      actions={
        <nav aria-label="Breadcrumb" className="hidden text-xs md:block">
          <ol className="flex items-center gap-2 text-white/50">
            <li>
              <Link
                href={APP_ROUTES.store}
                className="watch-focus-ring rounded hover:text-[var(--sf-accent-strong)]"
              >
                {t("store.shell.title")}
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
    </>
  );
}
