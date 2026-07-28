# Current Task

## Task title

Platform Navigation Mobile World Affordance Decision V1

## Status

`verification-pass` — **UNCOMMITTED** — awaiting explicit commit GO.

## Branch / sync

- **Branch:** `office/platform-navigation-mobile-world-affordance-decision-v1`
- **Base:** `63896af99a28667461521e3b96e0d37071f4d3c3` (`alpha-0.2`)
- **Checkout:** feature branch (not merged)

## Product decision (frozen)

- **World** remains in **Desktop primary**.
- **World** is **not** in **Mobile bottom primary**.
- Mobile reachability: Home circles + direct `/world` links (circles layout unchanged).
- **Store** and **Watch** are **not** Mobile primary tabs.
- Revisiting requires a **separate Product GO**.

Docs + contract tests only — no visual/route behavior changes; Mobile bottom nav items unchanged.

## Verification

- **PASS** (in-scope)
- In-scope Vitest: PASS
- Full Vitest: 2720 passed; **3 Store failures pre-existing / out of scope**
- `npx tsc --noEmit`: **FAIL pre-existing / out of scope** — `lib/content/profilePinnedContentStructure.v1.test.ts` (`../cards`)
- `npm run build`: PASS
- `git diff --check`: PASS

## Forbidden scope

- Home / circles layout / Desktop primary changes / adding World|Store|Watch to mobile bottom nav
- Content-flow / Store Domain
- Commit / Push / Merge without explicit GO

## Next step

Await explicit **commit GO** (manual Terminal commit if Agent trailers apply).

**Proposed next feature (not started):** Content-flow Policy Decision V1 (Home → Creator Space preferred article path) — requires explicit Product GO; Home remains locked until then. No execution started.
