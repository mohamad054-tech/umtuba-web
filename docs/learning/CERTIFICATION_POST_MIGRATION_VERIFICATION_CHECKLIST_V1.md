# Certification Post-Migration Verification Checklist V1

> Prepared by LAPTOP-A1. Execute ONLY after Central allocates, creates, applies, and registers the certification migration.
> Laptop MUST NOT create/apply migrations or mutate DB.
> Do NOT treat this checklist as evidence that migration already ran.

## Central execution gates (must all be YES before running checklist against prod/staging)

| Gate | Required |
|---|---|
| ALLOCATED_MIGRATION | YES (Central-owned number) |
| CREATED_MIGRATION | YES (migration file on SoT) |
| APPLIED_MIGRATION | YES (applied to target DB) |
| REGISTERED_HISTORY | YES (migration history registered) |

## Current Laptop evidence snapshot

- CURRENT_LEARNING_SOT = umtuba-web-learning-ai-tutor-learner-ui-integration-v1 / office/learning-ai-tutor-learner-ui-integration-v1
- CURRENT_HEAD = 4f9891811f37d6f64e79af07fbe4f53079463360
- ALLOCATED_MIGRATION = YES
- CREATED_MIGRATION = YES
- APPLIED_MIGRATION = NO
- REGISTERED_HISTORY = NO
- Evidence notes: CREATED_MIGRATION_FILES=20260855_learning_completion_foundation_v1.sql,20260856_learning_instructor_experience_foundation_v1.sql | PACKET_ON_SOT=True | MIGRATION_LIST_CAPTURED=YES | LATEST_MIGRATIONS=20260876_learning_ai_tutor_thread_lifecycle_foundation_v1.sql,20260875_learning_ai_tutor_thread_resume_history_read_v1.sql,20260874_learning_ai_tutor_thread_lesson_binding_v1.sql,20260873_learning_ai_tutor_thread_metadata_read_v1.sql,20260872_learning_ai_tutor_thread_persistence_bridge_v1.sql,20260871_ai_core_platform_foundation_v1.sql,20260870_store_marketplace_listing_checkout_alignment_v1.sql,20260869_store_marketplace_supplier_seller_foundation_v1.sql

## A. Schema verification
1. Table/entity for certificates exists (per packet; e.g. learning_certificates or Central-final name).
2. Columns present: stable certificate id (PK/UUID), learner_id, course_id, status, issued_at.
3. Optional audit columns if in packet: issued_by, revoked_at, revoked_by, revoke_reason.
4. Types/nullability match packet (issued_at required when ISSUED).
5. No unintended tables/columns from unrelated domains.

## B. Uniqueness / indexes
1. UNIQUE (learner_id, course_id) for active ISSUED rows (or equivalent partial unique).
2. Supporting indexes for verification lookup by certificate id.
3. Attempt duplicate active insert fails deterministically.

## C. RPC existence / signature / permissions
1. issue_certificate (or Central-final name) exists with expected args (learner_id, course_id, ...).
2. verify_certificate / get_certificate public verify RPC exists.
3. Permissions: only authorized roles can issue; public/anon cannot mint.
4. Verify RPC callable for public-safe read path as designed.
5. Unauthorized issue fails closed.

## D. RLS behavior
1. Public verification returns ONLY public-safe fields.
2. Private fields (internal learner id raw, enrollment snapshots, issuer internals) not exposed on public path.
3. Learners cannot INSERT/UPDATE certificates except via authorized RPC path.
4. Cross-learner isolation holds.

## E. Revocation behavior
1. REVOKED certificate never verifies as VALID.
2. Status transition to REVOKED is explicit and durable.
3. Verification status reflects REVOKED distinctly from UNKNOWN/INVALID.

## F. Verification behavior
1. Known non-revoked certificate → VALID with public-safe display boundaries.
2. Unknown certificate id → UNKNOWN (fail closed, not VALID).
3. Invalid/empty id → INVALID/fail closed.
4. Missing store (pre-migration) path remains fail closed if ever hit.

## G. Idempotency / duplicate issuance prevention
1. Second issue for same learner+course is deterministic (ALREADY_ISSUED or returns existing id — Central semantics).
2. No duplicate active ISSUED rows.
3. Repeated eligibility evaluation still issues nothing by itself.
4. Concurrent duplicate issue attempts do not create two active rows.

## H. Regression / safety boundaries
1. Do NOT require repairing known lib/learning DOMAIN_REGRESSION as part of this checklist.
2. No fake certificates, no PDF generation, no Commerce/Translation coupling.
3. Confirm migration history registration matches applied version.

## Exit criteria after Central execution
- All gates ALLOCATED/CREATED/APPLIED/REGISTERED = YES
- Sections A–G PASS on target environment
- Then Central may open post-migration integration of issuance/verify runtime
