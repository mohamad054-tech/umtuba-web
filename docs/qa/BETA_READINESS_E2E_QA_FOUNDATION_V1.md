# UMTUBA Beta Readiness & End-to-End QA Foundation V1

Local integration QA pass on `alpha-0.2`.

**Scope constraints for this foundation:** no seed/demo data, no ads delivery enablement.

## Problems found (summary)

### Critical
- **Live `live_started` notifications on create-and-go-live:** **Fixed and applied remotely.** Migration `supabase/migrations/20260808_live_started_insert_notification_fix.sql` extends `notify_on_live_started` + `live_rooms_notify_started` to fire on INSERT-as-live as well as non-live → live UPDATE. History row `20260808` recorded as applied on linked `umtuba`.

### High (remaining)
- Product media upload incomplete (path metadata / placeholders; not real catalog images)
- Comments hard-capped (~40) with no load-more
- No story-posted notifications for followers
- No real Terms / Privacy pages (signup acceptance is text-only)
- Messages: text-only (no attachments/voice); presence is preview/gated, not production presence
- Storefront UI still shows non-live placeholder sections (brands / flash deals / etc.)

### Deferred feature (not a beta blocker)
- **Private / Group Live:** invite path incomplete. Create UI ships **Public only**; Private/Group options are hidden with helper copy. Re-enable only after invites ship. DB visibility enums remain unchanged.

### Medium / Low (selected)
- Stories realtime channel has no reconnect backoff
- Soft session-expiry UX (no dedicated toast/modal mid-page)
- Sitemap omits `/store`, `/search`, `/advertise`
- Wishlist not on product cards; dual search surfaces
- Watch not in primary nav (reachable via profile/deep links)
- Hardcoded `/login` remnants in a few call sites
- Double-mapping of some auth error strings

### Intentional / verified OK
- `ADS_DELIVERY_ENABLED = false` (no feed delivery)
- Admin ads gated by DB `platform_admins` / `is_platform_admin`
- No Platform Admin seed in this pass

## Fixes landed in this pass

- Auth callback error copy branches by reset vs sign-in/confirm intent (`mapSignInLinkError`)
- Advertise account routes added to middleware `PROTECTED_PREFIXES` (landing `/advertise` stays public)
- `getSafeRedirectPath` allows `@` in query (DM deep links) while rejecting `@` in path
- `/register` server-redirects to `/signup` preserving query
- Login no longer applies signup password-length policy
- Store / Seller hub / Wishlist added to account menu
- Live create UI limited to Public (Private/Group deferred in UI)
- Stories viewer remints signed URLs on media error (bounded retries; no `media_path` to client)
- Dead Discover mock video data removed
- Signup terms copy no longer looks like dead Terms/Privacy links
- Signup Suspense uses `AuthShell` loading pattern
- Ads permission comment clarified (legacy `approve_*` vs `admin_*`)
- Profile videos “has more” copy clarified

## Out of scope for this commit

- Seed users, demo catalogs, or Platform Admin grants
- Enabling ads delivery or payments
- Migration history recovery for `20260805` / `20260807` (reported only; not repaired here)

## Beta Critical Fix V1

- Migration: `20260808_live_started_insert_notification_fix.sql`
- Helper + tests: `lib/live/liveStartedNotification.ts`, `lib/live/liveStartedInsertNotification.test.ts`
- Status: **Fixed, applied remotely, history repaired for 20260808**
- No demo Live created on production during apply
