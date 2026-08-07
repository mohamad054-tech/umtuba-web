# Partial Refund Provider Money — Targeted Remote Apply Plan

**Status after P5C2:** Local draft renumbered to **`20260915`**.  
**Do NOT execute this plan until an explicit remote-apply GO.**  
**P5C `20260914` allocation is SUPERSEDED — do not apply.**

Rejected / reserved versions:
- `20260908` — Learning `learning_personal_notes_hub_v1` (remote)
- `20260909` — Learning `learning_assessment_due_ux_followthrough_v1` (remote)
- `20260910–13` — Translation (remote)
- `20260914` — Translation **RESERVED** (`translation_studio_memory_identity_contract_align_v1` on `origin/office/platform-translation-trunk-port-v1`; may be absent from remote `schema_migrations`)

## Target file

`supabase/migrations/20260915_store_partial_refund_provider_money_execution_v1.sql`

SHA256 (LF-normalized): `68E24761F4357E0516FD4D0F1BF7ADFA0EDE259F4EAEA52351C99BA81B555273`

## Hard prohibitions

- No `db push`
- No `--include-all`
- No Learning/Translation history row changes
- No `db reset`
- Apply **only** this provider-money SQL file
- Never apply under `20260914`

## Preflight (every attempt)

1. Confirm linked project `tgucwnjwoyeqoxqaxmew` (`umtuba`).
2. Confirm `20260915` **absent** from remote `schema_migrations`.
3. Re-confirm `20260914` is still Translation-owned/reserved (do not claim it).
4. Confirm table `store_partial_refund_provider_executions` absent.
5. Confirm SHA256 of the local SQL file matches the approved P5C2 report.
6. Confirm prerequisites present (`store_partial_refund_ledger_commits`, compensate chain through `20260907`).
7. Confirm Learning `20260908`/`20260909` and Translation `20260910–13` unchanged.
8. Re-scan Desktop worktrees + origin for any new claim on `20260915` before apply.

## Targeted apply sequence (future GO only — Do NOT execute in P5C2)

```powershell
# Example only — DO NOT RUN without explicit apply GO.
$wd = "C:\Users\1\Desktop\umtuba\umtuba-web-commerce-remote-migration-preflight-v1-current"
$sql = "<repo>\supabase\migrations\20260915_store_partial_refund_provider_money_execution_v1.sql"
# 1) Preflight absence — expect count(*) where version='20260915' = 0
# 2) SHA256 LF-normalized == 68E24761F4357E0516FD4D0F1BF7ADFA0EDE259F4EAEA52351C99BA81B555273
# 3) Targeted SQL ONLY
npx supabase --workdir $wd db query --linked -f $sql
# 4) Verify table + RPCs + grants (service_role execute; anon/authenticated revoked)
# 5) ONLY THEN register history row for 20260915 ONLY:
npx supabase --workdir $wd migration repair --linked --status applied 20260915
# 6) Post-registration verification (exactly one 20260915 row; neighbors unchanged)
```

## Post-verify probes

- `to_regclass('public.store_partial_refund_provider_executions')` not null
- RPCs exist: claim/update/get-by-ledger/get-by-idempotency/get-by-id/list
- Grants: service_role execute only
- No anon/authenticated execute
