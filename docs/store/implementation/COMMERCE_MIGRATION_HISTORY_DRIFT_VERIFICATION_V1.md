# Commerce Migration History Drift Verification V1

Capability: `commerce.ops.chain_migration_apply_readiness_v1` (history drift verification)  
Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-migration-history-drift-verification-v1`  
Branch: `office/commerce-migration-history-drift-verification-v1`  
Base: `ac49585` (`docs(commerce): add remote migration blocker remediation plan v1`)  
Linked project: **`tgucwnjwoyeqoxqaxmew`**  
Mode: **READ-ONLY**  
Mutations / repairs performed: **none**

---

## Decisions

| Version | Decision |
| --- | --- |
| `20260822` | **`SAFE_TO_REGISTER_HISTORY`** |
| `20260823` | **`SAFE_TO_REGISTER_HISTORY`** (reconfirmed) |
| Contiguous repair order | **`20260822 → 20260823`** |

---

## 1. `20260822` object comparison

Local: `supabase/migrations/20260822_ueos_foundation_v1.sql`  
Remote history row: **absent** (`schema_migrations` has no `20260822`)

### 1.1 Tables + RLS

| Table | Present | RLS enable | RLS force |
| --- | --- | --- | --- |
| `ueos_products` | yes | yes | yes |
| `ueos_assets` | yes | yes | yes |
| `ueos_policies` | yes | yes | yes |
| `ueos_accounts` | yes | yes | yes |
| `ueos_journal_entries` | yes | yes | yes |
| `ueos_ledger_lines` | yes | yes | yes |
| `ueos_account_balances` | yes | yes | yes |

### 1.2 Policies (names match 22)

| Table | Policy |
| --- | --- |
| `ueos_products` | `Authenticated read ueos products` (SELECT) |
| `ueos_assets` | `Authenticated read ueos assets` (SELECT) |
| `ueos_policies` | `Authenticated read ueos policies` (SELECT) |
| `ueos_accounts` | `Users read own ueos accounts` (SELECT) |
| `ueos_account_balances` | `Users read own ueos balances` (SELECT) |
| journals / ledger lines | **none** (as designed in 22) |

### 1.3 Indexes (expected 22 set present)

Includes: `ueos_accounts_identity_uidx`, `ueos_accounts_owner_idx`, `ueos_accounts_asset_idx`, `ueos_policies_code_status_idx`, `ueos_journal_product_created_idx`, `ueos_journal_reference_idx`, `ueos_ledger_lines_account_created_idx`, `ueos_ledger_lines_journal_idx`, pkeys/uniques.

### 1.4 Key constraints — prove **not** later `20260881`

| Marker | Local 22 | Remote | Local 81 would show |
| --- | --- | --- | --- |
| `ueos_accounts_account_kind_check` | wallet…liability (**no** `in_transit`) | **no `in_transit`** | includes `in_transit` |
| `ueos_ensure_account` body | no `in_transit` | `ensure_body_mentions_in_transit=false` | mentions `in_transit` |
| `ueos_ensure_account` comment | exact 22 text | **exact match** | would change with 81 replace |
| `ueos_post_journal` comment | exact 22 text | **exact match** | unchanged by 81 (81 not applied) |
| journal `event_type` check | transfer…release set from 22 | **matches 22** | n/a (81 does not alter this check) |

**Conclusion:** remote UEOS core is the **20260822 baseline**, not the payout-era (`20260881`) modified version. History for `20260881` is also absent and objects do not show 81 markers.

### 1.5 Functions + grants

Present with expected signatures:

- `ueos_forbid_ledger_mutation()`
- `ueos_policy_is_effective(ueos_policies, timestamptz)`
- `ueos_normalize_post_lines(jsonb)`
- `ueos_compute_request_fingerprint(...)`
- `ueos_journal_payload(uuid)`
- `ueos_assert_bigint_add(bigint,bigint)`
- `ueos_ensure_account(text,uuid,text,text,text)` — SECURITY DEFINER
- `ueos_post_journal(text,text,text,jsonb,uuid,text,text,text,jsonb,text,uuid)` — SECURITY DEFINER

EXECUTE: `anon`/`authenticated` = **no** on all; `service_role` = **yes**.  
(22 revokes client roles; service_role execute is expected/compatible — also reinforced by later applied object path from 23 grants.)

### 1.6 Triggers

Immutable journal/lines triggers + `set_row_updated_at` on accounts/balances — present as in 22.

### 1.7 Expected seed / config rows

| Seed | Expected | Remote |
| --- | --- | --- |
| Products | system, ueos, store, ads, rewards, learning, challenges, creator, subscriptions | **all present** with expected statuses |
| Assets | USD/EUR/ILS/JOD/SAR/AED/EGP + UM_POINTS + UMT(future_reserved) | **all present** |
| Policies | `ueos.foundation` v1, `ueos.manual_adjustment` v1 | **present active** |
| Platform fiat accounts | 7 active fiat × clearing/revenue/liability @ product_scope=`ueos` | **21 rows** |
| UMT accounts | 0 | **0** |

### 1.8 Additive rows (do **not** invalidate 22 registration)

`ueos_policies` also contains `store.payment.authorized|captured|refunded` v1 — these come from object-applied `20260823` (history still missing). They are **additive seeds**, not a replacement of the 22 schema/functions.

---

## 2. `20260822` decision

# **SAFE_TO_REGISTER_HISTORY**

Why:

1. All 22 tables/columns/constraints/indexes/RLS/policies/triggers/functions/comments match local 22.
2. Explicit anti-81 markers prove remote is **not** a later modified UEOS (`in_transit` absent).
3. Required 22 seeds present; UMT accounts absent as required.
4. History row absent — registration would document existing truth only.
5. Additive `store.payment.*` policy rows do not change the 22 structural contract.

**Not executed:** any `migration repair` or SQL write.

---

## 3. Reconfirm `20260823`

| Check | Result |
| --- | --- |
| History `20260823` | absent |
| `store_payment_outcome_events` | present |
| `apply_store_payment_outcome` | present; comment = 23 baseline |
| Body calls settlement guard | **false** |
| `store_settlement_assert_refund_allowed` | absent |

Considering 22: 23 objects depend on UEOS write gates/policies already present as 22-baseline. No conflict.

# **SAFE_TO_REGISTER_HISTORY** (reconfirmed)

Safest contiguous repair order:

```text
20260822 → 20260823
```

Do **not** register 23 before 22 if ops requires contiguous history / dependency order.

---

## 4. Proposed history repair commands (**NOT EXECUTED**)

Run only under a future human GO, from a clean linked worktree, project ref `tgucwnjwoyeqoxqaxmew`:

```bash
# 0) Identity gate
npx supabase projects list
# Expect linked project ref tgucwnjwoyeqoxqaxmew

# 1) Register 20260822 as already applied (history only — does not re-run SQL)
npx supabase migration repair --status applied 20260822

# 2) Verify 22 history
npx supabase db query --linked -o json <<'SQL'
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version = '20260822';
SQL

# 3) Register 20260823
npx supabase migration repair --status applied 20260823

# 4) Verify 23 history
npx supabase db query --linked -o json <<'SQL'
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260822','20260823')
ORDER BY version;
SQL
```

Windows PowerShell equivalent for verifies:

```powershell
npx supabase db query --linked -f scripts/remote-preflight/history-drift/00_history.sql -o json
```

**Never** as part of this repair:

- `npx supabase db push`
- `npx supabase migration up`
- `npx supabase db reset`
- Re-running the full `20260822` / `20260823` SQL files on production

---

## 5. Verification after each step

### After repair `20260822`

1. `schema_migrations` contains exactly one row for `20260822` / `ueos_foundation_v1` (name may vary by CLI)
2. Still **no** `in_transit` in `ueos_accounts_account_kind_check`
3. `ueos_ensure_account` comment still 22 text; body still no `in_transit`
4. Product/asset/foundation policy seeds unchanged
5. Platform account count still 21; UMT accounts still 0

### After repair `20260823`

1. `schema_migrations` contains `20260822` **and** `20260823`
2. `store_payment_outcome_events` still present with prior columns
3. `apply_store_payment_outcome` comment still 23 baseline (no settlement guard clause)
4. `store_settlement_assert_refund_allowed` still absent
5. `store.payment.*` UEOS policies still present

Then proceed only under later GOs: apply `20260824` → apply `20260884` → re-run remote preflight → only then consider `89→90→91`.

---

## 6. Stop conditions

| Condition | Action |
| --- | --- |
| Project ref ≠ `tgucwnjwoyeqoxqaxmew` | **STOP** |
| Before repair: `in_transit` appears in account_kind or ensure_account body | **STOP** — mark 22 `UNSAFE_TO_REGISTER_HISTORY` |
| Before repair: 22 function comments diverge from local 22 | **STOP** |
| Repair 23 before 22 when contiguous order is required | **STOP** |
| Any temptation to `db push` / re-apply full SQL | **STOP** |
| Repair command errors / unexpected extra history rows | **STOP** and escalate |
| After repair, object markers flip to 81-like or 24-like unexpectedly | **STOP** — incident |

---

## 7. Evidence probes

Folder: `scripts/remote-preflight/history-drift/` (SELECT-only).

```bash
npx supabase db query --linked -f scripts/remote-preflight/history-drift/<file>.sql -o json
```

No secrets in this document.
