# Certification Migration Execution Packet (FINALIZATION V1)

> MODE: CONTRACT / MIGRATION EXECUTION PACKET PREPARATION ONLY  
> NO migration file creation. NO migration apply. NO product implementation.  
> Central owns migration numbering.

## Authoritative resolution

| Key | Value |
|---|---|
| PERSISTENCE_EXISTS | NO (durable certificate store not on canonical Learning SoT) |
| MIGRATION_REQUIRED | YES |
| SCHEMA_REQUIRED | YES |
| RPC_REQUIRED | YES |
| RLS_REQUIRED | YES |
| UNIQUENESS_REQUIRED | YES |
| REVOCATION_REQUIRED | YES |
| VERIFICATION_STORAGE_REQUIRED | YES |
| IDEMPOTENCY_REQUIRED | YES |
| AUDITABILITY_REQUIRED | YES |
| CENTRAL_MIGRATION_NUMBER_REQUIRED | YES (Central allocates; Laptop MUST NOT allocate) |

## Future Central migration packet (executable by Central)

### 1. Table / entity boundary
- Entity: `learning_certificates` (name final by Central)
- Stable certificate identity: UUID primary key `id`
- Learner binding: `learner_id` (auth subject / profile FK — exact FK by Central)
- Course binding: `course_id`
- Issuance status: enum/text `status` ∈ {ISSUED, REVOKED}
- Issued timestamp: `issued_at` timestamptz NOT NULL when ISSUED
- Verification identity: public-safe lookup by `id` only
- Optional audit columns: `issued_by`, `revoked_at`, `revoked_by`, `revoke_reason`

### 2. Uniqueness / idempotency
- UNIQUE (`learner_id`, `course_id`) WHERE status = ISSUED (or equivalent partial unique)
- Duplicate issuance request → fail closed ALREADY_ISSUED / return existing id (Central chooses RPC semantics; must be deterministic)

### 3. Revocation
- REVOKED must never verify as VALID
- Revocation is explicit status transition; no delete-required for verification honesty

### 4. RLS / authorization
- Public verification: read ONLY public-safe fields for known certificate id
- Private fields (internal learner id raw, enrollment snapshots, issuer internals) NEVER on public surface
- Issue RPC: authorized actors only (instructor/system role — exact role map by Central)
- Learners cannot mint certificates

### 5. RPC contracts (names illustrative; Central finalizes)
- `issue_certificate(learner_id, course_id)` — requires prior eligibility evidence; fails closed if not eligible / missing auth / duplicate
- `get_certificate` / `verify_certificate(certificate_id)` — public read-model: CERTIFICATE_ID, VERIFICATION_STATUS, LEARNER_DISPLAY_BOUNDARY, COURSE_DISPLAY_BOUNDARY, ISSUED_AT_BOUNDARY, REVOCATION_STATUS
- UNKNOWN certificate → fail closed UNKNOWN (not VALID)
- Missing persistence before migration → MISSING_PERSISTENCE fail closed (already contracted)

### 6. Idempotency expectations
- Same learner+course issuance: deterministic; no duplicate active rows
- Repeated eligibility evaluation issues NOTHING
- Issuance request ≠ durable certificate until RPC succeeds against migrated store

### 7. Rollback expectations
- Forward-only preferred; if rollback needed: drop RPCs then table; no orphan public VALID claims
- Verification must fail closed if store removed

### 8. Migration verification tests (Central post-apply)
- schema exists; unique constraint enforced
- RLS denies unauthorized issue
- public verify hides private fields
- unknown id → UNKNOWN
- revoked → not VALID
- duplicate issue deterministic

## Explicit non-goals (Laptop)
- Do NOT create/apply migration files
- Do NOT allocate migration number / timestamp
- Do NOT touch `lib/learning` domain-regression triage area
- Do NOT fake durable persistence or issue real certificates

## Packet readiness
CENTRAL_MIGRATION_PACKET_READY = YES  
CENTRAL_MIGRATION_NUMBER_REQUIRED = YES  
RECOMMENDED_NEXT_STEP = Central allocates migration number, authors migration+RPC+RLS, applies under Central authority
