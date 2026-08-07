> **P5C2 supersession (2026-08-07):** Active Commerce draft is now **`20260915`**. Do **not** use `20260914` (Translation reserved: `translation_studio_memory_identity_contract_align_v1` on `origin/office/platform-translation-trunk-port-v1`). Rejected also: Learning `20260908`/`20260909`. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C2_ALLOCATION_REPORT.md`.

# COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C_RENUMBER_REPORT

**Verdict:** `P5C_RENUMBERED_READY_FOR_IMMEDIATE_REMOTE_APPLY_GO`

**No remote mutation performed.** No SQL apply, no migration repair, no Stripe/network money call, no commit, no push.

---

## Setup

| Item | Value |
| --- | --- |
| worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| HEAD | `b8be33469f35c5ccb394925d666a5812f4c70c70` |
| project ref (read-only preflight) | `tgucwnjwoyeqoxqaxmew` |

---

## Rejected versions (Learning-owned)

| Version | Exact remote owner |
| --- | --- |
| `20260908` | `learning_personal_notes_hub_v1` |
| `20260909` | `learning_assessment_due_ux_followthrough_v1` |

Translation `20260910–13` remain Translation-owned and unchanged.

---

## Candidate versions checked

| Version | Remote count | Local/worktree files | Origin history / remote-branch files |
| --- | --- | --- | --- |
| `20260914` | **0** | none (before rename) | none across all `origin/*` |
| `20260915` | 0 | none | none |
| `20260916` | 0 | none | none |
| `20260917` | 0 | none | none |
| `20260918` | 0 | none | none |
| `20260919`–`20260925` | 0 | none | none |

Remote `max(version)` under `202609%` at scan time: **`20260913`**.

Also confirmed:
- Desktop worktrees scan: only prior Commerce draft `20260909_store_partial_refund_provider_money_execution_v1.sql` in this WT (now renamed).
- `origin/alpha-0.2`: no `202609*` migrations.
- Learning assessment branch holds `20260908`/`20260909` Learning SQL only.
- Translation trunk holds `20260910–13` only.
- No origin object path `supabase/migrations/20260914_*`.

---

## Newly allocated Commerce version

| Item | Value |
| --- | --- |
| version | **`20260914`** |
| final filename | `supabase/migrations/20260914_store_partial_refund_provider_money_execution_v1.sql` |
| final SHA256 (LF-normalized) | `E4CD655393ED70D6E2EC3408F85D81CC9BF0A5946CF63E8E3AAEBBE32A0FA5D5` |

### Collision results for `20260914`

| Scope | Result |
| --- | --- |
| local | PASS — only this Commerce draft after rename; `20260909` Commerce file removed |
| worktree | PASS — no other Desktop WT holds `20260914_*` |
| origin | PASS — no `20260914` migration on any scanned remote branch / history |
| remote | PASS — `schema_migrations` count `0` for `20260914` |

### SQL semantics

**UNCHANGED** aside from version-history header comments documenting P5B/P5C collisions and the new active version. No DDL/RPC/grant body changes for renumber.

---

## References / docs / tests updated

- Renamed migration file `20260909` → `20260914`
- Tests: `partialRefundProviderMoneyExecution.test.ts`, `.p2.test.ts`, `.p4.test.ts`
- Implementation docs / runbooks / apply plan / dry-run checklist
- P0–P5B reports: P5C supersession banners (historical Learning ownership preserved)
- `docs/ai/CURRENT_TASK.md`, `CURSOR_REPORT.md`, `PROJECT_STATE.md`

---

## Readiness invariants (re-audited; unchanged)

- Dedicated provider-money gate default **OFF**
- Execution mode default **`off`**
- First submit requires dual gates + mode + operator ACK
- Trusted PaymentIntent only
- Stable idempotency `prf-prov:{ledgerId}`
- Uncertain/executing never blind-resubmit
- Recovery is **LOOKUP ONLY**
- Failed V1 retry policy = **no retry**
- No auto-compensation
- No restock / entitlement / settlement / commission / payout / Sync / `commerce_confirm`

---

## Exact targeted apply commands for `20260914` (DO NOT EXECUTE in P5C)

```powershell
$wd = "C:\Users\1\Desktop\umtuba\umtuba-web-commerce-remote-migration-preflight-v1-current"
$sql = "C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1\supabase\migrations\20260914_store_partial_refund_provider_money_execution_v1.sql"

# 1) Preflight absence (expect c=0)
# select count(*)::int as c from supabase_migrations.schema_migrations where version = '20260914';

# 2) SHA256 LF-normalized must equal:
# E4CD655393ED70D6E2EC3408F85D81CC9BF0A5946CF63E8E3AAEBBE32A0FA5D5

# 3) Targeted SQL ONLY
npx supabase --workdir $wd db query --linked -f $sql

# 4) Verify table + RPCs + SECURITY DEFINER/search_path + grants/revokes + RLS safety

# 5) Register history ONLY for 20260914
npx supabase --workdir $wd migration repair --linked --status applied 20260914

# 6) Post-registration: exactly one 20260914 row; name store_partial_refund_provider_money_execution_v1;
#    Learning 20260908/09 + Translation 20260910-13 unchanged
```

Hard prohibitions remain: no `db push`, no `--include-all`, no other versions.

---

## Validation results

| Check | Result |
| --- | --- |
| Provider-money + related vitest | **PASS** — Test Files **18** passed / Tests **235** passed |
| TypeScript `npx tsc --noEmit` | **PASS** (exit 0) |
| `git diff --check` | **PASS** (exit 0; CRLF warnings only) |
| Secret scan (changed tree) | **PASS** for real secrets — only intentional test fixtures (`sk_test_` / placeholder `sk_live_` / `whsec_testplaceholderonly`) and docs mentioning `service_role` / `sk_test_` policy |

## Explicit confirmation

**NO remote apply / NO migration repair / NO Stripe/network call / NO commit / NO push**

## Exact recommended next step only

**Explicit remote-apply GO for `20260914` only** (targeted SQL + object/RPC/security verify + `migration repair --status applied 20260914` + history verify). Still no production/test gate enablement and no live refund.
