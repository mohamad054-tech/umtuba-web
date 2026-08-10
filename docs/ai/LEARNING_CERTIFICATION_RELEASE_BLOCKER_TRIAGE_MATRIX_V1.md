# Certification Release Blocker Triage Matrix V1

Evidence: certification prep completed; migration CREATED=YES; APPLIED=NO; HISTORY_REGISTERED=NO.
Do NOT create/apply migration or register history on Laptop.

## CERTIFICATION_STATUS_MATRIX

| ITEM | STATUS | BUCKET | OWNER | DEPENDENCY | CLOSE_CONDITION |
|---|---|---|---|---|---|
| CERTIFICATION_SCHEMA_READY | READY_AFTER_MIGRATION | BLOCKED_UNTIL_CENTRAL_ACTION | CENTRAL | created migration file | Applied schema exists on target |
| CERTIFICATION_RPC_READY | READY_AFTER_MIGRATION | BLOCKED_UNTIL_CENTRAL_ACTION | CENTRAL | schema+RPC in migration | issue/verify RPCs exist + perms |
| CERTIFICATION_RLS_READY | READY_AFTER_MIGRATION | BLOCKED_UNTIL_CENTRAL_ACTION | CENTRAL | RLS in migration | Public-safe verify; no private leak |
| CERTIFICATION_UNIQUENESS_READY | READY_AFTER_MIGRATION | BLOCKED_UNTIL_CENTRAL_ACTION | CENTRAL | unique constraint | Duplicate active ISSUED rejected |
| CERTIFICATION_REVOCATION_READY | READY_AFTER_MIGRATION | BLOCKED_UNTIL_CENTRAL_ACTION | CENTRAL | status/revocation columns | REVOKED ≠ VALID |
| CERTIFICATION_VERIFICATION_READY | PARTIAL_CONTRACTS / READY_AFTER_MIGRATION | BLOCKED_UNTIL_CENTRAL_ACTION for durable | CENTRAL+LAPTOP | apply+register | Post-apply verify checklist PASS |
| CERTIFICATION_IDEMPOTENCY_READY | READY_AFTER_MIGRATION | BLOCKED_UNTIL_CENTRAL_ACTION | CENTRAL | uniqueness+RPC semantics | Deterministic duplicate issue |

## CENTRAL_ACTIONS_REQUIRED
1. Apply certification migration
2. Register migration history
3. Learning migration reconciliation
4. Issue new GO for post-apply verification / beta evidence execution

## MIGRATION_DEPENDENCIES
ALL durable certification production gates depend on APPLIED=YES and REGISTERED_HISTORY=YES.

## BLOCKERS
- APPLIED_MIGRATION=NO
- REGISTERED_HISTORY=NO
- Durable verification/issuance blocked until Central actions

## VERDICT
TRIAGE_MATRIX_READY_WAITING_CENTRAL_APPLY
