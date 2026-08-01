# Commerce Chain Remote Migration Preflight V1

Capability: `commerce.ops.chain_migration_apply_readiness_v1` (remote preflight phase)  
Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-remote-migration-preflight-v1-current`  
Branch: `office/commerce-remote-migration-preflight-v1-current`  
Base: `c473630` (`docs(commerce): add migration apply readiness v1`)  
Cherry-pick source: `5166c95` (historical preflight; re-executed live against current tip)  
Linked project: **`tgucwnjwoyeqoxqaxmew`** (`umtuba`, `eu-west-1`, `ACTIVE_HEALTHY`)  
Inspection mode: **read-only SELECT** via `npx supabase db query --linked` + `npx supabase migration list --linked`  
Mutations performed: **none**

## Decision

# **NOT_READY_FOR_REMOTE_APPLY**

Do **not** apply `20260889` / `20260890` / `20260891` until the blockers below are cleared under a separate human GO that covers prerequisite migrations first.

Repository static readiness remains PASS (`READY_FOR_SEPARATE_REMOTE_APPLY_GO`). Remote object/history readiness for the full apply slice is **FAIL**.

---

## 1. Connected project verification

| Check | Result |
| --- | --- |
| Expected ref | `tgucwnjwoyeqoxqaxmew` |
| `supabase projects list` linked | **yes** (`linked: true`) |
| Project name | `umtuba` |
| Status | `ACTIVE_HEALTHY` |
| Region | `eu-west-1` |
| Connection | IPv4 pooler (`aws-0-eu-west-1.pooler.supabase.com`) |

**PASS** — inspection targeted the correct project.

---

## 2. Migration history (relevant)

Remote Commerce tip in `schema_migrations` (recent Store slice): **`20260880`** (`store_digital_product_versioning_update_delivery_v1`).

| Version | In remote `schema_migrations`? | Notes |
| --- | --- | --- |
| `20260823` | **NO** | Payment-outcome **objects exist** (history drift) |
| `20260824` | **NO** | Settlement objects **missing** |
| `20260876` | YES | Live payment capture adapter |
| `20260877` | YES | Digital entitlement grant |
| `20260880` | YES | Remote tip for Store digital slice |
| `20260884` | **NO** | Commission policy foundation **missing** |
| `20260887` | **NO** | Notifications not applied |
| `20260888` | **NO** | Refund ops surface not applied |
| `20260889` | **NO** | Target — not applied |
| `20260890` | **NO** | Target — not applied |
| `20260891` | **NO** | Target — not applied |

`npx supabase migration list --linked` agrees: local has `20260889`–`20260891`; remote columns empty for those versions.

Remote-only rows also exist for `20260871`–`20260873` (AI/learning) with no matching local files in this worktree — unrelated to this apply slice, but confirms history/repo asymmetry.

No version-number collision on `20260889` / `20260890` / `20260891` (each prefix has exactly one local SQL file; remote has none).

---

## 3. Prerequisite migrations

| Prerequisite | History | Live objects | Status |
| --- | --- | --- | --- |
| `20260823` payment outcome | missing row | `store_payment_outcome_events` present; `apply_store_payment_outcome(...)` present | **OBJECT OK / HISTORY DRIFT** |
| `20260824` settlement foundation | missing row | **no** settlement-named relations | **MISSING — BLOCKER for 90** |
| `20260877` entitlement grant | present | `store_digital_entitlements` present; grant RPC present | **OK** |
| `20260884` commission policy foundation | missing row | `store_commission_policies` **MISSING**; resolve/split RPCs **MISSING** | **MISSING — BLOCKER for 90 & 91** |
| `20260887` notifications | missing | not required for 89/90/91 DDL | product-chain gap |
| `20260888` refund ops | missing | not required for 89/90/91 DDL | product-chain gap |

---

## 4. Target migrations `20260889` / `20260890` / `20260891`

| Target | History | Objects | Verdict |
| --- | --- | --- | --- |
| `20260889` | absent | revoke table/RPC/`revoked_at` all absent | **absent** (not applied) |
| `20260890` | absent | decomposition table/RPCs absent | **absent** (not applied) |
| `20260891` | absent | activation table/RPCs/one-active index absent | **absent** (not applied) |

No partial apply of the target slice.

---

## 5. Missing objects (blocking / expected)

### Expected missing (targets not applied) — OK for a clean apply later

- `store_digital_entitlement_revoke_events`
- column `store_digital_entitlements.revoked_at`
- `revoke_store_digital_entitlements_after_refund`
- `store_commission_decomposition_events`
- `apply_store_commission_decomposition_after_capture`
- `mark_store_commission_decomposition_after_refund`
- `get_store_commission_decomposition_for_attempt`
- `store_commission_policy_activation_events`
- `activate_store_commission_policy` / `deactivate_store_commission_policy`
- index `store_commission_policies_one_active_per_currency_uidx`

### Unexpected missing (prerequisites) — **BLOCKERS**

- `store_settlement_events` (and all settlement-named objects)
- `store_commission_policies`
- `resolve_store_commission_policy`
- `compute_store_commission_split`

---

## 6. Existing objects (relevant)

| Object | Present |
| --- | --- |
| `orders` / `order_items` / `payment_attempts` | yes (RLS + FORCE RLS) |
| `store_payment_outcome_events` | yes (RLS + FORCE RLS) |
| `store_digital_entitlements` | yes (RLS + FORCE RLS); columns include `status`, `payment_attempt_id`; **no** `revoked_at` |
| `apply_store_payment_outcome` | yes — EXECUTE `service_role` only (anon/authenticated no) |
| `grant_store_digital_entitlements_after_capture` | yes — EXECUTE `service_role` only |
| `list_my_store_digital_entitlements` | yes — EXECUTE authenticated + service_role |

---

## 7. RPC compatibility

| RPC (repo contract) | Remote | Compatible? |
| --- | --- | --- |
| revoke / decomp apply / decomp mark / decomp get / activate / deactivate | absent | N/A until apply |
| `resolve_store_commission_policy` | absent | **blocks 90** |
| `compute_store_commission_split` | absent | **blocks 90** |
| `apply_store_payment_outcome` (prereq) | present with expected arg names | OK for 89 dependency story |
| grant entitlement RPC (prereq) | present | OK for 89 |

No obsolete activate RPC from historical `fded934` was found remotely (activate count = 0).

---

## 8. Duplicate active commission policies

**N/A — table missing.**

`store_commission_policies` does not exist, so multi-active preflight cannot return rows and is **not** currently a 91 unique-index data blocker. After `20260884` is applied and any seed/activation occurs, re-run:

```sql
SELECT currency, count(*) AS active_count
FROM public.store_commission_policies
WHERE status = 'active'
GROUP BY currency
HAVING count(*) > 1;
```

---

## 9. Partial apply / collision / drift findings

| Signal | Result |
| --- | --- |
| Any 89 object without history | **no** |
| Any 90 object without history | **no** |
| Any 91 object without history | **no** |
| History row without objects | **no** for 89/90/91 |
| Local version collision on 89/90/91 | **no** (one file each) |
| Remote-only unrelated versions | `20260871`–`20260873` (AI/learning) — out of scope |
| `20260823` objects without history | **yes — history drift** |
| Gap local-only between remote tip and targets | many (`20260881`…`20260888`, plus 23/24/84) |

**No partial apply** of the target slice. Clean slate for targets once prerequisites exist.

---

## 10. Exact ordered apply plan (when unblocked)

Still:

```text
20260889 → 20260890 → 20260891
```

**But only after** targeted remote application (separate GO) of at least:

1. `20260824` settlement foundation (objects currently absent)
2. `20260884` commission policy foundation (objects currently absent)

Also resolve `20260823` **history drift** (objects present, history row absent) under ops policy before relying on CLI history as source of truth.

Recommended unblocking sequence (separate GOs; not this milestone):

```text
ops-repair/register 20260823 history (if required by policy)
→ apply 20260824 (settlement)
→ apply 20260884 (commission foundation)
→ re-run THIS preflight until READY_FOR_REMOTE_APPLY
→ apply 20260889 → 20260890 → 20260891
```

Product-chain completeness (not hard DDL blockers for 89/90/91): `20260887`, `20260888`.

**Never** `supabase db push` / `--include-all` — many local-only versions sit between remote tip `20260880` and `20260891`.

---

## 11. Stop conditions and recovery

### Stop (do not apply / abort sequence)

| Condition | Action |
| --- | --- |
| Project ref ≠ `tgucwnjwoyeqoxqaxmew` | **STOP** — wrong database |
| Prerequisite objects still missing (`20260824` / `20260884`) | **STOP** — do not apply 89/90/91 |
| Partial objects for 89/90/91 without matching history | **STOP** — escalate; forward-repair only |
| Multi-active commission rows before 91 | **STOP** before 91; repair data |
| Any migration SQL error mid-slice | **STOP** — do not continue to next file |
| Temptation to `db push --include-all` | **STOP** — out of policy |

### Recovery (if a future apply fails)

| Situation | Recovery |
| --- | --- |
| 89 fails | Do not apply 90/91; fix SQL/prereqs; retry 89 only |
| 90 fails after 89 | Leave 89; forward-repair; retry 90 only |
| 91 fails after 90 | Leave 89+90; repair multi-active data; retry 91 only |
| Wrong project touched | Immediate ops incident; no further applies |

**Do not** `DROP TABLE` of revoke/decomposition/activation event tables in production.

---

## 12. Production risks

| Risk | Severity | Notes |
| --- | --- | --- |
| Applying 90 before settlement + commission foundation | **Critical** | SQL will fail (missing tables/RPCs) |
| Applying 91 before commission foundation | **Critical** | SQL will fail |
| Blind `db push --include-all` from tip→91 | **Critical** | Would attempt many unrelated local-only migrations |
| `20260823` history drift | High | Objects exist without migration row; repair/register must be explicit and careful |
| Applying 89 alone | Medium | Likely DDL-feasible today, but **out of scope** for this full-chain GO; refund product path still needs 88 wire-in remotely |
| Multi-active policies | Deferred | Re-check after 84 (+ any activation) before 91 |

---

## 13. GO / NO-GO

| Gate | Status |
| --- | --- |
| Correct project `tgucwnjwoyeqoxqaxmew` | PASS |
| Repository static verifier | PASS (separate) |
| Prerequisites present for full 89→90→91 | **FAIL** |
| Targets clean (no partial) | PASS |
| Multi-active clean | N/A (table missing) |
| Remote mutation | **NOT PERFORMED** |

### **NOT_READY_FOR_REMOTE_APPLY**

Exact blockers:

1. Remote missing settlement foundation objects (`20260824` not applied).
2. Remote missing commission policy foundation objects/RPCs (`20260884` not applied).
3. Migration history drift for payment outcome (`20260823` objects without history row) must be handled under ops policy before treating history as authoritative.
4. Intermediate product migrations `20260887` / `20260888` also absent remotely (chain completeness).

---

## Evidence commands used (read-only)

```bash
npx supabase projects list
npx supabase migration list --linked
npx supabase db query --linked -f scripts/remote-preflight/<file>.sql -o json
```

Probe files used: `07`, `07b`, `09`, `10`, `11`, `12`, `14`, `15`, `16`, `17`–`20`.

No `db push`, `migration up`, `db reset`, `db repair`, DDL, or DML was executed.
No secrets were printed in this report.
