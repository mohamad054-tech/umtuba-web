# CURSOR_REPORT — TRANSLATION_STUDIO_DUAL_READ_RUNTIME_OBSERVATION_WIRING_V1

## Summary

**Verdict: WAITING_FOR_ADMIN_LOGIN**

Non-blocking dual-read observation is wired into Translation Studio
**landing** and **key detail** admin pages via `next/server` `after()`,
gated by `UMTUBA_TRANSLATION_STUDIO_DUAL_READ_OBSERVE`. A process-local
circuit breaker governs automatic observation only (JSON + shadow
untouched).

Authenticated browser page smoke **not completed** — no platform-admin
session (tabs on `/login`). Implementation + unit/breaker tests **PASS**.

Observe remains **OFF**. Persistent `shadow_dual_write` remains **ON**.

Next (not started): after admin login smoke, retry
`TRANSLATION_STUDIO_DUAL_READ_CONTROLLED_ACTIVATION_GATE_V1_RETRY`.

## Exact files changed

- `app/admin/translation-studio/scheduleDualReadObservation.ts` (new)
- `app/admin/translation-studio/requireTranslationStudioAdmin.ts` — returns `{user,supabase}`
- `app/admin/translation-studio/page.tsx` — schedule `landing`
- `app/admin/translation-studio/keys/[keyId]/page.tsx` — schedule `key_detail`
- `app/actions/translationStudioDualRead.ts` — breaker snapshot + reset action
- `lib/translationStudio/persistence/dualReadObservation.ts` (new)
- `lib/translationStudio/persistence/dualReadObservationBreaker.ts` (new)
- `lib/translationStudio/persistence/dualReadJournal.ts` — auto/breaker outcomes
- `lib/translationStudio/persistence/shadowReconciliationJournal.ts` — outcomes
- `lib/translationStudio/index.ts` — exports
- `lib/translationStudio/translationStudioDualReadObservation.test.ts` (new)

## Migrations created

**NONE.**

## Security review

- No `service_role`; authenticated cookie client only for read RPC
- Observe off by default; no anonymous RPC from unauthenticated pages
- Breaker does not affect JSON authority or shadow writes
- TI untouched; no schema/RLS/grant changes

## Tests

`npx vitest run lib/translationStudio` — **167 passed** (17 files)

## TypeScript

`npx tsc --noEmit` — **PASS**

## Build

Not required (admin server helper + pages; no new UI chrome).

## git diff --check

**PASS**

## git status — closeout note

Product commit: `5b5ad1956161a2638c0803c49377332e3f6ab86e`
Expect clean tree after this docs commit + push.

## Open issues

1. Need authenticated platform-admin browser session to complete live
   landing/key observation smoke under temporary observe=true.
2. Activation gate retry blocked until that smoke passes.

### Architecture notes

- Non-blocking: `after(() => runObservation)` — page returns JSON immediately
- One slot per `surface:hash` per request (dedupe)
- Breaker OPEN on auth / invalid_response / actionable drift; 2 consecutive
  or 3 session transport/rpc/timeout failures
- Reset: process restart or `resetTranslationStudioDualReadObservationBreakerAction`
