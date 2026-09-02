# Current Task

> 2026-09-02 PC2. Owner GO: COMMUNICATIONS IDENTITY PEPPER VAULT ADAPTATION V1.

**This worktree only.** Isolated from the dirty primary checkout. LOCAL ONLY. STOP after the report. No production Vault, SQL, or apply.

```text
TASK_ID = COMMUNICATIONS_IDENTITY_PEPPER_VAULT_ADAPTATION_V1
STATUS = COMPLETE
DEVICE = PC2
INTEGRATION_BRANCH = pc2/social-comm-rich-profile-renumber-integrate-v1
INTEGRATION_WORKTREE = C:\Users\Giga store\Desktop\umtuba\umtuba-web-social-comm-rich-profile-renumber-integrate-v1
BASE_SHA = 4eb8e91aff6310d243547790d867690663a6827d
VAULT_METHOD = vault.decrypted_secrets
SECRET_NAME = communications_identity_pepper
MISSING_SECRET_FAIL_CLOSED = PASS
PUBLIC_VAULT_ACCESS = DENIED
SECRET_EXPOSED = NO
PRODUCTION_CHANGED = NO
MIGRATION_20260934_EDITED = NO
MIGRATION_20260935_EDITED = NO
MIGRATION_20260937_EDITED = NO
```

## Allowed scope

- `supabase/migrations/20260936_communications_identity_discovery_v1.sql` and related SQL functions only
- Isolated-worktree docs + contract tests for the Vault / fail-closed pepper rules
- Local-only disposable Vault secret for PASS then delete for fail-closed
- Local supabase only (reused existing stack; no `--linked`, no `db push`)

## Forbidden scope

- Production Vault / production SQL / hosted apply of `20260935` / `20260936`
- `db push` / `--linked` apply
- Edit `20260934` or `20260937`
- Edit `20260935` unless strictly required (untouched)
- Reset the dirty primary checkout
- Touch the UM Streak worktree
- Deploy or merge alpha
- Log or display the secret value
- Force push
- Expose `.env`
- Put a pepper VALUE in a migration, Git, or source

## STOP

Candidate SQL is adapted to Vault. Local gates passed. Do **not** create a production Vault secret or apply `20260935` / `20260936` until a separate Owner GO.
