# Learning Production Readiness EXIT Audit V1

MODE: AUDIT ONLY — no product code changes, no regression repair, no migrations.

## Gate evaluations (evidence-based; not inflated by focused PASS)

| Gate | Value | Notes |
|---|---|---|
| LEARNING_FOUNDATION_COMPLETE | YES | Core learning modules present on SoT |
| LEARNER_RUNTIME_READY | YES | Learner runtime paths exist |
| INSTRUCTOR_RUNTIME_READY | YES | Instructor authoring surfaces exist |
| ASSESSMENT_READY | YES | Assessment contracts/tests present |
| PROGRESS_COMPLETION_READY | YES | Progress/completion contracts present |
| COURSE_COMPLETION_READY | YES | Completion → eligibility path contracted |
| CERTIFICATION_CONTRACT_READY | YES | Eligibility/verification/readiness contracts delivered across waves |
| CERTIFICATION_PERSISTENCE_READY | NO | Durable store not on SoT; migration packet pending Central |
| CERTIFICATION_ISSUANCE_READY | NO | Blocked on persistence/migration/RPC |
| AUTHORIZATION_READY | PARTIAL | Contracts exist; production issuance auth pending migration |
| MIGRATION_STATE_READY | NO | Central migration number + apply outstanding |
| DOMAIN_REGRESSION_READY | NO | lib/learning DOMAIN_REGRESSION=FAIL — Central owns triage; Laptop must NOT repair in this task |
| JINN_CONTENT_READY | PARTIAL | Content/runtime present; operational evidence incomplete |
| VIDEO_DELIVERY_READY | NO / EXTERNAL | Delivery/ops evidence not closed on Laptop |
| OPERATIONAL_EVIDENCE_READY | NO | Production ops checklist incomplete |

## Aggregate
LEARNING_CODE_READY = NO (domain regression open + cert persistence missing)  
LEARNING_PRODUCTION_READY = NO

## P0_BLOCKERS
1. PRIORITY=P0 | BLOCKER=lib/learning DOMAIN_REGRESSION FAIL | CLASSIFICATION=REGRESSION | OWNER=CENTRAL | EXACT_NEXT_ACTION=Triage and fix/quarantine failing lib/learning suite on canonical SoT | CAN_LAPTOP_CLOSE=NO | CENTRAL_ACTION_REQUIRED=YES | OPERATOR_ACTION_REQUIRED=NO
2. PRIORITY=P0 | BLOCKER=Certification durable persistence/migration not applied | CLASSIFICATION=MIGRATION | OWNER=CENTRAL | EXACT_NEXT_ACTION=Allocate migration number; author+apply schema/RPC/RLS from finalized packet | CAN_LAPTOP_CLOSE=NO | CENTRAL_ACTION_REQUIRED=YES | OPERATOR_ACTION_REQUIRED=NO
3. PRIORITY=P0 | BLOCKER=Certificate issuance not production-ready | CLASSIFICATION=INTEGRATION | OWNER=CENTRAL | EXACT_NEXT_ACTION=Wire issue/verify RPCs after migration; no fake persistence | CAN_LAPTOP_CLOSE=NO | CENTRAL_ACTION_REQUIRED=YES | OPERATOR_ACTION_REQUIRED=NO

## P1_BLOCKERS
1. PRIORITY=P1 | BLOCKER=Video delivery operational evidence incomplete | CLASSIFICATION=OPERATIONAL/EXTERNAL | OWNER=OPERATOR+CENTRAL | EXACT_NEXT_ACTION=Confirm CDN/storage/playback SLOs and prod evidence | CAN_LAPTOP_CLOSE=NO | CENTRAL_ACTION_REQUIRED=YES | OPERATOR_ACTION_REQUIRED=YES
2. PRIORITY=P1 | BLOCKER=Jinn content operational readiness partial | CLASSIFICATION=OPERATIONAL | OWNER=CENTRAL | EXACT_NEXT_ACTION=Close content publish/runtime checklist | CAN_LAPTOP_CLOSE=PARTIAL | CENTRAL_ACTION_REQUIRED=YES | OPERATOR_ACTION_REQUIRED=NO
3. PRIORITY=P1 | BLOCKER=Issuance authorization production mapping | CLASSIFICATION=INTEGRATION | OWNER=CENTRAL | EXACT_NEXT_ACTION=Bind RPC roles to production auth after migration | CAN_LAPTOP_CLOSE=NO | CENTRAL_ACTION_REQUIRED=YES | OPERATOR_ACTION_REQUIRED=NO

## TOP_10_REMAINING_LEARNING_TASKS
1. Central: triage lib/learning DOMAIN_REGRESSION
2. Central: allocate+apply certification persistence migration from packet
3. Central: ship issue/verify RPCs + RLS
4. Central: integrate verification public read-model with durable store
5. Central: production issuance auth binding
6. Operator/Central: video delivery evidence closeout
7. Central: Jinn content operational checklist
8. Central: post-migration verification test pack on remote
9. Central: Learning SoT advancement after Wave10 integration decisions
10. Stop net-new certification contract churn until persistence lands

## SHORTEST_PATH_TO_LEARNING_PRODUCTION_READY
1) Central fixes/quarantines lib/learning regression → 2) Central applies certification migration+RPC+RLS from finalized packet → 3) Wire verify/issue to durable store → 4) Close video/Jinn operational evidence → 5) Re-run Learning domain regression green on SoT.

## TASKS_THAT_SHOULD_STOP
- Further Laptop certification contract-only waves that cannot progress without persistence
- Laptop attempts to "repair" lib/learning domain regression under Central triage
- Fake persistence / invented issuance / allocation of migration numbers on Laptop
- Parallel product redesigns of certification while migration packet is pending Central execution

## Verdict
VERDICT = EXIT_AUDIT_COMPLETE_NOT_PRODUCTION_READY  
LEARNING_PRODUCTION_READY = NO  
RECOMMENDED_NEXT_STEP = Central owns regression triage + migration execution; pause non-essential Laptop Learning churn
