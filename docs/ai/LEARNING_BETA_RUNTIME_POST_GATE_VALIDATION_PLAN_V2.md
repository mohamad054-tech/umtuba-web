# BETA_RUNTIME_POST_GATE_VALIDATION_PLAN_V2
BASE=a2100edd53c43d93f88cf3b06136f25e72694c52
CONSUMED_WAVE24_A1=True
SMOKE_EXECUTED=NO
GATE_PREREQ=APPLIED+REGISTERED+RECONCILED+CENTRAL_SMOKE_OR_VERIFY_GO

## FINAL_SEQUENCE (ordered)
1. GATE_CONFIRM - Central receipts present
2. LEARNER - auth, browse, enroll/access, lesson render
3. INSTRUCTOR - navigate instructor surfaces, verify authorized views
4. ASSESSMENT - start/submit post-persistence path
5. PROGRESS - observe progress mutations
6. COMPLETION - completion foundation path
7. AUTHORIZATION - negatives: unauth / wrong learner / wrong role
8. ISOLATION - tenant isolation checks (or EXTERNAL block if ops evidence missing)
9. EVIDENCE - publish SERVER_A3 beta smoke evidence; classify each step PASS|FAIL(ENV|CODE|MIG|EXTERNAL)

## TESTS_BEFORE_LIVE
- npx tsc --noEmit
- npx vitest run lib/learning
- focused: learnerDelivery instructorExperience assessmentDelivery progressMutations completionFoundation

## HARD_RULES
- No invent credentials
- No fake PASS
- Do not execute live smoke until gate confirmed
- Isolation OPEN remains EXTERNAL-owned unless evidence pack exists
