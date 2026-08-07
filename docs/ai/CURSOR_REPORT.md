# CURSOR_REPORT — TRANSLATION_STUDIO_CONTROLLED_PERSISTENT_SHADOW_V1

## Summary

**CONTROLLED_PERSISTENT_SHADOW_V1 = PASS.**

Persistent `shadow_dual_write` is **enabled** on Computer 2 (gitignored
`.env.local`). JSON remains **authoritative**; DB is **secondary**. Controlled
EN mutation and restore both settled cleanly. Final target
`val_appshell_actions__back_en` = exact `Back`. Final reconciliation clean
(missing/field/audit_missing 0; unexplained 0; known smoke extras only).
Journal orphans = **0**. No product code, migrations, or TI changes.

Next milestone **not started**:
`TRANSLATION_STUDIO_PERSISTENT_SHADOW_OBSERVATION_WINDOW_V1`.

## Exact files changed

Product / migrations / runtime data: **none** committed with this enablement.

Documentation:
- `docs/ai/CURSOR_REPORT.md` — this handoff closeout

Gitignored runtime / env (not committed):
- `.env.local` — persistence mode `shadow_dual_write` (left enabled)
- `data/translation-studio/store.json` — authoritative after restore (`Back`)
- `data/translation-studio/shadow-reconciliation-v1.jsonl` — no orphans
- `data/translation-studio/backups/store.json.pre-persistent-shadow-v1.*.bak`
- `data/translation-studio/backups/shadow-reconciliation-v1.*.bak`

## Migrations created

None. Studio/TI migration set unchanged (`20260902`, `20260910`–`20260914`).

## Security review

- No `service_role`; authenticated platform-admin Save Draft only
- Mode executable `shadow_dual_write`; JSON authoritative; DB secondary
- No `dual_read` / `db_primary_json_fallback` / prune
- No Studio schema/RLS/RPC changes this milestone
- TI tables untouched by this gate

## Tests

`npx vitest run` (5 files): **61 passed**
- `translationStudioShadowDualWrite.test.ts`
- `translationStudioIsolatedShadowSmokeV1.test.ts`
- `translationStudioReconciliationFoundation.test.ts`
- `translationStudioPersistencePort.test.ts`
- `translationStudioDbPersistenceAdapter.test.ts`

## TypeScript

`npx tsc --noEmit` — **PASS** (exit 0)

## Build

Not required (no UI/entry-point product changes).

## git diff --check

**PASS** (clean)

## git status — closeout note

Pre-closeout dirty file was this report only. After
`TRANSLATION_STUDIO_PERSISTENT_SHADOW_POST_ENABLE_CLOSEOUT_V1`, expect clean
tree with documentation commit pushed.

Prior HEAD before closeout commit: `35246dd387ee53b72450fa3db8eefcb4e7432314`
Branch: `office/platform-translation-trunk-port-v1`

## Open issues

None. Observation window milestone not started.

### Final restore proof (controlled enablement)

| Check | Result |
|-------|--------|
| JSON EN | exact `Back` · `draft` · v9 |
| Snapshot | `39880db3fe5dea379e2231c20014d1b669c94dce409b90733b7c2724f679d430` |
| Shadow restore | succeeded (`save_seq=3`, attempt 1, `516ms`) |
| Remote | exact `Back` |
| Recon | missing/field/audit_missing **0**; unexplained **0**; smoke extras only |
| Orphans | **0** |
| Mode | `shadow_dual_write` still enabled |
| JSON authority | authoritative |
| DB role | secondary |
| Next | `TRANSLATION_STUDIO_PERSISTENT_SHADOW_OBSERVATION_WINDOW_V1` (not started) |
