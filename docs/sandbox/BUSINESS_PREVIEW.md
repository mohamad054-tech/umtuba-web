# Private business sandbox (Product Owner preview)

Private hub for how Store and Learning look when populated with **synthetic** people, courses, products, orders, and payments.

Path: `/sandbox/business-preview`

This is **not** the public catalog. It is **not** linked from primary nav, mobile nav, or the account menu.

## Labels

DEMO · SANDBOX · SYNTHETIC DATA · NOT LIVE · NO REAL PAYMENT · PROSPECTIVE PARTNER · NOT AN UMTUBA PARTNER

## Access (no secrets in this file)

Anonymous visitors who know the path are denied.
`STORE_DEMO_PREVIEW=1` alone does **not** grant access.
Non-production `NODE_ENV` is **not** a grant.

**Preferred — signed-in platform admin**

1. Sign in as a user that exists in `platform_admins`.
2. Open `/sandbox/business-preview`.

**Alternate — server token**

1. Operator sets `SANDBOX_BUSINESS_PREVIEW_TOKEN` on the web process only (16+ chars, random).
2. Never commit the value. Never put it in nav, sitemap, or chat logs.
3. Open `/sandbox/business-preview/enter?sandbox_token=<the-same-value>` once.
4. The enter route sets an httpOnly cookie scoped to `/sandbox/business-preview` (8 hours) and redirects without the secret in the URL.

## What is inside

- Learning: 24 demo students, 8 demo instructors, 16 courses (3 UMTUBA Original drafts + partner-course previews + external/affiliate UX)
- Store: the existing 26 DEMO products, commerce-mode overlay, mock checkout
- Prospective names (Coursera, SHEIN, and the other listed brands) are text-only PROSPECTIVE records. Not partners. No logos. No imports.

## Safety

- REAL_PAYMENT=OFF. No card fields. Mock adapter buttons only.
- Originals stay DRAFT / not public.
- SQL `20260929` is not used.
- Do not set `STORE_DEMO_PREVIEW=1` on production for this hub.
