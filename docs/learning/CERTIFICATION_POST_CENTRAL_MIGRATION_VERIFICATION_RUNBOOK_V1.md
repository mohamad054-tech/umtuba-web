# Certification Post-Central-Migration Verification Runbook V1

> Execute ONLY after Central confirms: MIGRATION_APPLIED=YES and MIGRATION_HISTORY_REGISTERED=YES.
> Do NOT claim persistence PASS before that evidence.
> Consumes: certification runtime prep, blocker triage matrix, migration contract packet.

## DEPENDENCY_STATUS (current)
- MIGRATION_CREATED = YES (prior evidence)
- MIGRATION_APPLIED = NO (until Central confirms)
- MIGRATION_HISTORY_REGISTERED = NO (until Central confirms)
- Bucket: CENTRAL_ACTION_REQUIRED until both YES
- Then: READY_AFTER_CENTRAL_MIGRATION for runbook execution

## Execution sequence (post-confirm)

### 1. Schema verification
- Table/entity exists; id, learner_id, course_id, status, issued_at present
- PASS ⇒ continue; FAIL ⇒ stop, Central schema repair

### 2. RPC verification
- issue + verify/get RPCs exist with expected signatures/permissions
- PASS ⇒ continue

### 3. RLS verification
- Public-safe fields only; private fields not leaked; cross-learner isolation

### 4. Uniqueness verification
- Active ISSUED unique (learner_id, course_id); duplicate insert rejected

### 5. Revocation verification
- REVOKED never VALID; status transition durable

### 6. Verification endpoint / read model
- VALID / REVOKED / UNKNOWN fail-closed; no private exposure

### 7. Duplicate issuance protection
- Second issue deterministic (ALREADY_ISSUED or existing id)

### 8. Authorization checks
- Unauthorized cannot issue; public cannot mint

### 9. Idempotency checks
- Repeated eligibility issues nothing; concurrent duplicates safe

## Separation
| READY_AFTER_CENTRAL_MIGRATION | CENTRAL_ACTION_REQUIRED |
|---|---|
| Run steps 1–9 after apply+register confirmed | Apply migration; register history; confirm evidence to Laptop |

VERIFICATION_RUNBOOK_READY = YES
