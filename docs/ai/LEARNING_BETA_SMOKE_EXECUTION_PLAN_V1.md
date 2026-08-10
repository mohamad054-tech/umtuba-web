# BETA_SMOKE_EXECUTION_PLAN_V1
BASE=a2100edd53c43d93f88cf3b06136f25e72694c52
NO_EXECUTION_YET=YES
GATE_PREREQ=CERTIFICATION_MIGRATION_APPLIED=YES AND HISTORY_REGISTERED=YES AND RECONCILIATION=YES/COMPLETE AND CENTRAL_VERIFY_GO

## FLOW
1. Confirm Central gate receipts in transfer INBOX/OUTBOX
2. Auth learner session (authorized beta env only)
3. Course browse -> enroll/access
4. Lesson navigate -> content render
5. Assessment start/submit (post-persistence if gate enables)
6. Progress update observe
7. Completion path observe
8. Instructor navigation smoke
9. Authorization negatives (unauth/wrong learner)
10. Publish SERVER_A3 smoke evidence report

## TESTS
- npx tsc --noEmit
- npx vitest run lib/learning (must remain PASS)
- Focused: learnerDelivery, lessonContentAccess, assessmentDelivery, progressMutations, completionFoundation, instructorExperience
- Live smoke checklist (post-gate only; no invent credentials)

## EXPECTED_RESULTS
- Gate receipts present
- Domain regression PASS
- Each flow step: PASS with evidence OR FAIL classified (ENV|CODE|MIG|EXTERNAL)
- No fake PASS for blocked live surfaces
- BETA_SMOKE_EXECUTED=YES only after live run under Central authority
