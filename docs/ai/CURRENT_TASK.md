# Current Task

## Task title

Platform Navigation Secondary Surface Cleanup V1

## Status

`verification-pass` — **UNCOMMITTED** — awaiting explicit commit GO.

## Branch / sync

- **Branch:** `office/platform-navigation-secondary-surface-cleanup-v1`
- **Base:** `fe4dc799a1f016f100ef1a45323b12c0e216d16f` (`alpha-0.2`)
- **Checkout:** feature branch (not merged)

## What was implemented

Classified secondary / legacy / experimental surfaces as **non-primary** (routes kept; not deleted or disabled):

| Surface | Kind |
| --- | --- |
| Living Navigation overlays | prototype-overlay — **not** official Platform chrome (Watch prototype only; internal placement.group ≠ app primary) |
| `/feed` | experimental |
| `/journey-pro` | experimental |
| `/post-journey` | legacy |
| `/live/media-lab` | lab (hide exception in mobileNav only) |
| `/city/*` | experimental |

**Chrome exclusion contracts** (`secondarySurfaceContract` + shell tests): forbidden from Desktop `APP_NAV_ITEMS`, Mobile `MOBILE_PRIMARY_NAV_ITEMS`, and UserMenu baseline.

## Verification

- **PASS** (in-scope)
- In-scope Vitest: PASS (51)
- Full Vitest: 2715 passed; **3 Store failures pre-existing / out of scope**
- `npx tsc --noEmit`: **FAIL pre-existing / out of scope** — `lib/content/profilePinnedContentStructure.v1.test.ts` (`../cards`)
- `npm run build`: PASS
- `git diff --check`: PASS

## Forbidden scope

- Home / Watch redesign / primary nav changes / Content-flow / Store Domain / route deletion
- Commit / Push / Merge without explicit GO

## Next step

Await explicit **commit GO** (manual Terminal commit if Agent trailers apply).

**Proposed next feature (not started):** Platform Navigation Mobile World Affordance Decision V1 (optional World on mobile — product decision) — no execution started.
