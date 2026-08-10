# POST_MIGRATION_VERIFICATION_READINESS_FINALIZATION_V1
BASE_SHA=a2100edd53c43d93f88cf3b06136f25e72694c52
PURPOSE=When Central opens migration gate, verification can run immediately.
DO_NOT_EXECUTE_VERIFICATION=YES
DO_NOT_WAIT_ONLY_REPORT=YES

## Exact verification commands (post-gate)
1. Confirm gate receipts: CERTIFICATION_MIGRATION_APPLIED=YES AND HISTORY_REGISTERED=YES AND RECONCILIATION=YES/COMPLETE
2. npx tsc --noEmit
3. npx vitest run lib/learning (domain regression must stay PASS)
4. Execute Wave15 runbook checklist against live/authorized environment:
   schema | RPC | RLS | uniqueness | revocation | verification | duplicate prevention | authorization | idempotency
5. Capture evidence logs to transfer/OUTBOX with SERVER_A3_ copies

## Expected results
- Gate receipts present and authoritative from Central
- Domain regression remains PASS
- Each checklist dimension: PASS with evidence path OR FAIL with classified root cause
- CERTIFICATION_READY only if all dimensions PASS

## Failure classification
- PRE_EXISTING_BASELINE
- CURRENT_CANONICAL_DEFECT
- STALE_TEST_EXPECTATION
- MIGRATION_DEPENDENT (should not appear if gate complete)
- REAL_CODE_DEFECT
- ENVIRONMENT_DEPENDENT
- CENTRAL_AUTHORITY_MISSING

## Evidence checklist
- [ ] Central APPLIED receipt
- [ ] Central REGISTERED receipt
- [ ] Central RECONCILED receipt
- [ ] Verification command transcripts
- [ ] Dimension PASS/FAIL matrix
- [ ] TSC + vitest domain regression
- [ ] SERVER-A3 report published

EXISTING_RUNBOOK=
CERTIFICATION_EXECUTION_READY=YES
CENTRAL_DEPENDENCIES=APPLY|REGISTER|RECONCILE|AUTHORIZE_VERIFY_GO
