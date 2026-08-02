# Commerce Migration History Repair Apply V1

Capability: `commerce.ops.chain_migration_apply_readiness_v1` (history repair apply)  
Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-migration-history-repair-apply-v1`  
Branch: `office/commerce-migration-history-repair-apply-v1`  
Base / HEAD: `904c8bb`  
Linked project: **`tgucwnjwoyeqoxqaxmew`**

## Result

**PASS** — history registered only:

```text
20260822 → 20260823
```

No migration SQL / DDL / DML / `db push` / `migration up` / `db reset`.

| Version | History name | Status |
| --- | --- | --- |
| `20260822` | `ueos_foundation_v1` | applied (repair) |
| `20260823` | `store_payment_outcome_sync_v1` | applied (repair) |
| `20260824` | — | still absent |
| `20260881` / `84` / `89`–`91` | — | still absent |

Object markers unchanged after both repairs (no `in_transit`, no settlement guard/table, 23 apply comment baseline intact).

## Commands executed

```bash
npx supabase migration repair --status applied 20260822
npx supabase migration repair --status applied 20260823
```

## Remaining blockers (for later GOs)

1. Apply `20260824` (settlement) — targeted, never `--include-all`
2. Apply `20260884` (commission foundation)
3. Re-run remote preflight for `20260889 → 20260890 → 20260891`
