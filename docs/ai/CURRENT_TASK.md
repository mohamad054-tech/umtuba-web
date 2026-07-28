# Current Task

## Task title

UserMenu Capability Links V1

## Status

`verification-pass` — **UNCOMMITTED** — awaiting explicit commit GO.

## Branch / sync

- **Branch:** `office/usermenu-capability-links-v1`
- **Base:** `272d6549ea7099dd2178c1d762a6d797b36566a8` (`alpha-0.2`)
- **Checkout:** feature branch (not merged)

## What was implemented

UserMenu capability visibility (existing helpers only; no new role system / migrations):

| Link | Behavior | Eligibility source |
| --- | --- | --- |
| **Create** | Shown when signed-in | UserMenu session (`profile`) → `/create/video` |
| **Instructor** | Conditional | `listInstructorAuthorableCourses` (same as Learning hub) |
| **Admin** | Conditional → `/admin/ads` | `assertPlatformAdminDb` (`is_platform_admin` RPC) |
| **Seller hub** | Conditional | `getOwnedOrMemberStore` **or** `getLatestSellerApplication` |
| **Advertise** | Remains visible when signed-in | No hide SoT — public `/advertise` landing / apply entry |

You + Account groups preserved. Primary nav / Home / Store Domain pages untouched.

## Gaps remaining

- Advertise is not hidden by advertiser-account membership (intentional; no inventing hide logic).
- Admin Store remains URL-only (menu exposes Admin Ads only).

## Verification

- **PASS** (in-scope)
- In-scope Vitest: PASS
- Full Vitest: 2703 passed; **3 Store failures pre-existing / out of scope**
- `npx tsc --noEmit`: **FAIL pre-existing / out of scope** — `lib/content/profilePinnedContentStructure.v1.test.ts` (`../cards`)
- `npm run build`: PASS
- `git diff --check`: PASS

## Forbidden scope

- Home / mobile bottom nav / desktop primary nav
- Store Domain pages (`/store/**`, `/seller/**`, `/admin/store/**`, cart/checkout/catalog)
- Commit / Push / Merge without explicit GO

## Next step

Await explicit **commit GO** (manual Terminal commit if Agent trailers apply).

**Proposed next feature (not started):** document Platform Navigation Capability Links follow-ups only when product picks the next GO (e.g. Advertise hide policy or Admin Store menu link) — no execution started.
