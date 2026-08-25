# Current Task — Launch closeout Phase 3 final production QA V1

**TASK_ID** = `CENTRAL_UMTUBA_LAUNCH_CLOSEOUT_PHASE3_FINAL_PRODUCTION_QA_V1`
**DATE** = 2026-08-25
**STATUS** = IN_PROGRESS
**MODE** = FINAL PRODUCTION-WIDE LAUNCH QA (NO NEW FEATURES)
**MACHINE** = WIN-MJRKAKK2MEH / CENTRAL
**AUTHORITY** = CENTRAL
**PREVIOUS_GATES** = PHASE1_CLOSEOUT PASS, PHASE2_LOCALIZATION_CLOSEOUT PASS
**CLAIMED_LIVE** = b2c0bbd1-20260825100900 / SHA b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
**NEXT_PHASE** = PHASE4_MOBILE_STORES_AND_RELEASE_READINESS (do not start)

## Allowed scope

- Read-only production QA against actual live UMTUBA
- Public HTTPS + browser MCP / headless
- Auth guest boundaries and recovery delivery checks without inventing credentials
- Legitimate existing authorized test/owner accounts only if already available
- Classify Phase 2 P2/P3 as LAUNCH_BLOCKER / ACCEPTED_DEFERRED / FIX_NOW_ONLY_IF_LOW_RISK
- Update handoff docs and Phase 3 report
- Source change ONLY for a genuine newly found P0/P1 launch blocker

## Forbidden scope

- NO new features
- NO redesign
- NO optional cleanup
- NO migration; DO NOT apply 20260934
- NO RLS bypass
- NO fake products/orders/content
- NO real payment activation (`REAL_PAYMENT_CAPTURE` stays DISABLED)
- NO unnecessary credential reset
- NO mobile-native
- Do not repeat the closed 13-locale audit unless new evidence
- Do not reopen Google indexing work
- Do not reopen Learning/Store design
- Never print `/etc/umtuba/production/umtuba.env` or secrets
- Never force push
- Do not redeploy merely for a new release number if no source change

## Goal

Final production-wide launch QA against ACTUAL live UMTUBA. Identify only genuine launch blockers.
`WEB_LAUNCH_READY` / `PHASE3_FINAL_PRODUCTION_QA` = PASS only if no P0/P1 launch blockers remain.
