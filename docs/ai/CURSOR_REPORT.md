# CURSOR_REPORT

## Summary

Ads Diagnostic Runner Authorization Boundary Hardening V1 **PASS** on
`office/ads-canonical-authority-hardening-v1`.

- Removed trust-on-caller / forgeable `platformAdminVerified` gates
- DB-backed `assertPlatformAdminDb` runs inside `executeAdsDiagnosticRunnerV1`
  (server-only) before inventory load
- Pure helpers quarantined; no flat-export of execution entrypoint from
  `lib/ads/index.ts`
- Request hardening: UUID advertiser/campaign/ad-set; correlation charset/length;
  candidateLimit 1–64; unknown/forge fields rejected
- Validation: `lib/ads` 753/753, `tsc --noEmit` pass, `npm run build` pass,
  `git diff --check` clean
- Not committed

## Exact files changed

- `lib/ads/diagnosticRunner.ts`
- `lib/ads/diagnosticRunnerServer.ts` (new, `server-only`)
- `lib/ads/diagnosticRunner.test.ts`
- `lib/ads/index.ts`
- `lib/ads/adsAdminReviewFoundation.test.ts`
- `app/admin/ads/diagnostics/page.tsx`
- `app/admin/ads/diagnostics/DiagnosticReportPanel.tsx`
- `app/admin/ads/AdminAdsShell.tsx`
- `app/lib/nav/routes.ts`
- `docs/ads/ADS_DIAGNOSTIC_RUNNER_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None

## Security review

- Execution requires session user match + `assertPlatformAdminDb`
- No public gate constructor; forged `platformAdminVerified` / `gate` fields
  rejected at parse time
- Server entrypoint not flat-exported from Ads barrel; `import "server-only"`
- Runner does not mutate DB / ingest events / charge / render ads
- Authority flags forced false on report (`productionAccepted`,
  `deliveryEnabled`, `billingEnabled`)

## Tests

- Targeted: diagnosticRunner + admin foundation — 19/19 pass
- Full: `npx vitest run lib/ads` — 753/753 pass

## TypeScript

- `npx tsc --noEmit` — pass

## Build

- `npm run build` — pass (includes `/admin/ads/diagnostics`)

## git diff --check

- clean

## git status --short

```
 M app/admin/ads/AdminAdsShell.tsx
 M app/lib/nav/routes.ts
 M docs/ai/CURRENT_TASK.md
 M docs/ai/CURSOR_REPORT.md
 M lib/ads/adsAdminReviewFoundation.test.ts
 M lib/ads/index.ts
?? app/admin/ads/diagnostics/
?? docs/ads/ADS_DIAGNOSTIC_RUNNER_V1.md
?? lib/ads/diagnosticRunner.test.ts
?? lib/ads/diagnosticRunner.ts
?? lib/ads/diagnosticRunnerServer.ts
```

## Open issues

- Commit pending explicit user request
- Platform provenance `bindingToken` (pipe-joined, max 128) can fail on
  UUID-dense inventory independently of this auth hardening; follow-up belongs
  to Candidate Provenance
- No live Postgres integration tests (bridge load / admin RPC mocked in unit tests)
