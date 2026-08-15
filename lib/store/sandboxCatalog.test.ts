import { afterEach, describe, expect, it } from "vitest";
import {
  STORE_E2E_SANDBOX_NAMESPACE,
  STORE_E2E_SANDBOX_STORE_ID,
  STORE_E2E_SANDBOX_STORE_SLUG,
  isSandboxCatalogMarker,
  isSandboxCategoryIdentity,
  isSandboxProductIdentity,
  isSandboxStoreIdentity,
  shouldExposeSandboxCatalog,
  shouldHideSandboxFromStorefront,
} from "./sandboxCatalog";

describe("sandbox catalog containment", () => {
  const previous = process.env.NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG;

  afterEach(() => {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG;
    } else {
      process.env.NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG = previous;
    }
  });

  it("recognizes namespace, slug, and fixed sandbox ids", () => {
    expect(isSandboxCatalogMarker(STORE_E2E_SANDBOX_NAMESPACE)).toBe(true);
    expect(isSandboxCatalogMarker(STORE_E2E_SANDBOX_STORE_SLUG)).toBe(true);
    expect(isSandboxCatalogMarker(STORE_E2E_SANDBOX_STORE_ID)).toBe(true);
    expect(isSandboxCatalogMarker("UMTUBA_E2E_20260721 Simple Mug")).toBe(true);
    expect(isSandboxCatalogMarker("atelier-a")).toBe(false);
    expect(isSandboxCatalogMarker("Genuine Mug")).toBe(false);
  });

  it("identifies the seeded sandbox store and products", () => {
    expect(
      isSandboxStoreIdentity({
        id: STORE_E2E_SANDBOX_STORE_ID,
        slug: STORE_E2E_SANDBOX_STORE_SLUG,
        name: `${STORE_E2E_SANDBOX_NAMESPACE} Sandbox`,
      })
    ).toBe(true);
    expect(
      isSandboxStoreIdentity({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        slug: "atelier-a",
        name: "Atelier A",
      })
    ).toBe(false);

    expect(
      isSandboxProductIdentity({
        id: "e2e02107-2026-4001-8000-000000000011",
        slug: "e2e-simple-mug",
        title: `${STORE_E2E_SANDBOX_NAMESPACE} Simple Mug`,
        sku: `${STORE_E2E_SANDBOX_NAMESPACE}-MUG`,
      })
    ).toBe(true);
    expect(
      isSandboxProductIdentity({
        slug: "e2e-variant-tee",
        title: "Variant Tee",
      })
    ).toBe(true);
    expect(
      isSandboxProductIdentity({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        slug: "ceramic-mug",
        title: "Ceramic mug",
      })
    ).toBe(false);
  });

  it("identifies the seeded sandbox category", () => {
    expect(
      isSandboxCategoryIdentity({
        id: "e2e02107-2026-4001-8000-000000000050",
        slug: STORE_E2E_SANDBOX_STORE_SLUG,
        name: `${STORE_E2E_SANDBOX_NAMESPACE} Category`,
      })
    ).toBe(true);
  });

  it("hides sandbox from storefront unless explicitly opted in", () => {
    delete process.env.NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG;
    expect(shouldExposeSandboxCatalog()).toBe(false);
    expect(shouldHideSandboxFromStorefront()).toBe(true);

    process.env.NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG = "0";
    expect(shouldHideSandboxFromStorefront()).toBe(true);

    process.env.NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG = "1";
    expect(shouldExposeSandboxCatalog()).toBe(true);
    expect(shouldHideSandboxFromStorefront()).toBe(false);
  });
});
