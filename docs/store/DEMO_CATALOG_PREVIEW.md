# Store demo catalog preview (private QA only)

Internal fixture catalog (26 DEMO_ONLY products). **Not** live inventory.
Never apply SQL `20260929`. Public `/store` stays real authorized inventory only.

## Access policy

| Surface | Policy |
|---|---|
| Public `/store` | Real catalog only. Demo fixtures are never listed. |
| `/store/demo-preview` | Private / explicitly authorized QA only |
| Search engines | `noindex, nofollow` + `robots.txt` disallow |
| Public sitemap | Not included |
| Public navigation | Not linked |

Anonymous visitors who know the path are **denied**.
`STORE_DEMO_PREVIEW=1` alone does **not** grant access.
Non-production `NODE_ENV` is **not** a grant.

## How Product Owner / QA opens it

**Preferred — signed-in platform admin**

1. Sign in as a user who is a row in `platform_admins` (database is the source of truth).
2. Open `/store/demo-preview`.

No environment flag is required for this path. JWT/env hints alone are not enough; the page re-checks `is_platform_admin`.

**Alternate — server-side secret token (not a guessable URL)**

1. Operator sets `STORE_DEMO_PREVIEW_TOKEN` on the web process only.
2. Generate a long random value (32+ hex bytes). Never commit it. Never put it in sitemap, nav, chat logs, or this file.
3. Open `/store/demo-preview/enter?demo_token=<the-same-value>` once.
4. The enter route sets an httpOnly cookie scoped to `/store/demo-preview` (8 hours) and redirects to a URL **without** the secret in the query string.

A matching `?demo_token=` on `/store/demo-preview` still works for a single request, but the enter route is the safer first visit.

## Safety of the 26 fixtures

Every product is labeled DEMO / PREVIEW in the UI and internally:

- `SOURCE_TYPE = DEMO`
- `RIGHTS_STATUS = DEMO_ONLY`
- `REAL_PROVIDER = NONE`
- `PURCHASABLE = NO`
- `PRODUCTION_SELLABLE = NO`
- Checkout sandbox `allowed = false` — no payment processor charge
- No fake supplier, shipping promise, stock claim, discount, partnership, or review/rating

Fixtures load from `lib/store/demo/` — they are not public catalog rows.

Do **not** set `NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG=1` for this preview.
That flag is a separate E2E sandbox merchandising switch and must stay off in production.
