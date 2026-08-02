# Commerce Remote Migration Blocker Remediation Planning V1

Capability: `commerce.ops.chain_migration_apply_readiness_v1` (blocker remediation planning)  
Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-remote-migration-blocker-remediation-v1`  
Branch: `office/commerce-remote-migration-blocker-remediation-v1`  
Base: `2dc6dfd` (`docs(commerce): add remote migration preflight v1`)  
Linked project: **`tgucwnjwoyeqoxqaxmew`**  
Mode: **READ-ONLY evidence + planning**  
Mutations performed: **none** (no apply, no repair, no DDL/DML)

Prior remote decision remains: **`NOT_READY_FOR_REMOTE_APPLY`** for `20260889 → 20260890 → 20260891`.

---

## Decision summary

| Item | Decision |
| --- | --- |
| `20260823` history registration | **`SAFE_TO_REGISTER_HISTORY`** |
| `20260824` remote apply readiness | **READY_TO_APPLY_AFTER_23_HISTORY** (separate GO) |
| `20260884` remote apply readiness | **READY_TO_APPLY** (separate GO; no commercial seed) |
| This milestone | Planning only — **no remote mutation** |

---

## 1. `20260823` verification (local vs remote)

Local file: `supabase/migrations/20260823_store_payment_outcome_sync_v1.sql`  
Remote history row: **absent**  
Remote objects: **present and matching local contract**

### 1.1 Table `store_payment_outcome_events`

| Check | Local contract | Remote evidence | Match |
| --- | --- | --- | --- |
| Columns (15) | id, event_key, correlation_id, request_fingerprint, fingerprint_alg, payment_attempt_id, order_id, outcome, amount_minor, currency, ueos_journal_entry_id, order_history_id, provider_reference, metadata, created_at | identical names/types/nullability/defaults | **YES** |
| PK | `store_payment_outcome_events_pkey` | present | **YES** |
| Unique | `store_payment_outcome_events_event_key_uidx` | present | **YES** |
| CHECKs | event_key/correlation/fingerprint lens; fingerprint_alg=`md5`; outcome enum; amount≥0; currency `^[A-Z]{3}$`; provider_ref len; metadata object | all present with matching defs | **YES** |
| FKs | payment_attempts, orders, ueos_journal_entries, order_status_history (ON DELETE RESTRICT) | all present | **YES** |
| Indexes | correlation / attempt / order (+ pkey/unique) | all present | **YES** |
| RLS | ENABLE + FORCE; no authenticated policies | enabled=yes, forced=yes, policies=[] | **YES** |
| Table grants | REVOKE from public/anon/authenticated | only `service_role` has table privileges | **YES** |

### 1.2 Functions (signatures / security / grants)

All 12 local functions present remotely with expected identity args:

- `apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)` — **SECURITY DEFINER**, comment exact match to local 23 text (no “Settlement refund guard” clause)
- Helpers: `store_payment_expected_posting_template`, `assert_posting_template`, `canonical_request_object`, `compute_request_fingerprint`, `resolve_ueos_lines`, `attempt_transition_allowed`, `order_status_for_outcome`, `policy_code_for_outcome`, `assert_caller_metadata`, `resolve_policy`, `outcome_replay_payload`

EXECUTE grants on `apply_store_payment_outcome`:

| Role | can_execute |
| --- | --- |
| anon | no |
| authenticated | no |
| service_role | yes |

Body probe: `calls_settlement_refund_guard = false` (not the 24-replaced body).  
`store_settlement_assert_refund_allowed` **absent** remotely.

### 1.3 UEOS policies seeded by 23

| policy_code | version | status | Present |
| --- | --- | --- | --- |
| `store.payment.authorized` | 1 | active | YES |
| `store.payment.captured` | 1 | active | YES |
| `store.payment.refunded` | 1 | active | YES |

### 1.4 Related history note (out of primary blocker list, but material)

`20260822` (`ueos_foundation_v1`) objects exist (`ueos_policies`, `ueos_journal_entries`, `ueos_accounts`) but **history row also absent**. This does **not** invalidate the 23 object match; ops should address 22 under the same history-repair GO (or immediately before) for contiguous CLI history.

---

## 2. `SAFE_TO_REGISTER_HISTORY` — why

**Decision: `SAFE_TO_REGISTER_HISTORY`**

Reasons:

1. Remote schema for every object created by local `20260823` matches the migration contract (table/columns/constraints/indexes/RLS/grants/policies/functions/signatures/UEOS seeds).
2. Remote `apply_store_payment_outcome` is still the **23 baseline** (comment + body), not the 24 settlement-guard replacement — so registering 23 does not paper over a divergent later body that claimed to be 23.
3. No partial/extra columns or conflicting constraints were found on `store_payment_outcome_events`.
4. Money RPC posture matches: service_role execute only; no client policies on the event table.
5. Therefore inserting the history row (via a **future** separate repair GO) would document truth already present in the database, without needing to re-run DDL.

**Not performed in this milestone:** `migration repair`, SQL inserts into `schema_migrations`, or any apply.

---

## 3. `20260824` readiness (do not apply)

Local file: `supabase/migrations/20260824_store_merchant_settlement_foundation_v1.sql`  
Remote history: **absent** · Settlement objects: **absent** (clean apply surface)

### 3.1 Prerequisites

| Prerequisite | Remote |
| --- | --- |
| `store_payment_outcome_events` + `apply_store_payment_outcome` | present (23 objects) |
| UEOS (`ueos_policies`, journals, `ueos_ensure_account`, `ueos_post_journal`) | present |
| `stores` / `orders` / `payment_attempts` | present |
| `store_settlement_events` / active_allocations / `apply_store_settlement_event` | **absent** (expected pre-apply) |
| `store.settlement%` UEOS policies | **absent** (expected pre-apply) |
| History `20260823` | **absent** — register first |

**Readiness: READY_TO_APPLY_AFTER_23_HISTORY** (and preferably after/with `20260822` history repair).

### 3.2 Exact post-apply verification checklist (future GO)

After a dedicated apply GO for `20260824` only:

1. `schema_migrations` contains `20260824` / `store_merchant_settlement_foundation_v1`
2. Tables exist: `store_settlement_events`, `store_settlement_active_allocations`
3. Both tables: RLS enabled + forced; no anon/authenticated table grants
4. Indexes present (correlation/store/order/payment_attempt/capture_event/allocation_event + event_key unique)
5. Function `apply_store_settlement_event(...)` exists; EXECUTE service_role only
6. Helpers present: `store_settlement_*` including `store_settlement_assert_refund_allowed`
7. `apply_store_payment_outcome` comment/body now references settlement refund guard
8. UEOS policies `store.settlement%` seeded (allocate/release/hold/reverse as defined in SQL)
9. Smoke (service_role only): allocate after capture → release/hold/reverse paths as ops allows; refund blocked while allocated

---

## 4. `20260884` readiness (do not apply)

Local file: `supabase/migrations/20260884_store_commission_policy_foundation_v1.sql`  
Remote history: **absent** · Objects: **absent**

### 4.1 Prerequisites

| Prerequisite | Remote |
| --- | --- |
| `orders` / `payment_attempts` | present |
| `store_commission_policies` | absent (expected) |
| `resolve_store_commission_policy` / `compute_store_commission_split` | absent (expected) |

DDL has **no hard dependency** on settlement (`20260824`). Product path for later `20260890` needs both 24 and 84.

### 4.2 No automatic commercial-rate seed — confirmed

Local SQL explicitly:

- Header: does **not** auto-activate policies or invent merchant share
- Comment: “No active seed; missing policy fails closed”
- Trailer: “No active policy seed: missing policy remains fail-closed / not_configured”
- **No** `INSERT INTO store_commission_policies` in the migration

### 4.3 Exact post-apply verification checklist (future GO)

1. `schema_migrations` contains `20260884`
2. Table `store_commission_policies` exists with bps-sum=10000 checks and code/version unique
3. Index `store_commission_policies_lookup_idx` present
4. RLS enabled + forced; anon/authenticated revoked; service_role DML granted
5. `resolve_store_commission_policy(text,timestamptz)` present; EXECUTE service_role only
6. `compute_store_commission_split(bigint,integer,integer,integer,integer,integer)` present; EXECUTE service_role only
7. `SELECT count(*) FROM store_commission_policies` = **0** (or only intentional operator drafts — never auto-active seed)
8. `SELECT count(*) FROM store_commission_policies WHERE status='active'` = **0** immediately after apply
9. Resolve with no rows → fail-closed / `not_configured` behavior as designed

---

## 5. Exact ordered remediation plan (future GOs only)

```text
0) (Recommended same history-repair GO) Verify+register 20260822 if ops requires contiguous history
1) Register history for 20260823 ONLY  →  SAFE_TO_REGISTER_HISTORY (this evidence)
2) Re-read schema_migrations: confirm 20260823 present; still no 20260824/84 objects beyond expectations
3) Apply 20260824 (targeted file / explicit version — NEVER db push --include-all)
4) Run §3.2 post-apply checklist for 24
5) Apply 20260884 (targeted)
6) Run §4.3 post-apply checklist for 84
7) Re-run Commerce Remote Migration Preflight V1
8) Only if preflight returns READY_FOR_REMOTE_APPLY → separate GO for 20260889 → 20260890 → 20260891
```

---

## 6. Stop conditions

| Condition | Action |
| --- | --- |
| Project ref ≠ `tgucwnjwoyeqoxqaxmew` | **STOP** |
| Any mismatch vs §1 evidence before register | **STOP** — mark `UNSAFE_TO_REGISTER_HISTORY`; do not repair |
| Temptation to re-run full `20260823` SQL blindly on prod | **STOP** — register history only if still SAFE; do not duplicate-create |
| Apply 24 before 23 history registered (and objects still match) | **STOP** / fix history first per ops policy |
| `db push` / `--include-all` | **STOP** |
| Apply 84 and find unexpected active policy rows seeded | **STOP** — treat as incident (local SQL should not seed) |
| Any DDL/DML error mid-apply | **STOP** — do not continue to next version |
| Preflight still NOT_READY after 24+84 | **STOP** — do not apply 89/90/91 |

---

## 7. Evidence commands used (read-only)

```bash
npx supabase projects list
npx supabase db query --linked -f scripts/remote-preflight/blocker-remediation/<file>.sql -o json
```

Probe folder: `scripts/remote-preflight/blocker-remediation/`  
No `db push`, `migration up`, `db repair`, `db reset`, DDL, or DML.  
No secrets in this document.
