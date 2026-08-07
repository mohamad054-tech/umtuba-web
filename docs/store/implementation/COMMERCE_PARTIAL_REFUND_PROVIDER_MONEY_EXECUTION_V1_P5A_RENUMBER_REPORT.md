> **P5C2 supersession (2026-08-07):** Active Commerce draft is now **`20260915`**. Do **not** use `20260914` (Translation reserved: `translation_studio_memory_identity_contract_align_v1` on `origin/office/platform-translation-trunk-port-v1`). Rejected also: Learning `20260908`/`20260909`. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C2_ALLOCATION_REPORT.md`.

> **P5C supersession (2026-08-07):** Active Commerce draft is now **`20260914`**. Remote **`20260908`** remains Learning (`learning_personal_notes_hub_v1`); remote **`20260909`** remains Learning (`learning_assessment_due_ux_followthrough_v1`). Do not treat either as the active Commerce migration version. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C_RENUMBER_REPORT.md`.

# COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5A_RENUMBER_REPORT

**Verdict:** `RENUMBERED_P4_READY_FOR_REMOTE_APPLY_GO`

---

## Setup

| Item | Value |
| --- | --- |
| worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| HEAD | `b8be33469f35c5ccb394925d666a5812f4c70c70` (+ uncommitted P1–P5A; no commit) |

## Rejected version `20260908`

| Evidence | Detail |
| --- | --- |
| Remote `schema_migrations` | `20260908` → **`learning_personal_notes_hub_v1`** (Learning) |
| Local Commerce claim | Removed; draft renamed away |

## Versions rechecked

| Version | Remote | Local/worktrees | Origin `alpha-0.2` |
| --- | --- | --- | --- |
| `20260908` | Learning personal notes | no Commerce file after rename | none |
| `20260909` | **absent (count=0)** | Commerce draft only (this WT) | none |
| `20260910–13` | Translation studio | none | none |

## Newly allocated Commerce version

**`20260909`** — lowest verified free across remote, Desktop worktrees, and origin.

## Final migration filename

`supabase/migrations/20260909_store_partial_refund_provider_money_execution_v1.sql`

## Migration SHA256 (LF-normalized)

`960D551BD578A726591E0AA6FEAFFB2CFA388297A178CB007053ACF33780999B`

## Collision results

| Scope | Result |
| --- | --- |
| local | PASS — only `20260909` Commerce draft; `20260908` file gone |
| worktree | PASS — no other Desktop WT holds `20260909` / Commerce `20260908` |
| origin | PASS — no `20260909` Commerce file on `origin/alpha-0.2` |
| remote | PASS — `20260909` absent; provider objects still NULL |

## SQL semantics

Unchanged except version-history header notes (P5A renumber rationale). No RPC/table/constraint semantics changes in P5A.

## Updated references/docs/tests

Tests, runbooks, apply plan, CURRENT_TASK / CURSOR_REPORT / PROJECT_STATE, impl note, and P0–P4 reports updated (historical reports keep Learning-collision evidence with P5A supersession banners).

## P4 SQL/security audit result

PASS (revalidated against `20260909` draft): additive, amount>0, currency, idempotency uniques, terminal-success immutability, uncertain/recovery fields, SECURITY DEFINER + `search_path=public`, revoke anon/authenticated, grant service_role only.

## P4 execution/recovery/crash audit result

PASS (unchanged code paths): trusted PI + dual gates + ACK + `prf-prov:{ledgerId}`; recovery lookup-only; no blind second submit.

## Tests / validation

```
Test Files  15 passed (15)
     Tests  191 passed (191)
```

- TypeScript: PASS (`npx tsc --noEmit`)
- `git diff --check`: PASS
- secret scan: PASS (fixture placeholders only; no real secrets)

## Exact targeted remote-apply plan

Updated: `PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P4_TARGETED_REMOTE_APPLY_PLAN.md` → targets **`20260909`**. Not executed.

## git diff --stat

```
 app/admin/store/refunds/page.tsx | 174 +
 docs/ai/*                        | …
 lib/store/stripeApi.ts           | 51 +
 5 files changed, ~261 insertions(+), 23 deletions(-)
```

(+ untracked module/panels/docs + `20260909` migration; Commerce `20260908` draft removed)

## git status --short

Dirty P1–P5A working tree; **no commit; no push**.

## Blockers

None for a separate remote-apply GO of `20260909` (still no production money enablement).

## Explicit confirmation

**NO remote apply / NO migration repair / NO commit / NO push / NO Stripe refund**

## Exact recommended next step only

**Explicit remote-apply GO for `20260909` only** (targeted SQL + history registration + verify; still no production gate enablement / no live refund).

**STOP.**
