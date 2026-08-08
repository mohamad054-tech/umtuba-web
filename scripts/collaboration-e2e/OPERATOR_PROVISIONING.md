# Operator provisioning — Collaboration Learning link/unlink E2E

Namespace: `UMTUBA_COLLABORATION_LEARNING_LINK_E2E_20260808`

This checklist is **non-secret**. Never paste passwords, JWTs, or service-role keys here.

## Safety

1. Prefer **LOCAL Supabase** or an **approved NON-PRODUCTION** project.
2. Do **not** create Auth users on production without explicit written approval.
3. Do **not** reuse personal gmails.
4. Do **not** `INSERT INTO auth.users` from SQL.
5. Service-role / linked SQL is for **fixture provisioning only** — not for authorization assertions.

## Steps

### 1) Create dedicated Auth users (Auth UI or Admin API)

Suggested emails (operator-chosen domain):

| Role | Example local-part |
| --- | --- |
| Owner / manager | `e2e-collab-owner+20260808@…` |
| Peer / read-only member | `e2e-collab-peer+20260808@…` |

Ensure both have `public.profiles` rows after first sign-in / profile bootstrap.

### 2) Local env (gitignored)

In SoT worktree `.env.local` (never commit):

```text
COLLABORATION_E2E=1
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000
COLLABORATION_PLATFORM_ENABLED=1
COLLABORATION_E2E_OWNER_EMAIL=…
COLLABORATION_E2E_OWNER_PASSWORD=…
COLLABORATION_E2E_PEER_EMAIL=…
COLLABORATION_E2E_PEER_PASSWORD=…
# optional overrides (defaults match fixed fixtures):
# COLLABORATION_E2E_WORKSPACE_ID=e2e0808c-2026-4001-8000-000000000001
# COLLABORATION_E2E_LEARNING_SPACE_ID=e2e0808c-2026-4001-8000-000000000011
```

Also set required Next/Supabase public client keys for the chosen target.

### 3) SQL session config

```text
copy scripts/collaboration-e2e/config.example.sql
  → scripts/collaboration-e2e/config.local.sql   # gitignored
replace placeholder UUIDs with real Auth user ids
```

### 4) Seed disposable fixtures (same SQL session)

```text
\i scripts/collaboration-e2e/config.local.sql
begin;
\i scripts/collaboration-e2e/seed-learning-link-unlink-sandbox.example.sql
-- abort on ACCOUNT_BLOCKER
commit;
```

### 5) Run app + smoke

```bash
# terminal A (platform enabled for E2E)
COLLABORATION_PLATFORM_ENABLED=1 npm run dev

# terminal B
npx playwright test -c e2e/collaboration/playwright.config.ts
```

Login uses real `/login` form + full document navigation after sign-in
(`window.location.assign`). Specs race submit with `waitForURL` via
`e2e/collaboration/helpers/loginAs.ts`. No session injection.

Gate-off proof: run app with `COLLABORATION_PLATFORM_ENABLED` unset/false and execute
`e2e/collaboration/smoke/platform-gate.spec.ts`.

### 6) Cleanup

```text
\i scripts/collaboration-e2e/cleanup-learning-link-unlink-sandbox.example.sql
# optional full row drop:
# select set_config('umtuba.collaboration_e2e_drop_sandbox_rows','1',false);
```

Auth identities are **kept** by default (persistent E2E accounts).

## After provisioning

Re-run milestone:

`COLLABORATION_WORKSPACE_LEARNING_RESOURCE_LINK_UNLINK_CREDENTIALED_E2E_SMOKE_V1`
