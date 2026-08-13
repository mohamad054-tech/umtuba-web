# CURSOR_REPORT — LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1

## Summary

Laptop executed a real-user whole-platform UX/functional QA sweep against production `https://umtuba.com` (guest) plus local source at `e2b97b6`. Method: USE → REPRODUCE → FIND → FIX SAFE DEFECTS → TEST → REPORT. **No product-code fixes.** Every reproduced defect was Home-locked, Store-owned, World/Live/Search/Central-owned, Learning-data, or blocked on auth. Central auth/i18n landing fixes (`2df90a2`) are on production and **not** in this Laptop branch; those UAFs were not re-implemented.

**WHOLE_PLATFORM_UX_QA_VERDICT = FAIL_WITH_FINDINGS.** Guest entry (Home, Welcome, Signup, Login, Catalog preview, auth gates) is usable. Users will still hit Explore This City no-op, empty World, hanging Search, video-only Create, sandbox Store, internal Learning copy, and no language control. Authenticated profile/messages/lesson/quiz/delete journeys were not runnable.

## Exact files changed

- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1.md`

Pre-existing uncommitted Learning Premium UX from the prior wave remains in the working tree and is **out of this task’s scope**.

## Migrations created

None.

## Security review

Guest-only. No production account created. No privileged writes. No secrets read. Store/Home/World/Learning domain files not edited. Auth callback fail-closed confirmed.

## Tests

N/A this wave (docs only).

## TypeScript

N/A this wave.

## Build

N/A this wave.

## git diff --check

Not required for docs-only; no product patch.

## git status --short

Uncommitted Learning Premium UX from the previous wave plus this wave’s docs. No commit/push.

## Open issues

See findings WP-QA-01..16 in `docs/ai/LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1.md`. Laptop STOP. Central triage.

---

# LAPTOP REPORT

SOURCE_DEVICE = LAPTOP  
DEVICE_ROLE = WHOLE_PLATFORM_USER_EXPERIENCE_QA  
TASK_ID = LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1

## AUTHORITATIVE_BASE

`e2b97b6aa2dbeefff2890ccd4286baca71102ca6` on `office/um-core-platform-manifest-validation-p2`. Production includes Central `2df90a2` (UAF-02/03/06/08) not present locally.

## ENVIRONMENT_TESTED

Production `https://umtuba.com` guest browser QA; local source for ownership; viewports desktop ~1905px, 390×844, 360×800. No authenticated session.

## USER_JOURNEYS_TESTED

Landing/Welcome, nav, signup (incl. empty validation), login (`next` preserve), forgot-password, auth callback, Home feed + Follow gate, Create/Upload hrefs, Search empty + query, World stub, Learning catalog + JA-01 landing, Messages/Profile/Settings/Create gates, Store observe, Live/Games unavailable, mobile Welcome/Home/Login/World. Blocked: logout, profile edit, messages compose, lesson/quiz/AI Tutor, post delete, username, RTL switch.

## TOTAL_FINDINGS

16 (WP-QA-01..16)

## P0_COUNT

0

## P1_COUNT

0

## P2_COUNT

9

## P3_COUNT

7

## DEAD_BUTTONS_FOUND

0 confirmed. Automation often failed to follow Next.js client navigations while hrefs/handlers were valid (View Course, Start Course, Go Live). Live “Try again” is failed recovery (WP-QA-06), not a silent dead control.

## WRONG_NAVIGATION_FOUND

3 — Explore This City → `/?focus=umtuba`; Download App → `/welcome`; Create/Upload → `/create/video` only.

## MOBILE_DEFECTS_FOUND

1 — Home section circles clipped at 390px (WP-QA-15). No document horizontal overflow at 360/390 on Home/Welcome.

## RTL_I18N_DEFECTS_FOUND

1 — No visible language switcher; `html lang="en"` always (WP-QA-12 / UAF-03).

## ACCESSIBILITY_FINDINGS

Duplicate H1 (P3); hardcoded `lang=en` (P2); signup `role=alert` PASS with tight error contrast (P3); keyboard pass BLOCKED; search loading has no failure state (P2); icon-only controls generally named PASS.

## UAF01_STATUS

PARTIAL — API allows text/image; primary Home Create/Upload is `/create/video`. Home lock.

## UAF02_STATUS

PASS on production (2-step). OWNED_ELSEWHERE locally. Do not duplicate.

## UAF03_STATUS

OWNED_ELSEWHERE / BLOCKED on tested surfaces. No switcher found. Do not duplicate Central fix.

## UAF04_STATUS

PARTIAL / BLOCKED — Home duplicates Learning; authenticated lesson overlap not tested; Premium learner nav not on production.

## UAF05_STATUS

PASS — callback without tokens fail-closed.

## UAF06_STATUS

PASS on production (“Join UMTUBA”). OWNED_ELSEWHERE locally (`Join Beta` still in `LandingHero.tsx`).

## UAF07_STATUS

FAIL — reproduced `/?focus=umtuba`. Assign Central. Home lock.

## UAF08_STATUS

PASS on production (Profile copy + `next` preserved). OWNED_ELSEWHERE locally (`/discover` default).

## UAF09_STATUS

FAIL / BLOCKED — `/world` has no globe or controls.

## UAF10_STATUS

PARTIAL — Welcome Start Exploring → Home PASS. World globe N/A. Home city CTA is UAF-07.

## UAF11_STATUS

BLOCKED — needs auth.

## UAF12_STATUS

FAIL (source) / BLOCKED (runtime) — no own-post delete UI.

## SAFE_FIXES_IMPLEMENTED

none

## FILES_CHANGED

`docs/ai/CURSOR_REPORT.md`, `docs/ai/CURRENT_TASK.md`, `docs/ai/PROJECT_STATE.md`, `docs/ai/LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1.md`

## TEST_RESULTS

N/A (docs only)

## TYPECHECK

N/A this wave

## BUILD_RESULT

N/A this wave

## NEW_REGRESSION

none from this wave

## FINDINGS_ASSIGNED_TO_CENTRAL

WP-QA-01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16. Also: fast-forward Laptop onto `2df90a2`.

## FINDINGS_ASSIGNED_TO_DESKTOP

none

## FINDINGS_ASSIGNED_TO_PC2

none (WP-QA-10 store URLs only if Central wants real install links)

## REMAINING_FINDINGS

All 16 WP-QA items OPEN. Auth-blocked: UAF-04 lesson overlap, UAF-11, UAF-12 runtime, Learning lesson/quiz/cert/AI Tutor.

## WHOLE_PLATFORM_UX_QA_VERDICT

FAIL_WITH_FINDINGS — guest public entry usable; not a whole-platform PASS.

## CENTRAL_ACTION_REQUIRED

YES. Triage WP-QA-01 (UAF-07), WP-QA-02 (World), WP-QA-04 (Store sandbox), WP-QA-09 (Search hang) first. Do not ask Laptop to edit Home-locked or Store files. Learning Premium UX still uncommitted on Laptop and not on production.

## NEXT_ACTION_REQUIRED

STOP. Do not start another Laptop wave. Authenticated sweep needs a Central-issued non-production test account.

---

## Per-finding records

Full EXPECTED/ACTUAL for each ID is in `docs/ai/LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1.md`. Compact:

| FINDING_ID | SURFACE | SEVERITY | REPRODUCED | OWNER | FIX_IMPLEMENTED | TEST_RESULT | STATUS |
|---|---|---|---|---|---|---|---|
| WP-QA-01 | Home Explore This City | P2 | YES | CENTRAL (Home lock) | NO | N/A | OPEN |
| WP-QA-02 | /world | P2 | YES | CENTRAL / World | NO | N/A | OPEN |
| WP-QA-03 | Learning catalog copy | P2 | YES | CENTRAL / Learning data | NO | N/A | OPEN |
| WP-QA-04 | Store sandbox | P2 | YES | CENTRAL / Store | NO | N/A | OPEN |
| WP-QA-05 | Title `\| UMTUBA \| UMTUBA` | P3 | YES | CENTRAL / metadata | NO | N/A | OPEN |
| WP-QA-06 | Live retry | P2 | YES | CENTRAL / Live | NO | N/A | OPEN |
| WP-QA-07 | Games unavailable | P3 | YES | CENTRAL | NO | N/A | OPEN |
| WP-QA-08 | Nav redundancy | P3 | YES | CENTRAL | NO | N/A | OPEN |
| WP-QA-09 | Search hang | P2 | YES | CENTRAL / Search | NO | N/A | OPEN |
| WP-QA-10 | Download App → /welcome | P3 | YES | CENTRAL / Learning | NO | N/A | OPEN |
| WP-QA-11 | Duplicate H1 | P3 | YES | CENTRAL / Learning UI | NO | N/A | OPEN |
| WP-QA-12 | No language switcher | P2 | YES | CENTRAL (UAF-03) | NO | N/A | OPEN / OWNED_ELSEWHERE |
| WP-QA-13 | Create video-only CTA | P2 | YES | CENTRAL (Home lock) | NO | N/A | OPEN |
| WP-QA-14 | Post delete missing | P2 | source YES / runtime BLOCKED | CENTRAL / social | NO | N/A | OPEN |
| WP-QA-15 | Mobile circles clip | P3 | YES | CENTRAL (Home lock) | NO | N/A | OPEN |
| WP-QA-16 | Untitled video | P3 | YES | CENTRAL / content | NO | N/A | OPEN |
