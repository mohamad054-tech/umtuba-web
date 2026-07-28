# Current Task

## Task title

Platform Navigation Deep-link & Alias Clarity V1

## Status

`verification-pass` — **UNCOMMITTED** — awaiting explicit commit GO.

## Branch / sync

- **Branch:** `office/platform-navigation-deeplink-alias-clarity-v1`
- **Base:** `038e3f890f59cd467a3cc3fbf29b8eaeb4b5340a` (`alpha-0.2`)
- **Checkout:** feature branch (not merged)

## What was implemented

Frozen Platform Navigation deep-link / alias contracts (no new routers, no canonical renames):

| Contract | Behavior |
| --- | --- |
| `/discover` → `/` | Forever redirect; query keys `post|city|comment|country` preserved |
| Home active on `/discover` | Desktop + mobile highlight Home |
| `buildPostNotificationHref` | `/discover?post=` then alias to Home |
| `/profile` resolver | Signed-out → `/login?next=/profile`; owner → username or settings |
| Auth `?next=` default | `getSafeRedirectPath` fallback **`/discover`** |

**Auth default decision:** Keep `/discover` (do **not** flip to `/`). Same Discovery destination after forever redirect; avoids churn to callers, `/discover?post=` deep links, and redirect tests.

## Verification

- **PASS** (in-scope)
- In-scope Vitest: PASS (43)
- Full Vitest: 2708 passed; **3 Store failures pre-existing / out of scope**
- `npx tsc --noEmit`: **FAIL pre-existing / out of scope** — `lib/content/profilePinnedContentStructure.v1.test.ts` (`../cards`)
- `npm run build`: PASS
- `git diff --check`: PASS

## Forbidden scope

- Home feed / swipe / ranking / player / circles layout
- Primary desktop/mobile nav
- Content-flow / Store Domain / Advertise-Admin Store policy / Living Navigation cleanup
- Commit / Push / Merge without explicit GO

## Next step

Await explicit **commit GO** (manual Terminal commit if Agent trailers apply).

**Proposed next feature (not started):** Platform Navigation Secondary Surface Cleanup V1 (Living Navigation / experimental tagging) — no execution started.
