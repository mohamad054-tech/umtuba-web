# CERTIFICATION_EXECUTION_READINESS_FINAL_V2
BASE=a2100edd53c43d93f88cf3b06136f25e72694c52
NO_MIGRATION_EXECUTE=YES
NO_WAITING_REPORT=YES
PURPOSE=Immediate post-unlock execution packet (commands + evidence + expected outputs)

## GATE_PREREQ (Central must confirm before run)
CERTIFICATION_MIGRATION_APPLIED=YES
CERTIFICATION_MIGRATION_HISTORY_REGISTERED=YES
LEARNING_MIGRATION_RECONCILIATION=YES_OR_COMPLETE
CENTRAL_VERIFY_GO=YES

## VERIFICATION_COMMANDS (run after unlock only; do not invent credentials)
1. git -C LEARNING_SOT fetch --all --prune && git rev-parse HEAD
2. npx tsc --noEmit
3. npx vitest run lib/learning
4. Focused adapters (as available): learnerDelivery lessonContentAccess assessmentDelivery progressMutations completionFoundation instructorExperience certification*
5. Capture migration history / schema probe receipts from Central (read-only; Laptop does not apply)
6. Publish SERVER_A3 certification verification evidence packet

## EVIDENCE_CHECKLIST
[ ] Central gate receipts present (APPLIED+REGISTERED+RECONCILED+GO)
[ ] Tip SHA recorded
[ ] tsc PASS
[ ] domain regression PASS (lib/learning)
[ ] focused certification-related tests PASS or classified fail
[ ] post-mig persistence surfaces exercised OR blocked with OWNER class
[ ] evidence paths linked in OUTBOX report
[ ] SERVER_A3 copy published
[ ] NO fake PASS for blocked surfaces

## EXPECTED_OUTPUTS
- LEARNING_CERTIFICATION_VERIFICATION_EVIDENCE_*.txt (post-exec)
- TSC=PASS DIFF_CHECK=PASS DOMAIN_REGRESSION=PASS (or classified FAIL)
- CERTIFICATION_VERIFICATION_EXECUTED=YES only after live run
- READY_FOR_INTEGRATION based on 0/0 push + clean tree
- VERDICT=CERT_VERIFY_PASS|CERT_VERIFY_BLOCKED_<CLASS> (never invent PASS)

## HARD_PROHIBITIONS
- Do NOT apply/register/create migrations
- Do NOT execute until Central GO receipts verified
