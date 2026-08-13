# UMTUBA Project State (AI Handoff)

## Latest Laptop delivery

**Task:** `LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1`  
**Status:** handed off to Central/Server — QA complete, **no product fixes**, STOP  
**Report:** `docs/ai/CURSOR_REPORT.md`  
**Detail:** `docs/ai/LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1.md`

Verdict: **FAIL_WITH_FINDINGS**. Guest public entry usable. 0 P0 / 0 P1 / 9 P2 / 7 P3. Central owns remaining defects (Home lock, World, Store, Search, Live, i18n visibility, catalog content). Authenticated journeys BLOCKED (no test account).

## Prior Laptop delivery still uncommitted

**Task:** `LAPTOP_LEARNING_PREMIUM_UX_UI_OVERHAUL_V1`  
Presentation-only Learning UX remains in the working tree on `office/um-core-platform-manifest-validation-p2`. Not on production. Do not mix into a QA commit.

## Branch / base

- Branch: `office/um-core-platform-manifest-validation-p2`
- HEAD: `e2b97b6aa2dbeefff2890ccd4286baca71102ca6`
- Production includes Central `2df90a2` (UAF-02/03/06/08) not in this Laptop HEAD

## Parked performance state (separate queue)

- Prefetch patch Central-owned; last live check: RSC ~35 (not deployed)
- Next after Central accepts: optional visual QA + commit of Learning UX; performance resume remains parked

## Domain locks

Learning CLOSED (domain/migrations/cert) · Collaboration CLOSED · LB003 CLOSED · Home lock ACTIVE · Store = Central
