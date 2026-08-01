# Seller Catalog Pagination Experience V1

Capability: `commerce.seller.catalog_pagination_experience_v1`
Branch: `office/seller-catalog-pagination-experience-v1`
Base: `f7b454e3590480c41eb810e4cd00db26ee584248` (`origin/office/seller-catalog-data-access-v1`)

## Baseline

Data Access V1 used **page replacement** via a single `cursor` URL param and a **Load more** link. Changing filters cleared the cursor. There was no Previous control, no local page label, and invalid cursors showed a raw error plus reset link.

## Chosen UX model

**Page replacement** (not append / infinite scroll).

- Desktop and mobile share the same Previous / Page N / Next controls.
- Each navigation replaces the product list for the current page only.
- Browser Back/Forward works because state lives in the URL.

## URL contract

Preserved across Next/Previous:

- `q`, `status`, `type`, `health`, `sort`, `limit`

Pagination metadata:

- `cursor` — opaque data-access cursor for the current page
- `ph` — opaque base64url cursor **history stack** for Previous
- `p` — local display page number (derived from history; cosmetic)

`storeId` is never taken from the URL.

## Previous strategy

Opaque history stack in `ph`:

1. Next pushes the current cursor (or `""` for page 1) onto `ph`, sets `cursor` to `nextCursor`.
2. Previous pops `ph` to restore the prior cursor (or clears cursor for page 1).
3. Corrupt `ph` fails closed to an empty stack (no scope expansion).
4. Filter/search/sort changes call reset href: clear `cursor`, `ph`, and `p`.

## Reset rules

Any change to search, status, type, health, or sort:

- deletes cursor/history
- returns to page 1
- never reuses an old cursor with a new query

## Empty / error / end states

| Kind | Meaning |
| --- | --- |
| `empty_catalog` | No products and no filters |
| `no_results` | Filters/search active, zero matches (or empty later page) |
| `end` | Page has items and `hasMore=false` |
| `invalid_cursor` | Friendly recovery CTA to first page (filters kept) |
| `load_error` | Soft retry CTA (no raw DB message) |

No invented “of Y total” counts.

## Accessibility

- Real `<button>` controls with `disabled`
- `aria-label` on Previous/Next
- `role="navigation"` for pagination
- `aria-live="polite"` for loading/status text

## Responsive

Stacked pagination bar on small screens (`flex-col` → `sm:flex-row`); no extra horizontal chrome.

## Security / performance

- Membership `storeId` only; cursors still validated by data-access
- History cannot change store scope
- Still `pageSize+1` + page-only health facts; no full-catalog load; no prefetch

## Deferred

totalCount / true total pages, infinite scroll, virtualization, cache/Redis, global health pagination, migrations/RPCs.
