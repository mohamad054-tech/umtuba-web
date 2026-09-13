# PC2-A4 — Pre-company Store / Learning foundation

DATE = 2026-08-18
DEVICE = PC2
TASK_ID = `PC2_A4_PRECOMPANY_STORE_LEARNING_FOUNDATION_V1`
MODE = Provider-neutral contracts + mock adapters only. No live APIs. No catalog import.

## Verdict

Existing Store already has first-party catalog, checkout, sandbox containment, and
`owned` / `supplier_listing` marketplace. Existing Learning already has courses,
enrollments, and a public catalog for UMTUBA-authored content. Neither surface had
**partner-provider kinds, DENY-by-default rights, checkout/enrollment ownership, or
origin labels**.

This slice adds reusable TypeScript contracts and in-memory mocks. It does **not**
wire them into catalog queries, PDP, checkout, enrollments, or public Learning UI.
No SKUs or courses were imported.

```
STORE_PRECOMPANY_READY = CONTRACTS_MOCK_ONLY
LEARNING_PRECOMPANY_READY = CONTRACTS_MOCK_ONLY
UNAUTHORIZED_PRODUCTS_IMPORTED = 0
UNAUTHORIZED_COURSES_IMPORTED = 0
```

## Reused (do not duplicate)

| Existing | Why it is not this contract |
| --- | --- |
| `lib/store/types.ts` `marketplaceSourceType: owned \| supplier_listing` | First-party UMTUBA seller marketplace, not a third-party commerce provider |
| `lib/store/catalogQueries.ts` + checkout/orders | First-party Store purchase path |
| `lib/store/sandboxCatalog.ts` | E2E demo containment; hide-by-default. Reuse — do not add partner SKUs |
| `lib/store/shippingProviders.ts` | Carrier keys, not catalog providers |
| `lib/store/commerceSafety.ts` | Confirm kill-switch, not partner rights |
| `lib/learning/coursesFoundation.ts` `ai_ready` / `marketplace_ready` / `certification_ready` | Capability flags on UMTUBA courses, not origin/rights |
| `lib/learning/enrollmentsFoundation.ts` | First-party entitlement lifecycle |
| `lib/learning/publicCatalog.ts` | Public discovery of UMTUBA-authored courses |
| `lib/knowledgeAcquisition/rightsEngine.ts` | Knowledge-asset rights, not Store/Learning partner adapters |

## Implemented now (provider-neutral)

- Commerce kinds: `AFFILIATE | CATALOG_API | DROPSHIP | WHOLESALE | RESELLER | MARKETPLACE`
- Commerce rights (default DENY): `CATALOG_DISPLAY_ALLOWED`, `IMAGE_USAGE_ALLOWED`, `PRICE_SYNC_ALLOWED`
- `CHECKOUT_MODE` default `DISABLED`; `FULFILLMENT_OWNER` / `RETURNS_OWNER` default `UNKNOWN`
- Learning kinds: `UMTUBA_ORIGINAL | PARTNER | EXTERNAL` with labels Original / Partner / External
- Learning rights (default DENY): `METADATA_DISPLAY_ALLOWED`, `CONTENT_HOSTING_ALLOWED`, `VIDEO_HOSTING_ALLOWED`, `AI_USAGE_ALLOWED`, `CERTIFICATE_INTEGRATION_ALLOWED`
- `ENROLLMENT_MODE` default `DISABLED`; `PAYMENT_OWNER` default `UNKNOWN`
- `AI_USAGE_ALLOWED` is never inferred — explicit `true` only
- Unknown / missing rights → DENY
- `LEGAL_COMPANY_*` remain `PENDING`; live integration asserts fail closed
- Mock adapters return empty catalogs by default; optional fixtures are never purchasable / never enrollable
- No retailer or course-platform names in product logic

## SAFE_TO_BUILD_NOW

- Generic provider-neutral TypeScript contracts (kinds, rights, owners, modes)
- DENY-by-default rights normalizers and live-integration gates
- In-memory mock adapters with empty / non-purchasable fixtures
- Learning origin label helper (Original / Partner / External) — not yet shown in UI
- Tests that prove unknown flags DENY and named platforms are not kinds
- Docs classifying wait vs now
- Continue first-party Store (UMTUBA sellers, sandbox containment) and first-party Learning (UMTUBA-authored courses)
- Research official first-party partner programs from public docs only (no outreach)

## MUST_WAIT_FOR_COMPANY

- Legal entity, tax IDs, bank / payout / merchant accounts
- Affiliate / wholesale / reseller / marketplace program applications
- Signing provider contracts or accepting program terms
- Live API credentials, webhooks, or production adapters
- Checkout that charges, redirects with affiliate tags, or dropships
- Price sync against a live catalog API
- Publishing any partner catalog on umtuba.com or in the app
- Partner certificate issuance
- Hosting partner-owned course content or video
- Changing `LEGAL_COMPANY_STATUS` off `PENDING`

## MUST_WAIT_FOR_PARTNER_PERMISSION

- Displaying a partner’s product titles, images, or prices as a catalog
- Importing partner SKUs (including “demo” copies of real retailer products)
- Using partner trademarks in Store/Learning product logic
- Dropship / wholesale inventory feeds and fulfillment APIs
- Hosting or mirroring partner course video / materials
- Certificate co-branding or transcript exchange
- `AI_USAGE_ALLOWED` on partner or external content
- Scraping (never permitted, even after company + permission)
- Outreach / applications until company eligibility is real

## Explicitly not done

- No DB migrations
- No catalogQueries / publicCatalog / enrollment wiring
- No UI origin badges on Learning pages (helper exists; surface later)
- No live HTTP adapters
- No SHEIN / Amazon / Coursera / etc. identifiers in contracts
- No sandbox SKU expansion beyond existing `UMTUBA_E2E_20260721` pattern

## Exact files changed

- `lib/store/commerceProviderContracts.ts` (created)
- `lib/store/commerceProviderContracts.test.ts` (created)
- `lib/learning/learningProviderContracts.ts` (created)
- `lib/learning/learningProviderContracts.test.ts` (created)
- `docs/ai/PC2_PRECOMPANY_STORE_LEARNING_FOUNDATION.md` (created)
- `docs/ai/CURSOR_REPORT.md` (updated)

## Migrations created

None.

## Security review

- Fail closed: missing/unknown rights DENY; AI usage DENY unless explicit true
- Live adapters gated on company READY **and** partner permission
- Mock offers/courses are non-purchasable / non-enrollable
- No secrets, no partner credentials, no catalog payloads
- Brand names kept out of product modules (tests may mention them only as negative cases)

## Next (not this slice)

When company exists and a specific partner grants rights, add a named adapter
behind these contracts, persist grants in DB, then optionally surface origin
labels and rights-gated display. Until then keep mocks unwired from production
storefronts.
