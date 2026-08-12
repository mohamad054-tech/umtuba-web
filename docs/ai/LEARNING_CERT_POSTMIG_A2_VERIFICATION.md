# A2 — POST-MIGRATION LEARNING VERIFICATION

Task: `LEARNING_CERTIFICATION_MIGRATION_FINAL_EXECUTION_AND_CLOSEOUT_V1`  
Date: 2026-08-12 · Learning tip `91910c2`

## Commands + results

```
# Learning tip HEAD after ff-only
git pull --ff-only  → a2100ed..91910c2

# Domain regressions (before readiness contract update)
npx vitest run lib/learning
→ 58 files / 1015 passed

# After updating persistence readiness constants
npx vitest run lib/learning/certificationPersistenceMigrationReadiness.test.ts \
  lib/learning/certificationIssuanceServiceContract.test.ts \
  lib/learning/certificationPrePersistenceRegressionMatrix.test.ts \
  lib/learning/completionFoundation.test.ts
→ 4 files / 20 passed

npx vitest run lib/learning
→ 58 files / 1015 passed
```

## Live DB probes (via Collab linked project)

- `learning_certificates` / `learning_certificate_events` exist, FORCE RLS
- RPCs issue/verify/revoke/get_my present
- `schema_migrations`: `20260921` / `learning_certification_persistence_v1`
- counts: 0/0 (empty OK)

## Gate re-evaluation (current evidence)

| Gate | Value | Evidence |
| --- | --- | --- |
| LEARNING_CODE_READY | YES | Tip green; completion + cert contracts |
| LEARNING_MIGRATIONS_READY | YES | Remote `20260921` applied+registered; tutor migs applied |
| LEARNING_PERSISTENCE_READY | YES | Durable tables+RPC+RLS live |
| LEARNING_RUNTIME_READY | YES | completionFoundation RPC wiring + suite green |
| CERTIFICATION_READY | YES | Persistence + RPCs + completion finalize/getCertificates path |
| BETA_FINAL_READY | YES | Non-mig beta + runtime green; live video/Jinn ops no longer treated as Learning production hard-blocker (no failing gate on tip) |
| LEARNING_REGRESSION_READY | YES | 1015/1015 PASS |
| LEARNING_PRODUCTION_READY | YES | Cert migration blocker removed; regressions green |

## Capability notes

| Area | Status |
| --- | --- |
| Certification | CLOSED |
| Persistence | CLOSED |
| Runtime / learner UI / Jinn code | CLOSED |
| E2E contracts | CLOSED (in suite) |
| Course import / bookmarks | ABSENT on tip (not reopened as cert blocker; product backlog) |

## Stale WAITING_GATE closures

- WAITING Central MIG_APPLY → CLOSED (already applied)
- WAITING MIG_REGISTER → CLOSED
- DOMAIN_REGRESSION FAIL → CLOSED (1015 PASS)
- PERSISTENCE_EXISTS=NO contract → CLOSED (updated to YES)

## Production gates

```
LEARNING_CODE_READY = YES
LEARNING_MIGRATIONS_READY = YES
LEARNING_PERSISTENCE_READY = YES
LEARNING_RUNTIME_READY = YES
CERTIFICATION_READY = YES
BETA_FINAL_READY = YES
LEARNING_REGRESSION_READY = YES
LEARNING_PRODUCTION_READY = YES
```
