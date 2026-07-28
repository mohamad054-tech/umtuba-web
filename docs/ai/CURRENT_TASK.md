# Current Task

## Task title

Home Readiness Guardrails V1

## Status

`verification-pass` — **STAGED** — ready for manual commit (Agent stopped before commit).

## Branch / sync

- **Branch:** `office/home-readiness-guardrails-v1`
- **Base:** `424897530272e8f81504497bbee54ad3b11f6d9b` (`origin/alpha-0.2`)
- **Checkout:** feature branch (not merged)
- **Commit / Push / Merge:** not performed

## Product decision (frozen)

- **Home Lock Active:** `HOME_LOCK_ACTIVE = true`
- **Locked surfaces:** feed · swipe · ranking · player · circles-layout · engagement · home-shell
- Path inventory + contracts + Vitest guard accidental Home edits
- **Preferred Flow** `Home → Creator Space → Content` remains **documentation only** (not implemented on Home)
- Later Home changes need **Product GO** + **explicit Home unlock**
- **No actual Home behavior/visual changes** in this phase
- No new redirects; no route changes

## Verification

- **PASS** (in-scope)
- In-scope Vitest: **PASS**
- Full Vitest: **2730 passed**; **3 Store failures pre-existing / out of scope**
  - `lib/store/paymentOutcomeSync.test.ts` (1)
  - `lib/store/storeRemoteE2eSandboxScripts.test.ts` (2)
- `npx tsc --noEmit`: **FAIL pre-existing / out of scope** — `lib/content/profilePinnedContentStructure.v1.test.ts` (`../cards`)
- `npm run build`: **PASS**
- `git diff --check`: **PASS**

## Forbidden scope

- Any Home visual/behavioral change
- feed / swipe / ranking / player / circles / engagement / CTA / funnel
- Watch redesign / Creator Space UI / Store Domain / Mobile primary
- New redirects / route changes / unlocking Home
- Commit / Push / Merge without explicit GO

## Next step

Manual Terminal commit (no Git trailers), then Merge Readiness / FF merge when approved.

**Proposed next (not started):** Content-flow Home Implementation V1 only after Product GO + Home unlock; or Advertise Hide Policy Decision V1 (no Home changes).
