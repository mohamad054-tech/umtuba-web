# Current Task

## Task title

CENTRAL_IOS_AASA_CHERRY_PICK_INTEGRATION_V1

## Status

`in_progress` — Conditional cherry-pick of AASA_SOURCE_SHA `5dbd77910b3e5f75f0f57e908af3599474ea8a41` onto current `origin/alpha-0.2`. Do NOT merge stale office branch. Do NOT invent Apple Team ID. Deploy only if AASA can be correct with real Team ID or safely returns config-missing without wrong Team ID.

## Scoreboard

```text
TASK_ID=CENTRAL_IOS_AASA_CHERRY_PICK_INTEGRATION_V1
SOURCE=PC2_IOS_AASA_PROVENANCE_CENTRAL_HANDOFF_V1
AASA_SOURCE_SHA=5dbd77910b3e5f75f0f57e908af3599474ea8a41
STALE_OFFICE_BRANCH=office/platform-translation-trunk-port-v1 (DO NOT MERGE/FF)
AUTHORITATIVE_ALPHA=origin/alpha-0.2 (re-fetch)
APPLE_TEAM_ID_REQUIRED=YES
APPLE_TEAM_ID_STATUS=PENDING_VERIFY
PUSH_REQUIRED=YES_IF_INTEGRATE_AND_TESTS_PASS
DEPLOY_POLICY=ONLY_IF_REAL_TEAM_ID_OR_SAFE_CONFIG_MISSING
UNIVERSAL_LINKS_LIVE_READY=NO_UNTIL_HTTPS_AASA_WITH_REAL_TEAM_ID
PC2_WAIT_STATE=STOP_UNTIL_NEXT_GO
```

## Allowed scope (this pass)

- Fetch/review exact `5dbd779`
- Compare vs current alpha tip
- CONDITIONAL_CHERRY_PICK_ONLY that commit onto current alpha (no stale office merge)
- Reconcile `.env.example` / `vitest.config.ts` conflicts with intended delta only
- Typecheck + AASA/vitest + relevant regression
- Push alpha if integrate+tests PASS (no force)
- Request real Apple Team ID operator packet if ABSENT
- Deploy AASA to production ONLY per Team ID rules (no fake Team ID)
- Report + TO-SERVER / TO-PC2 / TO-DESKTOP mirrors
- Update CURRENT_TASK / CURSOR_REPORT / PROJECT_STATE

## Forbidden

- Force push · merge stale office → alpha · invent/placeholder Apple Team ID
- Reopen PWA callback or UAF-12
- Play/Android mutate · expose secrets
- Publish fake Team ID in live AASA
- Wholesale overwrite alpha on conflict files

## Canonical report

`D:\umtuba-central\reports\UMTUBA_CENTRAL_IOS_AASA_CHERRY_PICK_INTEGRATION_V1.md`
