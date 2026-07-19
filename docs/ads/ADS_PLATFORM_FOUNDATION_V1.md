# UMTUBA Ads Platform Foundation V1

## Vision

Build a production-ready **foundation** for UMTUBA advertising: advertiser accounts, campaigns, targeting, creatives, review workflow, private media storage, and metrics scaffolding — **without** live delivery, payments, auctions, or demo data.

This release must not break Watch, Discover, Stories, Live, Store, Search, or Auth.

## Architecture

```
Advertiser UI (/advertise/*)
  → Server Actions (app/actions/ads.ts)
  → Domain (lib/ads/*)
  → Supabase (RLS + SECURITY DEFINER RPCs + private storage)
```

- **Domain layer** owns validation, permissions, status transitions, and typed queries.
- **Admin approvals** are `service_role`-only RPCs (backend/operator tooling), never advertiser UI.
- **Delivery engine** is explicitly disabled (`ADS_DELIVERY_ENABLED = false`).

## Schema

Migration: `supabase/migrations/20260807_ads_platform_foundation_v1.sql`

| Table | Purpose |
| --- | --- |
| `advertiser_accounts` | Business account + review status |
| `advertiser_members` | Team roles (owner/admin/campaign_manager/analyst/viewer) |
| `ad_campaigns` | Objectives, budgets (minor ints), schedule, status |
| `ad_sets` | Targeting unit (geo, language, age, interests, placements, include/exclude) |
| `ad_creatives` | Creative assets + destination URL + moderation notes |
| `ads` | Deliverable binding (creative ↔ ad set); not served in V1 |
| `ad_review_events` | Audit trail for submit/approve/reject/suspend |
| `ad_impression_events` / `ad_click_events` | Event foundation + dedupe keys |
| `ad_daily_metrics` | Aggregation foundation (no job yet) |

## Roles

| Role | Account | Campaigns/creatives | Metrics | Approve |
| --- | --- | --- | --- | --- |
| owner | manage + members | manage | read | no |
| admin | manage + members | manage | read | no |
| campaign_manager | — | manage | read | no |
| analyst | — | read | read | no |
| viewer | — | read | read | no |

Approvals are **never** available to advertiser roles.

## Campaign workflow

1. Create advertiser account (`draft`) → submit → `pending_review` → admin approve/reject/suspend.
2. Create campaign (`draft`) with budget/dates/targeting → submit → `pending_review` → admin approve.
3. Create creative (`draft`) → submit → admin approve.
4. Activation gates (domain + future delivery): advertiser approved, campaign approved, ≥1 approved creative, valid budget/dates.
5. Pause / archive available to managers where status allows.
6. Approved creatives are immutable; create a new draft revision instead of editing in place.

## Targeting

Supported in V1:

- countries / regions / cities
- languages
- age_min / age_max (floor **13**)
- gender (optional; default neutral/`all`)
- interests (allowlist only)
- user_segments (non-PII labels only)
- placements
- devices (optional)
- frequency_cap
- include/exclude lists

Prohibited:

- individual user IDs / emails / phones (include **and** exclude lists)
- political / religious / health / racial / sexual-orientation targeting
- private messages, contacts, or conversation content
- ages below 13
- for audiences including ages **13–17**: gender targeting (non-all), city-level geo, and user segments

Minimum audience size is a **contract** (`MIN_ESTIMATED_AUDIENCE = 1000`) for future estimation — not computed in V1.

Destination URLs for creatives require **https** only (no `http`, `javascript:`, `data:`, credentials, or localhost).

## Budgets / currencies

- Integer **minor units** only (no floats).
- ISO `currency_code`.
- `daily_budget > 0` when set; `total >= daily` when both set; `end_at > start_at`.
- `spent_minor` locked against client updates (trigger).
- No payment processor; no real charges. UI copy states figures are planning estimates in V1.

## Creative storage

- Private bucket: `ad-creatives`
- MIME allowlist: JPEG/PNG/WebP + MP4/WebM/MOV
- Max size: 50 MB
- Path: `{advertiser_account_id}/{user_id}/{uuid}`
- Reads via **signed URLs** only (no public URLs)
- Upload/update/delete gated by advertiser membership + path ownership

## Review / moderation

- Advertiser actions: `submit_*_for_review` RPCs (authenticated + role-gated).
- Admin actions: `approve_*` / `reject_*` / `suspend_*` (`service_role` only).
- Audit rows in `ad_review_events`.
- Destination URL validation (http/https, no credentials, no localhost).
- Prohibited-content policy placeholder in `lib/ads/reviewWorkflow.ts` (no AI moderation yet).

## RLS / security

- RLS + FORCE RLS on sensitive tables.
- Members see only accounts they belong to.
- Anon: no privileged grants.
- Authenticated cannot write review events, impression/click events, or daily metrics.
- SECURITY DEFINER helpers set `search_path = public` and check `auth.uid()`.
- Client code never uses `service_role`.

## Placements (contracts only)

- `discover_feed`
- `watch_feed`
- `stories`
- `live_lobby`
- `search_results`
- `store_catalog`
- `profile_feed`

**Not** integrated into Watch / Discover / Stories / Live / Store / Search surfaces in V1.

## Metrics

- Dashboard reads `ad_daily_metrics` (zeros if empty).
- No fake numbers.
- No public event ingestion yet.
- Future: batching, dedupe, attribution windows, fraud detection.

## UI routes

| Route | Purpose |
| --- | --- |
| `/advertise` | Landing |
| `/advertise/apply` | Create advertiser account |
| `/advertise/dashboard` | Status + overview metrics |
| `/advertise/campaigns` | Campaign list |
| `/advertise/campaigns/new` | Multi-step create |
| `/advertise/campaigns/[campaignId]` | Workspace / targeting / creatives / submit |
| `/advertise/creatives/new` | Creative upload |
| `/advertise/settings` | Account + members |

Entry points: User menu → Advertise; Settings → Account → Advertise. Not in primary TopNav / mobile bottom nav.

## Limitations (V1)

- No live ad delivery
- No payments / billing / settlement
- No auctions / bidding
- No audience estimation job
- No AI moderation
- No email invites (member add by user id only)
- Migration not applied to remote until approved

## Future: payments

Billing accounts, payment methods, prepay/credit, invoice settlement, spend pacing against real balance.

## Future: delivery engine

Placement adapters for Watch/Discover/Stories/etc., eligibility filters, frequency capping, pacing, creative selection.

## Future: auctions / bidding

Bid strategies, quality scores, second-price or unified auction — after delivery foundation.

## Fraud prevention roadmap

- Server-side event ingestion with signed tokens
- Dedupe keys + rate limits
- Invalid traffic filters
- Device/session anomaly signals
- Manual review queues for suspicious accounts

## Teen / minor safety

- Age targeting floor 13
- No sensitive attribute targeting
- No individual-user targeting
- Prohibited content placeholders for tobacco/adult/weapons to minors
- Delivery to young audiences will require stricter creative/policy gates in later phases

## Next phases

1. Apply migration to linked Supabase (after review)
2. Operator admin UI for approve/reject
3. Payments foundation
4. Delivery feature flag + one placement pilot
5. Metrics aggregation job + fraud basics
