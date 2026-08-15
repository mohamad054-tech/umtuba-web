/**
 * Remote E2E sandbox markers (UMTUBA_E2E_20260721).
 * Public merchandising hides these unless explicitly opted in so demo
 * catalog rows cannot reach production storefront surfaces by accident.
 */

export const STORE_E2E_SANDBOX_NAMESPACE = "UMTUBA_E2E_20260721";
export const STORE_E2E_SANDBOX_STORE_ID =
  "e2e02107-2026-4001-8000-000000000001";
export const STORE_E2E_SANDBOX_STORE_SLUG = "umtuba-e2e-20260721";
export const STORE_E2E_SANDBOX_ID_PREFIX = "e2e02107-2026-4001-8000-";

export const STORE_E2E_SANDBOX_PRODUCT_SLUGS = [
  "e2e-simple-mug",
  "e2e-variant-tee",
  "e2e-low-stock",
] as const;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function isSandboxCatalogMarker(
  value: string | null | undefined
): boolean {
  if (!value) return false;
  const v = normalize(value);
  return (
    v.includes("umtuba_e2e_") ||
    v.includes("umtuba-e2e-") ||
    v.startsWith(STORE_E2E_SANDBOX_ID_PREFIX)
  );
}

export function isSandboxStoreIdentity(input: {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
}): boolean {
  return (
    isSandboxCatalogMarker(input.id) ||
    isSandboxCatalogMarker(input.slug) ||
    isSandboxCatalogMarker(input.name)
  );
}

export function isSandboxProductIdentity(input: {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
  sku?: string | null;
}): boolean {
  const slug = input.slug ? normalize(input.slug) : "";
  return (
    isSandboxCatalogMarker(input.id) ||
    isSandboxCatalogMarker(input.slug) ||
    isSandboxCatalogMarker(input.title) ||
    isSandboxCatalogMarker(input.sku) ||
    (STORE_E2E_SANDBOX_PRODUCT_SLUGS as readonly string[]).includes(slug)
  );
}

export function isSandboxCategoryIdentity(input: {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
}): boolean {
  return isSandboxStoreIdentity(input);
}

/** Opt-in only. Default is hide — production builds must not merchandize sandbox. */
export function shouldExposeSandboxCatalog(): boolean {
  return process.env.NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG === "1";
}

export function shouldHideSandboxFromStorefront(): boolean {
  return !shouldExposeSandboxCatalog();
}
