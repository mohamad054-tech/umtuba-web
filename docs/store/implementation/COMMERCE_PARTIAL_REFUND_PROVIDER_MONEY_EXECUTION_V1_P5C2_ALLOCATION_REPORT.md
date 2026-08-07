# COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C2_ALLOCATION_REPORT

**Verdict:** `P5C2_RENUMBERED_READY_FOR_IMMEDIATE_REMOTE_APPLY_GO`

**P5C allocation of `20260914` is SUPERSEDED.** No remote apply / repair / Stripe / commit / push in P5C2.

---

## Setup

| Item | Value |
| --- | --- |
| worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| HEAD | `b8be33469f35c5ccb394925d666a5812f4c70c70` |

---

## Rejected / reserved versions

| Version | Owner / reason |
| --- | --- |
| `20260908` | Learning — remote `learning_personal_notes_hub_v1` |
| `20260909` | Learning — remote `learning_assessment_due_ux_followthrough_v1` |
| `20260910–13` | Translation — remote applied |
| **`20260914`** | **Translation RESERVED** — `origin/office/platform-translation-trunk-port-v1` contains `20260914_translation_studio_memory_identity_contract_align_v1.sql` (remote `schema_migrations` count still `0` at audit time; **do not equate with free**) |

---

## Candidate range inspected

`20260915` through `20260930` inclusive.

### Evidence sources (in-progress / reserved detection)

1. Remote `schema_migrations` counts (project `tgucwnjwoyeqoxqaxmew`)
2. `git fetch --prune` + `git log --all` / `git ls-tree` across **all** `origin/*` branches
3. Desktop worktree `supabase/migrations/202609*.sql` file scan
4. Translation/Learning/Commerce `docs/ai/CURRENT_TASK.md` (+ CURSOR/PROJECT_STATE) reservation mentions
5. Explicit operator supersede: Translation workstream reserves `20260914` even before remote history registration
6. Origin proof of Translation claim: trunk-port branch file for `20260914`

### Per-candidate summary

| Version | Remote c | Origin migration file | Worktree SQL | Doc reservation (other WTs) |
| --- | --- | --- | --- | --- |
| `20260915` | 0 | none | none (pre-rename) | none |
| `20260916`–`20260930` | 0 | none | none | none |

Remote `max(202609%)` at audit: **`20260913`**.  
Translation origin trunk migrations stop at **`20260914`** (Translation file). No Translation/Learning CURRENT_TASK claims for `20260915+`.

---

## Newly selected Commerce version

| Item | Value |
| --- | --- |
| version | **`20260915`** |
| why free | Absent remotely; absent on all origin branches; absent in all Desktop WT migration folders; no CURRENT_TASK/CURSOR/PROJECT_STATE reservation outside this Commerce milestone’s superseded P5C docs; lowest slot above Translation-reserved `20260914` |
| final filename | `supabase/migrations/20260915_store_partial_refund_provider_money_execution_v1.sql` |
| final SHA256 (LF) | `68E24761F4357E0516FD4D0F1BF7ADFA0EDE259F4EAEA52351C99BA81B555273` |

### Collision results for `20260915`

| Scope | Result |
| --- | --- |
| remote | PASS (count 0) |
| local | PASS (only this Commerce draft after rename) |
| origin | PASS (no `20260915_*` on any remote branch) |
| worktree | PASS (no other WT holds `20260915_*`) |
| reservation | PASS (no active Learning/Translation/Commerce claim found for `20260915`) |

### SQL semantics

**UNCHANGED** aside from version-history header documenting P5C2 / Translation reservation of `20260914`.

---

## References updated

- Renamed `20260914` → `20260915` migration file
- Tests `.test.ts` / `.p2` / `.p4`
- Apply plan, impl doc, runbook, dry-run checklist
- P0–P5C reports: P5C2 supersession banners
- `docs/ai/CURRENT_TASK.md`, `CURSOR_REPORT.md`, `PROJECT_STATE.md`

---

## Validation results

| Check | Result |
| --- | --- |
| Provider-money + related vitest | **PASS** — Test Files **18** passed / Tests **235** passed |
| TypeScript `npx tsc --noEmit` | **PASS** (exit 0) |
| `git diff --check` | **PASS** (exit 0; CRLF warnings only) |
| Secret scan | **PASS** — no unexpected secrets (fixture placeholders in tests only) |

## Gate / mode

- Dedicated provider-money gate default **OFF**
- Execution mode default **`off`**
- Recovery LOOKUP ONLY; no blind resubmit; failed V1 `no_retry`
- No production enablement; no env change
- **NO Stripe submit/lookup/network money call**

## Exact targeted-apply plan for `20260915` (NOT executed)

See `PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P4_TARGETED_REMOTE_APPLY_PLAN.md`.

```powershell
$wd = "C:\Users\1\Desktop\umtuba\umtuba-web-commerce-remote-migration-preflight-v1-current"
$sql = "...\supabase\migrations\20260915_store_partial_refund_provider_money_execution_v1.sql"
# preflight c=0 for 20260915; SHA=68E24761...555273; re-scan WT/origin for new claims
npx supabase --workdir $wd db query --linked -f $sql
# verify objects/RPCs/grants
npx supabase --workdir $wd migration repair --linked --status applied 20260915
```

## Blockers

None for allocation/renumber. Next requires explicit remote-apply GO for **`20260915` only**.

## Explicit confirmation

**NO remote apply / NO migration repair / NO Stripe/network call / NO commit / NO push**

## Exact recommended next step only

Explicit remote-apply GO for **`20260915` only** (targeted SQL + verify + `migration repair --status applied 20260915`). Still no gate enablement / no live refund. Re-scan Translation/Learning claims immediately before apply.
