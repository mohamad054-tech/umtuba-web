# Private AI Workflow & Lifecycle V1

## Status

Implemented on `office/platform-private-ai-workflow-lifecycle-v1-final`
(base `b0655bb` Shared AI Surface Integration). No training / fine-tuning /
inference / weights. Migration `20260880` created locally only — **not
remote-applied**.

## Source of truth

- **Runtime SoT:** `data/private-ai/registry.json` via `lib/privateAi/**`
  (`schemaVersion: 2`, includes `auditTrail`).
- **Admin gate:** `assertPlatformAdminDb` + existing Private AI permission
  contracts (`platform_admin` / `model_reviewer`).
- **SQL:** additive mirror only (`20260879` + `20260880`); not wired as live SoT.

## Lifecycle

`draft` → `submitted_for_review` → (`changes_requested` | `rejected` |
`approved`) → `active` → `deprecated` → `retired`

Illegal transitions fail closed. Approve/activate require Readiness Gate.

## Admin UI

`/admin/private-ai/lifecycle` — apply transitions + view audit trail.
