# UMTUBA Ads Admin Review Foundation V1

## Architecture

```
/admin/ads/* (platform admins only)
  → requireAdminAdsSession → assertPlatformAdminDb (is_platform_admin RPC)
  → Server Actions (app/actions/adsAdmin.ts)
  → lib/ads/adminReview + adminQueries
  → SECURITY DEFINER RPCs (admin_*)
       require_platform_admin() → reviewer_id = auth.uid()
       → status updates + ad_review_events (same transaction)
```

No `SUPABASE_SERVICE_ROLE_KEY` in the Next.js app. Privileged work uses
`SECURITY DEFINER` RPCs gated by `public.require_platform_admin()`.

**Database is the sole authority.** JWT `app_metadata` / env allowlists are
optional UX hints only and never grant admin access by themselves.

Legacy automation RPCs (`approve_advertiser_account`, …) remain **service_role
only** for external tooling alongside the new `admin_*` RPCs.

## Admin workflow

1. Advertiser submits account / campaign / creative → `pending_review`
2. Platform admin opens `/admin/ads` queues
3. Inspect details (contact, budget, targeting, creative preview)
4. Approve / Reject (reason required) / Suspend / Restore
5. Audit row written to `ad_review_events` with `reviewer_id = auth.uid()`

## Permissions

| Layer | Rule |
| --- | --- |
| DB | Row in `public.platform_admins` + `auth.uid()` via `require_platform_admin()` |
| RLS | `platform_admins`: RLS + FORCE RLS; authenticated SELECT own row only; no writes |
| Next.js | Server-side gate calls `is_platform_admin` RPC before rendering `/admin/ads` |
| UI | No Admin links in TopNav or advertiser menus |

Advertiser roles (`owner` / `admin` / …) **never** grant access to `/admin/ads`.
V1 does not let a platform admin create another admin from the UI.

## Review lifecycle

| Entity | Approve from | Reject from | Suspend | Restore |
| --- | --- | --- | --- | --- |
| Advertiser | pending_review | pending_review | approved/pending/rejected | suspended → approved |
| Campaign | pending_review (+ advertiser approved) | pending_review | pause via admin for active/approved; restore suspended → paused | |
| Creative | pending_review | pending_review | approved/pending → suspended | suspended → draft |

- Approve does **not** activate a campaign for delivery.
- Cannot approve twice; cannot reject already-approved entities via these RPCs.
- All transitions check current status atomically inside the RPC.

## Audit

- Append-only `ad_review_events` (RLS + revoke writes + BEFORE UPDATE/DELETE triggers)
- `reviewer_id` / `entity_*` / `action` / `reason` written only inside DB functions
- Audit insert in the same function as the transition — failure rolls back both
- Admin UI never accepts a client-supplied `reviewer_id`

## Search / filters

- List RPCs sanitize LIKE wildcards (`admin_sanitize_search`, max 80 chars)
- Status / objective / entity_type / action filters are allowlisted
- Pagination capped (limit ≤ 100, offset ≤ 5000)

## Sensitive data

- Contact fields only via admin RPCs (platform admin) or advertiser membership policies
- Creative signed URLs: app checks `is_platform_admin` then Storage policy also requires it
- Destination URLs: https-only at write time; admin UI links only when protocol is https
- Headline / body / notes rendered as React text (no HTML)

## UI routes

| Route | Purpose |
| --- | --- |
| `/admin/ads` | Queue counts |
| `/admin/ads/advertisers` | Advertiser queue + detail |
| `/admin/ads/campaigns` | Campaign queue + targeting |
| `/admin/ads/creatives` | Creative queue + media preview |
| `/admin/ads/reviews` | Global audit trail |

## Limitations

- Migration `20260806` must be applied before UI RPCs work remotely
- First admin must be granted manually (see ops note after apply) — **not** via migration/seed
- No AI moderation
- No live delivery (`ADS_DELIVERY_ENABLED = false`)
- No payments / spent mutation / public event ingestion
- Admin cannot edit historical review events or metrics
- V1 cannot promote another Platform Admin from the UI

## Future AI moderation

Auto-labels → human confirm queue; still write `ad_review_events` with model metadata; never auto-approve high-risk categories for teen-reachable placements.
