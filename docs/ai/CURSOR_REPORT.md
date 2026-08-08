# CURSOR_REPORT — Learning Link/Unlink Credentialed E2E Smoke V1

## Summary

**BLOCKED** — Preflight verified SoT tip `4254afa` clean/synced. Credentialed
Learning link/unlink E2E cannot run: no SoT harness for credentialed mutation,
and required opt-in E2E identity/env keys are absent. No secrets fabricated.
No Commerce/advertiser work. No migrations. No production auth/RLS weakening.

## Exact files changed

- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PROJECT_STATE.md`

## Migrations created

NO

## Security review

- Did not print/commit credentials
- Did not use service-role to simulate authenticated user path
- Did not enable platform flag
- Did not bypass RLS

## Tests

- Focused non-credentialed: platform gate + binding + UI + mutation runtime
  **34/34 PASS**
- Credentialed smoke: **NOT RUN** (blocked)

## TypeScript

- `npx tsc --noEmit` → (run at closeout)

## Build

N/A (validation-only / blocked)

## git diff --check

(run at closeout)

## git status --short

(see closeout)

## Open issues

### Exact missing prerequisites

1. Approved SoT credentialed Learning link/unlink E2E harness
2. `COLLABORATION_E2E=1`
3. `PLAYWRIGHT_BASE_URL`
4. Dedicated manager identity env:
   `COLLABORATION_E2E_OWNER_EMAIL` / `COLLABORATION_E2E_OWNER_PASSWORD`
5. Dedicated read-only peer identity env:
   `COLLABORATION_E2E_PEER_EMAIL` / `COLLABORATION_E2E_PEER_PASSWORD`
6. `config.local.sql` with dedicated Auth user UUIDs (never SQL-insert Auth users)
7. SoT-local Supabase public client env for authenticated app path

### Deferred

- Commerce / advertiser bindings
- Credentialed matrix A–D once identities exist
