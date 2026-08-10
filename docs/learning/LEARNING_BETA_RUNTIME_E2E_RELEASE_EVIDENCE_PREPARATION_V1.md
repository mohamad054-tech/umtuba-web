# Learning Beta Runtime E2E Release Evidence Preparation V1

> PREPARATION ONLY. Run AFTER Central: certification migration apply + history registration + Learning migration reconciliation.
> Do NOT mark persistence PASS before Central migration apply.
> Do NOT apply/create migrations or mutate DB on Laptop.

## Learner runtime

| CHECK | EXPECTED_RESULT | DEPENDENCY | RUN_AFTER_WHAT | OWNER |
|---|---|---|---|---|
| Login | Learner authenticates and lands in Learning shell | Auth/session | Env ready | LAPTOP (exec) / CENTRAL (env) |
| Course access | Enrolled course visible; unenrolled denied | Enrollment data | Login | LAPTOP |
| Lesson navigation | Lessons open in order / allowed sequence | Course content | Course access | LAPTOP |
| Completion flow | Lesson/module completion updates progress | Progress APIs | Lesson navigation | LAPTOP |
| Assessment flow | Required assessment attempt/score recorded | Assessment contracts | Completion path | LAPTOP |
| Progress persistence | Progress survives reload/relogin | DB persistence | Completion/assessment | LAPTOP |
| Course completion | Course marked complete when requirements met | Progress+assessment | Full learner path | LAPTOP |

## Certification boundary

| CHECK | EXPECTED_RESULT | DEPENDENCY | RUN_AFTER_WHAT | OWNER |
|---|---|---|---|---|
| Eligibility | Eligible iff completion/assessment rules met; eligibility ≠ issuance | Contracts on SoT | Course completion | LAPTOP |
| Persistence available | Durable store reachable ONLY after Central apply+register | Migration applied+history | Central migration GO complete | CENTRAL then LAPTOP |
| Verification | Public verify: VALID/REVOKED/UNKNOWN fail-closed; no private fields | Persistence + verify RPC | Persistence available | LAPTOP |
| Duplicate prevention | Second issue same learner+course deterministic | Uniqueness + RPC | Persistence available | LAPTOP |
| Authorization | Unauthorized cannot issue; public cannot mint | RLS/RPC perms | Persistence available | LAPTOP |

**Persistence PASS rule:** CHECKLIST may be prepared now; persistence-related EXPECTED_RESULT must remain BLOCKED_UNTIL_CENTRAL_APPLY until APPLIED+REGISTERED=YES.

## Beta runtime

| CHECK | EXPECTED_RESULT | DEPENDENCY | RUN_AFTER_WHAT | OWNER |
|---|---|---|---|---|
| Learner happy path | End-to-end learner path green | Runtime + content | Learner runtime checks | LAPTOP |
| Instructor path | Authoring/review path operable | Instructor runtime | Env ready | LAPTOP |
| Failed/negative paths | Fail-closed for wrong learner, unenrolled, failed assessment, unauthorized | Contracts | Happy path baseline | LAPTOP |
| Isolation checks | Learner A cannot see Learner B progress/certs | AuthZ | Negative paths | LAPTOP |

## Package readiness
CHECKLIST_READY = YES  
MIGRATION_DEPENDENCY = YES  
CENTRAL_ACTION_REQUIRED = YES (apply + register + reconcile, then explicit post-apply evidence GO)
