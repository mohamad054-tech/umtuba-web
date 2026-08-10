# Certification Post-Migration Verification Preparation V1

> PREPARATION ONLY — run AFTER Central apply + history registration.
> Laptop MUST NOT apply migration, create migration, or mutate DB.

## Current known state
- Migration created = YES
- Applied = NO
- History registered = NO (until Central completes)

## Exact post-apply verification checklist (for Central)

### 1. Schema exists
- [ ] Certificate table/entity present (Central-final name)
- [ ] Columns: id (stable identity), learner_id, course_id, status, issued_at
- [ ] Optional audit: issued_by, revoked_at, revoked_by, revoke_reason

### 2. RPC available
- [ ] issue RPC exists with expected signature
- [ ] verify/get public verification RPC exists
- [ ] Permissions: unauthorized issue denied; public cannot mint

### 3. RLS correct
- [ ] Public verify returns only public-safe fields
- [ ] Private fields never exposed on public path
- [ ] Cross-learner isolation holds

### 4. Uniqueness enforced
- [ ] Unique active ISSUED (learner_id, course_id) or equivalent
- [ ] Duplicate active insert fails deterministically

### 5. Revocation supported
- [ ] REVOKED never verifies as VALID
- [ ] Status transition durable and explicit

### 6. Verification boundary works
- [ ] Known non-revoked → VALID (public-safe)
- [ ] Unknown id → UNKNOWN fail-closed
- [ ] Invalid/empty → INVALID/fail-closed

### 7. Idempotency works
- [ ] Second issue same learner+course deterministic
- [ ] No duplicate active ISSUED rows
- [ ] Eligibility alone still issues nothing

## Exit
All boxes PASS on target after Central apply+register → then Central may open runtime wiring GO.
