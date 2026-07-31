# Category Taxonomy Seed V1

Capability: `commerce.catalog.category_taxonomy_seed_v1`  
Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260885_store_catalog_category_taxonomy_seed_v1.sql`

Depends on: Product Foundation (`product_categories`), Marketplace Foundation (`sort_order`)

## Purpose

Seed a **minimal trusted active** category taxonomy so sellers can assign `primary_category_id` and pass the category gate in `submitProductForReview`.

## Schema fields used

| Field | Role |
| --- | --- |
| `id` | Deterministic UUID (`c47a1000-0001-4000-8000-*`) |
| `parent_id` | Hierarchy (digital children under Digital Products) |
| `slug` | Unique stable slug |
| `name` | Display label (≤80) |
| `status` | Seeded as `active` |
| `sort_order` | Deterministic list order |

No locale columns or marketplace flags on this table — not invented.

## Taxonomy

**Digital Products** (root)

- Education & Courses
- Software & Digital Tools
- Books & Documents
- Design & Creative Assets

**Roots:** Services, Electronics, Fashion, Beauty & Personal Care, Home & Living, Sports & Outdoors, Food & Beverage

Physical category rows exist for future physical catalog completeness. **They do not enable physical publishing or checkout** (`commerce_confirm_enabled` remains off by default; moderation + digital readiness gates unchanged).

## Idempotency

`store_catalog_seed_category_v1` upserts by primary key. Re-running the migration updates the launch rows in place. Does **not** delete unknown categories. Fails closed if a seeded slug is already owned by a different id, or if a child parent is missing.

## Product-loading effect

1. `listActiveCategories` returns seeded active rows (sort_order, name)
2. Seller new/edit product pickers can assign a seeded id
3. `submitProductForReview` accepts an active seeded category; rejects missing/inactive
4. Digital publish readiness and commerce confirm gates remain enforced

## Out of scope

Dashboard/Admin taxonomy editor, AI categorization, catalog UI redesign, destructive category replacement, auto-publish, remote migration apply.
