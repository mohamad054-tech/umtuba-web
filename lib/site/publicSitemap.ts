import { isSandboxProductIdentity, isSandboxStoreIdentity } from "../store/sandboxCatalog";
import { SITEMAP_STATIC_ROUTES } from "./indexing";

export const SITEMAP_DYNAMIC_LIMIT = 200;

export function publicCourseSitemapPath(slug: string): string | null {
  const value = slug.trim();
  if (!value || value.includes("/") || value.includes("?")) return null;
  return `/learning/catalog/${value}`;
}

export function publicProductSitemapPath(
  storeSlug: string,
  productSlug: string
): string | null {
  const store = storeSlug.trim();
  const product = productSlug.trim();
  if (!store || !product) return null;
  if (store.includes("/") || product.includes("/")) return null;
  if (
    isSandboxStoreIdentity({ slug: store }) ||
    isSandboxProductIdentity({ slug: product })
  ) {
    return null;
  }
  return `/store/${store}/product/${product}`;
}

export function publicLifePostSitemapPath(id: number): string | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  return `/life?post=${id}`;
}

export function publicStorefrontSitemapPath(
  storeSlug: string
): string | null {
  const store = storeSlug.trim();
  if (!store || store.includes("/") || isSandboxStoreIdentity({ slug: store })) {
    return null;
  }
  return `/store/${store}`;
}

export function listStaticSitemapPaths(): readonly string[] {
  return SITEMAP_STATIC_ROUTES;
}
