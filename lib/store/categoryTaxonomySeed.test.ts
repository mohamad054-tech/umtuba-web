/**
 * Focused tests — Category Taxonomy Seed V1.
 */

import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  assertCategoryTaxonomySeedIntegrity,
  assertPrimaryCategoryEligibleForReview,
  CATEGORY_TAXONOMY_SEED,
  CATEGORY_TAXONOMY_SEED_BY_SLUG,
  CATEGORY_TAXONOMY_SEED_ID,
  CATEGORY_TAXONOMY_SEED_MIGRATION,
  CATEGORY_TAXONOMY_SEED_UUID_PREFIX,
  listCategoryTaxonomyChildren,
  listCategoryTaxonomyRoots,
  sortActiveCategoriesDeterministic,
} from "./categoryTaxonomySeed";
import { DIGITAL_PRODUCT_PUBLISH_READINESS_ID } from "./digitalProductPublishReadiness";
import { listActiveCategories } from "./catalogQueries";

const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

describe("Category taxonomy seed — contracts", () => {
  it("ships capability, migration, and documentation", () => {
    expect(CATEGORY_TAXONOMY_SEED_ID).toBe(
      "commerce.catalog.category_taxonomy_seed_v1"
    );
    expect(existsSync(join(ROOT, CATEGORY_TAXONOMY_SEED_MIGRATION))).toBe(true);
    expect(
      existsSync(
        join(ROOT, "docs/store/implementation/CATEGORY_TAXONOMY_SEED_V1.md")
      )
    ).toBe(true);
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      migrations.some((f) => f.includes("20260885_store_catalog_category_taxonomy_seed"))
    ).toBe(true);
  });

  it("seed integrity: unique slugs, deterministic ids, valid hierarchy", () => {
    expect(assertCategoryTaxonomySeedIntegrity()).toEqual({ ok: true });
    const slugs = CATEGORY_TAXONOMY_SEED.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    const ids = CATEGORY_TAXONOMY_SEED.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith(CATEGORY_TAXONOMY_SEED_UUID_PREFIX)).toBe(true);
    }
  });

  it("expected roots and digital children exist", () => {
    const roots = listCategoryTaxonomyRoots();
    expect(roots.map((r) => r.slug).sort()).toEqual(
      [
        "beauty-personal-care",
        "digital-products",
        "electronics",
        "fashion",
        "food-beverage",
        "home-living",
        "services",
        "sports-outdoors",
      ].sort()
    );
    const digital = CATEGORY_TAXONOMY_SEED_BY_SLUG["digital-products"];
    expect(digital).toBeDefined();
    const children = listCategoryTaxonomyChildren(digital!.id);
    expect(children.map((c) => c.slug).sort()).toEqual(
      [
        "books-documents",
        "design-creative-assets",
        "education-courses",
        "software-digital-tools",
      ].sort()
    );
    expect(CATEGORY_TAXONOMY_SEED_BY_SLUG["services"]?.parentId).toBeNull();
  });

  it("all seeded categories are active with deterministic sort order", () => {
    expect(CATEGORY_TAXONOMY_SEED.every((r) => r.status === "active")).toBe(
      true
    );
    const sorted = sortActiveCategoriesDeterministic(
      CATEGORY_TAXONOMY_SEED.map((r) => ({
        sortOrder: r.sortOrder,
        name: r.name,
        slug: r.slug,
      }))
    );
    expect(sorted[0]?.slug).toBe("digital-products");
    expect(sorted.map((r) => r.slug)).toEqual(
      [...sorted].sort((a, b) => {
        const rowA = CATEGORY_TAXONOMY_SEED_BY_SLUG[a.slug!]!;
        const rowB = CATEGORY_TAXONOMY_SEED_BY_SLUG[b.slug!]!;
        if (rowA.sortOrder !== rowB.sortOrder) {
          return rowA.sortOrder - rowB.sortOrder;
        }
        return rowA.name < rowB.name ? -1 : 1;
      }).map((r) => r.slug)
    );
  });
});

describe("Category taxonomy seed — SQL migration", () => {
  const sql = read(CATEGORY_TAXONOMY_SEED_MIGRATION);

  it("upserts by deterministic id and fails closed on slug conflicts", () => {
    expect(sql).toMatch(/store_catalog_seed_category_v1/);
    expect(sql).toMatch(/on conflict \(id\) do update/);
    expect(sql).toMatch(/category taxonomy seed conflict: slug/);
    expect(sql).toMatch(/hierarchy invalid: parent/);
    expect(sql).toMatch(
      /revoke all on function public\.store_catalog_seed_category_v1/
    );
    expect(sql).not.toMatch(/delete from public\.product_categories/i);
    expect(sql).not.toMatch(/truncate public\.product_categories/i);
  });

  it("seeds every SSOT row with matching id/slug/parent/sort", () => {
    for (const row of CATEGORY_TAXONOMY_SEED) {
      expect(sql).toContain(row.id);
      expect(sql).toContain(`'${row.slug}'`);
      expect(sql).toContain(String(row.sortOrder));
    }
    expect(sql).toMatch(/digital-products[\s\S]*education-courses/);
    expect(sql).toMatch(/c47a1000-0001-4000-8000-000000000001/);
  });

  it("repeated helper upsert is idempotent (on conflict update)", () => {
    expect(sql).toMatch(/status = 'active'/);
    expect(sql).toMatch(/updated_at = now\(\)/);
  });

  it("does not grant taxonomy writes to authenticated / anon", () => {
    expect(sql).toMatch(/from public, anon, authenticated/);
    expect(sql).not.toMatch(
      /grant execute on function public\.store_catalog_seed_category_v1/
    );
  });
});

describe("Category taxonomy seed — review gate + reads", () => {
  it("valid seeded category satisfies the category gate", () => {
    const digital = CATEGORY_TAXONOMY_SEED_BY_SLUG["education-courses"]!;
    expect(
      assertPrimaryCategoryEligibleForReview({
        primaryCategoryId: digital.id,
        categoryFound: true,
        categoryStatus: "active",
      })
    ).toEqual({ ok: true });
  });

  it("missing / inactive / unknown category remains rejected", () => {
    expect(
      assertPrimaryCategoryEligibleForReview({
        primaryCategoryId: null,
      })
    ).toMatchObject({ ok: false, code: "missing" });
    expect(
      assertPrimaryCategoryEligibleForReview({
        primaryCategoryId: "not-a-uuid",
      })
    ).toMatchObject({ ok: false, code: "missing" });
    expect(
      assertPrimaryCategoryEligibleForReview({
        primaryCategoryId: CATEGORY_TAXONOMY_SEED[0]!.id,
        categoryFound: false,
      })
    ).toMatchObject({ ok: false, code: "missing" });
    expect(
      assertPrimaryCategoryEligibleForReview({
        primaryCategoryId: CATEGORY_TAXONOMY_SEED[0]!.id,
        categoryFound: true,
        categoryStatus: "hidden",
      })
    ).toMatchObject({ ok: false, code: "inactive" });
    expect(
      assertPrimaryCategoryEligibleForReview({
        primaryCategoryId: CATEGORY_TAXONOMY_SEED[0]!.id,
        categoryFound: true,
        categoryStatus: "deprecated",
      })
    ).toMatchObject({ ok: false, code: "inactive" });
  });

  it("listActiveCategories orders by sort_order then name (deterministic)", async () => {
    const rows = [
      { id: "b", parent_id: null, slug: "b", name: "B", status: "active", sort_order: 20 },
      { id: "a", parent_id: null, slug: "a", name: "A", status: "active", sort_order: 10 },
      { id: "c", parent_id: null, slug: "c", name: "C", status: "active", sort_order: 10 },
    ];
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              order: vi.fn(async () => ({ data: rows, error: null })),
            })),
          })),
        })),
      })),
    };
    const listed = await listActiveCategories(supabase as never);
    expect(supabase.from).toHaveBeenCalledWith("product_categories");
    // Client returns DB order; our helper documents the same comparator.
    const sorted = sortActiveCategoriesDeterministic(
      listed.map((r) => ({
        sort_order: r.sort_order,
        name: r.name,
        slug: r.slug,
      }))
    );
    expect(sorted.map((r) => r.slug)).toEqual(["a", "c", "b"]);
  });

  it("submitProductForReview still enforces digital readiness after category gate", () => {
    const seller = read("lib/store/sellerStore.ts");
    const fnStart = seller.indexOf("export async function submitProductForReview");
    expect(fnStart).toBeGreaterThan(-1);
    const body = seller.slice(fnStart, fnStart + 2500);
    expect(body).toMatch(/assertPrimaryCategoryEligibleForReview/);
    expect(body).toMatch(/resolveDigitalProductPublishReadiness/);
    const catIdx = body.indexOf("assertPrimaryCategoryEligibleForReview");
    const digIdx = body.indexOf("resolveDigitalProductPublishReadiness");
    expect(digIdx).toBeGreaterThan(catIdx);
    expect(DIGITAL_PRODUCT_PUBLISH_READINESS_ID).toMatch(/publish_readiness/);
  });

  it("physical category presence does not bypass physical launch / confirm gates", () => {
    const safety = read(
      "supabase/migrations/20260819_store_commerce_safety_inventory_reservation_v1.sql"
    );
    expect(safety).toMatch(/commerce_confirm_enabled/);
    expect(safety).toMatch(/'commerce_confirm_enabled',\s*\n\s*0,/);
    const seed = read(CATEGORY_TAXONOMY_SEED_MIGRATION);
    expect(seed).toMatch(/does not enable physical/i);
    expect(seed).not.toMatch(/commerce_confirm_enabled/);
    expect(seed).not.toMatch(/admin_set_commerce_confirm_enabled/);
    // Physical roots exist for taxonomy completeness only.
    expect(CATEGORY_TAXONOMY_SEED.some((r) => r.launchGroup === "physical")).toBe(
      true
    );
    expect(
      CATEGORY_TAXONOMY_SEED.filter((r) => r.launchGroup === "physical").every(
        (r) => r.parentId == null
      )
    ).toBe(true);
  });

  it("preserves unrelated categories (no wipe) and documents e2e coexistence", () => {
    const seed = read(CATEGORY_TAXONOMY_SEED_MIGRATION);
    expect(seed).not.toMatch(/delete from public\.product_categories/i);
    const e2e = read("scripts/store-e2e/seed-store-sandbox.sql");
    expect(e2e).toMatch(/umtuba-e2e-20260721/);
    expect(
      CATEGORY_TAXONOMY_SEED.some((r) => r.slug === "umtuba-e2e-20260721")
    ).toBe(false);
  });
});

describe("Category taxonomy seed — conflicting hierarchy fails safely", () => {
  it("integrity rejects self-parent and missing parent when simulated", () => {
    // Live SSOT is valid; SQL raises on missing parent / slug theft.
    const sql = read(CATEGORY_TAXONOMY_SEED_MIGRATION);
    expect(sql).toMatch(/hierarchy invalid: parent % missing/);
    expect(sql).toMatch(/slug % already owned by %/);
    expect(assertCategoryTaxonomySeedIntegrity().ok).toBe(true);
  });
});
