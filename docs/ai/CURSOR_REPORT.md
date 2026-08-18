# CURSOR_REPORT — Learning executable business sandbox V2

```text
SOURCE_DEVICE = CENTRAL / SERVER
DEVICE_ROLE = IMPLEMENTATION
TASK_ID = CENTRAL_LEARNING_EXECUTABLE_SANDBOX_V2
REPORT_TYPE = IMPLEMENTATION
TIMESTAMP_LOCAL = 2026-08-18 ~21:50 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
PUSH = NO
PRODUCTION_MUTATED = NO
REMOTE_MIGRATION_APPLIED = NO
SQL_20260929_APPLIED = NO
SQL_20260930_REAPPLIED = NO
MOBILE_SOURCE_CHANGED = NO
MOBILE_RELEASE_TRAIN_DISTURBED = NO
STORE_DEMO_PREVIEW_SET = NO
SANDBOX_HUB_PRESERVED = YES
PRODUCTION_LEARNING_DISTURBED = NO
PRIVATE_SANDBOX_DEPLOYED = NO
```

## Summary

Executable Learning slices were added under the private `/sandbox/business-preview` hub, branched from live `4b8dcb6d`. Production `/learning` was not rebuilt. Store demo-preview access and Store hub files were left for the in-flight Store V2 wave. Synthetic student/instructor/course state stays in sandbox-scoped local fixtures. Deploy was skipped so this wave does not race or wipe Store V2 or live `4b8dcb6d`.

## Exact files changed

- `lib/sandbox/learning/**` — routes, catalog/search, enrollment WHY/WHAT NEXT, progress, tutor rights, certificates, mock payments, admin (prospective cannot activate), instructor lifecycle, click path, judgments, tests
- `app/components/sandbox/learning/**` — executable Learning UI + local-state adapters
- `app/components/sandbox/SandboxView.tsx` — Learning cases delegate to LearningSandbox; Store cases untouched
- `app/components/sandbox/SandboxShell.tsx` — additive Learning nav links only
- `app/components/sandbox/sandbox.css` — Learning controls + existing breakpoints
- `lib/sandbox/paths.ts` — parse Learning deep routes so the catch-all does not 404
- `lib/sandbox/i18n.ts` — Arabic+English Learning chrome
- `lib/sandbox/fixtures/types.ts`, `courses.ts`, `originals.ts` — `listPriceMinor` for paid partner previews
- `docs/ai/CURRENT_TASK.md`, `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Hub access policy unchanged (admin or configured token; anonymous denied; `STORE_DEMO_PREVIEW=1` is not a grant).
- Layout remains noindex. Public nav/sitemap still omit `/sandbox`.
- AI Tutor is local-only on UMTUBA Originals. Partner/external/UNKNOWN = DENY. Prospective content is not sent to external AI.
- Certificates never issue Coursera/Udemy/edX credentials. External courses issue none.
- Mock learning payment collects no card. `REAL_CHARGE_POSSIBLE=NO`.
- Prospective admin ACTIVATE always fails. No production enrollment/progress/payment writes.

## Tests

PASS — 6 files / 45 tests (`lib/sandbox` including Learning executable, i18n, fixtures, containment, access).

## TypeScript

`npx tsc --noEmit` PASS

## Build

PASS. Routes include `/sandbox/business-preview`, `[...section]`, `enter`. `/learning` unchanged.

## git diff --check

PASS

## git status --short

See worktree after commit. Branch `central/learning-executable-sandbox-v2`.

## Open issues

- Authorized browser walkthrough BLOCKED (no `platform_admins` session on this host).
- `PRIVATE_SANDBOX_DEPLOYED=NO` until Store V2 is not racing a Hetzner cutover.
- PC2 review of executable Learning slices is still required.
