> **P5C2 supersession (2026-08-07):** Active Commerce draft is now **`20260915`**. Do **not** use `20260914` (Translation reserved: `translation_studio_memory_identity_contract_align_v1` on `origin/office/platform-translation-trunk-port-v1`). Rejected also: Learning `20260908`/`20260909`. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C2_ALLOCATION_REPORT.md`.

> **P5C supersession (2026-08-07):** Active Commerce draft is now **`20260914`**. Remote **`20260908`** remains Learning (`learning_personal_notes_hub_v1`); remote **`20260909`** remains Learning (`learning_assessment_due_ux_followthrough_v1`). Do not treat either as the active Commerce migration version. See `COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P5C_RENUMBER_REPORT.md`.

> **P5A supersession (2026-08-07):** Commerce draft renumbered to **`20260909`**. Remote **`20260908` remains Learning** (`learning_personal_notes_hub_v1`). Do not treat historical P0 candidate `20260908` as Commerce-owned.
# COMMERCE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P0_AUDIT_REPORT

**Milestone:** Commerce Partial Refund Provider Money Execution V1  
**Phase:** P0 — Read-Only Architecture + Production Safety Audit  
**Date:** 2026-08-07  
**Verdict:** `READY_FOR_P1`

---

## Setup facts

| Item | Value |
| --- | --- |
| new worktree | `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-provider-money-execution-v1` |
| new branch | `office/commerce-partial-refund-provider-money-execution-v1` |
| base SHA | `b8be33469f35c5ccb394925d666a5812f4c70c70` |
| base closeout | `PARTIAL_REFUND_COMMITTED_RESERVATION_COMPENSATION_V1_CLOSED` |
| working tree status | clean (no code/migration changes in P0) |
| prior compensation worktree | untouched content at same SHA; branch re-bound after accidental checkout collision during setup |

P0 performed **no** code writes for money execution, **no** migration create/apply, **no** provider refund calls, **no** commit/push.

---

## Architecture discovered

### Existing payment / provider stack

| Layer | Location | Money today? |
| --- | --- | --- |
| Payment provider catalog + optional `refund?` stub | `lib/store/payments.ts` (`PaymentProviderAdapter`) | No — foundation; Stripe adapter does not implement `refund` |
| Stripe HTTP client | `lib/store/stripeApi.ts` | Capture path only: Checkout Session create + Session/PI retrieve + webhook verify. **No `/v1/refunds`** |
| Live capture adapter | `lib/store/stripeLiveCapture.ts` | Creates sessions; attaches `provider_reference` (session id at attach time); verifies PI; builds Sync args |
| Live payment production gate | `lib/store/stripeConfig.ts` + `LIVE_PAYMENT_PRODUCTION_GATE_V1.md` | Gates **live charges** (`STRIPE_LIVE_PAYMENTS_ENABLED` + ack). Default fail-closed |
| Outcome Sync | `apply_store_payment_outcome` (`20260823`+) via `paymentOutcomeSync.ts` / `stripePaymentOutcomeApply.ts` | DB-authoritative capture/full-refund outcomes; **service_role only** |
| Payment attempts | `payment_attempts` + `provider_reference` unique `(provider, provider_reference)` (`20260876`) | Stores Stripe session/PI refs; amounts from order |
| Seller live payout (analog) | `lib/store/sellerLivePayout/*` + `store_payout_executions` (`20260898`) | Gated execution table + orchestrator + uncertain handling; **separate** from buyer refunds |

### Existing refund stack

| Layer | Location | Money today? |
| --- | --- | --- |
| Full-order Sync refund path | `lib/store/fullOrderRefundPath.ts` | Settlement unwind → Sync `refunded` → restock → revoke → commission mark. **Explicitly out of scope: bank/PSP refund rails** — expects provider confirmation *outside* |
| Refund ops workflow | `lib/store/refundOperations/*` + admin `/admin/store/refunds` | Request → review → approve → execute → calls `applyFullOrderRefund` (Sync accounting), **not** Stripe Refunds API |
| Partial refund calculation | `lib/store/partialRefundPath/` | Pure ceilings; no money |
| Ledger reservation | `lib/store/partialRefundLedger/` + migrations `20260899` / `20260900` / `20260905` | `planned → committing → committed \| failed`; `committed` = **accounting reservation only** |
| Stuck committing recovery | `partialRefundStuckCommittingRecovery/` | `committing → failed` only |
| Accounting compensation | `partialRefundCommittedCompensation/` + `20260907` | `committed → compensated` restores ceilings; **not** money |
| Money execution gate (ledger) | `assertPartialRefundMoneyExecutionAllowed()` | **Always fails closed** today |

### Critical Sync constraint

`apply_store_payment_outcome` enforces:

> `amount_minor must equal payment attempt amount (full capture/refund only)`

Therefore **partial Sync `refunded` is impossible** on the current RPC without a separate migration/GO. This milestone must **not** pretend Sync already supports partial money outcomes.

### Provider reference reality

- Checkout attach stores **Checkout Session** id on the attempt.
- Capture verification resolves **PaymentIntent** (`pi_…`) for Sync `event_key` / provider reference in the verify payload.
- Refund execution must **resolve a refundable Stripe object** (PaymentIntent or Charge) from trusted attempt/outcome facts — never from client input.

---

## Exact proposed money execution boundary

### Who owns provider money execution?

A **new server-only orchestration module** (proposed: `lib/store/partialRefundProviderMoneyExecution/`), patterned after `sellerLivePayout` orchestrator + execution rows — **not** the ledger commit boundary, **not** refund-ops full-order Sync path, **not** client/seller UI.

Ledger remains owner of reservation/compensation accounting.  
Full-order Sync path remains owner of full `refunded` Sync + restock/revoke.  
This milestone owns: **provider partial refund call + durable execution attempt state** against an already-`committed` ledger reservation.

### Before or after ledger commit?

**After durable reservation (`committed`), before any Sync/settlement/restock/entitlement.**

Do **not** redefine `committed` to mean “money moved.” Existing docs and code treat `committed` as reservation-only; compensation already depends on that semantics.

Correct chain:

```
calculate → plan → begin → complete (= committed reservation)   [EXISTING]
        ↓
claim provider execution (durable attempt row, unique per ledger)
        ↓
provider refund (Stripe) with fixed Idempotency-Key
        ↓
persist provider success | failed | uncertain
        ↓
[OUT OF SCOPE for this milestone unless new GO]
  Sync partial outcome / settlement unwind / restock / entitlement / commission
```

On **hard provider reject** (definitive failure, no money moved): optional admin path may **compensate** the reservation (existing accounting tool) so ceilings return — compensation is **not** automatic inside the provider call.

On **unknown outcome**: **never** compensate and **never** mint a new idempotency key.

### Authoritative state transitions (proposed execution machine)

Separate from ledger statuses:

| Status | Meaning |
| --- | --- |
| `planned` | Execution row claimed; provider not called |
| `provider_submitted` | Request sent / in flight |
| `succeeded` | Provider confirmed refund created for expected amount/currency |
| `failed` | Provider definitive reject (safe to treat as no money moved) |
| `uncertain` | Timeout / crash / malformed / ambiguous — **recovery required** |

Ledger stays `committed` while provider succeeds (reservation remains the accounting hold).  
Ledger may later move `committed → compensated` only via existing compensation ownership when ops decides money will not proceed.

### What prevents double refund?

1. **Unique execution per ledger commit** (DB unique on `ledger_id` for non-terminal-failed retries policy, or single open/succeeded row).  
2. **Unique `(store_id, idempotency_key)`** on execution table.  
3. **Stripe `Idempotency-Key`** = same key as local execution key.  
4. Amount/currency taken only from **committed ledger row** (server), never client.  
5. Reject if prior succeeded execution exists for that ledger.  
6. Ledger ceilings already reserved — concurrent second reservation cannot over-allocate the same amount without failing begin/complete.

---

## Proposed lifecycle / state machine (end-to-end)

```
[Ledger] planned → committing → committed
                              ↘ failed (retry begin)

[Provider exec]  (requires ledger.status = committed, not compensated)
  planned → provider_submitted → succeeded
                              ↘ failed
                              ↘ uncertain → (recovery) → succeeded | failed

[Accounting compensation] committed → compensated
  ONLY when money will not / did not succeed; forbidden while succeeded provider exec exists
```

---

## Idempotency key strategy

| Concern | Decision |
| --- | --- |
| Exact key source | **Execution idempotency key** derived from **ledger id**: `prf-prov:{ledgerId}` (stable, 8..120 chars leaving room for suffixes if needed) |
| Not primary alone | Refund request id (full-order ops) — different domain |
| Not alone | Reservation idempotency key — already used for plan; reuse risks conflating plan replay with money |
| Attempt id | Payment attempt id is the **charge context**, not the refund idempotency unit |
| Stripe header | `Idempotency-Key: <same execution key>` |
| Retry semantics | Same key + same body → Stripe/local replay; **new key forbidden** after `uncertain`/`provider_submitted` |
| Network timeout | Mark `uncertain`; do not fail-closed as “no money”; do not compensate |
| Duplicate admin submit | Replay existing execution row by ledger/idempotency; no second Stripe body with new key |
| Provider response persistence | Store safe fields: `provider_refund_id` (`re_…`), status, amount, currency, failure code, redacted metadata — **no secrets** |
| Crash after provider success / before DB | Recovery: retrieve Stripe refund by idempotency key / list by PI; then persist `succeeded` |

---

## Unknown-outcome strategy

Mirror seller live payout: **no auto-fail, no auto-compensate, no auto-new-key.**

1. Persist `uncertain` with last safe error class.  
2. Admin/recovery action: re-query Stripe; transition to `succeeded` or `failed` only with evidence.  
3. If Stripe shows refund exists for key/amount → treat as success (persist provider ref).  
4. If Stripe shows no refund and reject is definitive → `failed` (then optional compensation GO separately).  
5. Block second provider submit while `provider_submitted` or `uncertain`.

---

## Failure matrix

| Case | Authoritative state | Retryable? | Recovery job/action? | Compensation? | Double-money risk |
| --- | --- | --- | --- | --- | --- |
| Provider reject (4xx definitive) | exec `failed`; ledger stays `committed` | Yes with **same** key only if Stripe allows; else new policy after failed | Optional | Optional admin compensate if abandoning | Low if no `re_` created |
| Network timeout before result | exec `uncertain` | **No** new key; recovery query only | **Required** | **No** until proven no refund | **High** if naive retry with new key |
| Provider success + local DB commit failure | money moved; local lagging | Recovery persist only | **Required** | **Forbidden** | High until DB catches up |
| Provider success + process crash | same as above | Recovery | **Required** | **Forbidden** | High until reconciled |
| Duplicate admin submit | replay existing exec | N/A (idempotent) | No | No | Low if uniqueness holds |
| Retry after unknown | remains `uncertain` until query | Only recovery path | **Required** | **No** | High if ignored |
| Malformed/partial provider response | `uncertain` | Recovery | **Required** | **No** | Medium |
| Reservation expired/invalid / not `committed` / `compensated` | reject before call | No | No | N/A | None |
| Accounting commit fails | N/A — accounting already committed before provider | N/A | N/A | N/A | None for this milestone |
| Compensation fails | stays `committed` | Retry compensate RPC | Existing compensate path | In progress | None (no provider) |
| Stale expected amount / currency mismatch | reject before call | No until facts reloaded | No | No | None |
| Provider amount mismatch vs ledger | fail closed; do not accept | No | Investigate | No until resolved | Medium if ignored |

---

## Money correctness invariants

- Integer **minor units** only (`bigint` / `number` integer checks already in ledger + calculate).  
- Currency: ISO-4217 3-letter; must match capture, ledger, attempt, and Stripe PI.  
- Max refundable ceiling = capture − Σ committed (non-compensated) reservations; provider amount **must equal** ledger `refund_amount_minor`.  
- Previously reserved amounts already held in `store_partial_refund_capture_accounting`.  
- Provider-side refundable: Stripe PI amount_received − amount_refunded; must verify ≥ ledger amount before/at call.  
- Rounding: no float; line sum must equal header (existing validate).  
- Reject zero/negative amounts (existing checks).  
- Cross-currency prohibited.  
- Stale capture/PI: resolve PI from trusted attempt; if PI missing/mismatched/cancelled → fail closed.  
- **Do not** call Sync with partial amount (current RPC rejects).

---

## Security / authorization model

| Control | Requirement |
| --- | --- |
| Who can trigger | **Platform admin only** (`assertPlatformAdminDb`), same policy as reservation create / compensation (seller money execution forbidden) |
| Seller/buyer | Read-only at most; **no** provider execute actions |
| service_role | Provider orchestration + execution RPCs: service_role / SECURITY DEFINER with grants matching ledger pattern; never anon/authenticated execute |
| Secrets | Stripe secret only via `stripeConfig` / server env; never browser; never log full keys |
| Replay | Idempotency unique constraints + admin action rejects client money fields |
| Audit | Persist operator id, reason, timestamps, failure codes, provider refund id |
| Forbidden client access | No client-supplied amount/currency/PI/refund id as source of truth |

---

## Required persistence / schema proposal

**Migration required:** **yes** (new execution table + RPCs). P0 does **not** create SQL.

Proposed shape (analogous to `store_payout_executions`):

```
store_partial_refund_provider_executions
  id uuid PK
  store_id uuid not null
  ledger_id uuid not null  -- FK ledger commits; UNIQUE for succeeded/open policy
  order_id uuid not null
  payment_attempt_id uuid not null
  capture_event_id uuid not null
  currency char(3) not null
  trusted_amount_minor bigint not null check (> 0)
  status text not null  -- planned|provider_submitted|succeeded|failed|uncertain
  idempotency_key text not null  -- unique (store_id, idempotency_key)
  provider_id text not null default 'stripe'
  provider_refund_id text null     -- re_…
  provider_charge_or_pi_ref text null
  failure_code text null
  failure_message_safe text null
  provider_metadata_safe jsonb null  -- redacted
  operator_user_id uuid null
  operator_reason text null
  recovered_at timestamptz null
  created_at / updated_at timestamptz
```

Indexes/constraints:

- `unique (store_id, idempotency_key)`
- `unique (ledger_id)` where status in (`planned`,`provider_submitted`,`uncertain`,`succeeded`) — exact SQL policy to be refined in P1 so failed rows can allow a **controlled** re-attempt only under explicit product rules (default: no automatic second attempt)

RPCs (service_role only): insert/claim, update status, get by ledger/idempotency, list uncertain for recovery.

---

## Migration required / proposed version

| Question | Answer |
| --- | --- |
| Migration required? | **yes** (for durable executions + service_role RPCs) |
| Proposed candidate version | **`20260908`** historically; **P5A allocated `20260909`** after Learning claimed remote `20260908` |
| Collision evidence (read-only docs/local) | Local Commerce tip chain: `20260899` → `20260900` → `20260905` → `20260907`. Documented remote neighbors: Learning **`20260906`**, Translation **`20260910–12`**. Gap **`20260908` / `20260909`** appears free in this worktree’s migration folder. |
| Caveat | **Must re-verify** remote `schema_migrations` / `supabase migration list` at implementation/apply time before locking the number. Do **not** treat `20260908` as reserved until P1/P-apply GO. |

---

## Production gate strategy

**Both gates required:**

1. **Existing live payment / Stripe config gate** — needed to obtain a usable Stripe secret and mode alignment (`stripeConfig`). Test-mode refunds may use `sk_test_` without live charge ack; **live** refunds require live-capable config.  
2. **Dedicated partial-refund provider money gate** (new, default **OFF**) — e.g. `PARTIAL_REFUND_PROVIDER_MONEY_ENABLED` + explicit ack string — modeled on `sellerLivePayout/gate.ts`.

**Why both:** Enabling live capture must not silently enable live refunds. Refunds are a separate irreversible money-out risk; payout already uses a dedicated gate for the same reason.

`commerce_confirm` remains independent and untouched.

---

## Recovery strategy

1. Durable `uncertain` / crash-window rows.  
2. Admin recovery action: re-fetch Stripe refund by idempotency / PI; persist terminal status.  
3. Never auto-compensate on uncertain.  
4. Optional later worker (out of P1 minimum) to list `uncertain` older than N minutes.  
5. Runbook: zero real-money until gates explicitly enabled + GO.

---

## Test plan (before any live execution)

- Pure Stripe refund adapter tests (mock fetch): amount/currency, idempotency header, malformed JSON, 4xx/5xx mapping.  
- Orchestration tests: committed-only precondition; reject compensated/planned; duplicate submit replay.  
- Idempotency: same key replay; conflicting payload fail-closed.  
- Crash/retry: success response then DB fail → recovery to succeeded without second charge.  
- Unknown timeout → uncertain; second submit blocked.  
- Malformed response → uncertain.  
- Unauthorized: non-admin / seller / anon rejected.  
- Money invariants: zero/negative, currency mismatch, amount ≠ ledger, over provider refundable.  
- Gate tests: default OFF; fixture token only in tests.  
- Stripe **test-mode** integration optional behind explicit local secrets — **zero real-money policy** for CI.  
- Contract tests: no `apply_store_payment_outcome` partial; no restock/entitlement/settlement imports in this module.

---

## Explicit forbidden ownership boundaries

This milestone does **not** automatically own:

- restock  
- entitlement revocation  
- settlement reversal / unwind  
- commission reversal  
- payout reversal / clawback  
- redefining ledger `committed` as money moved  
- partial Sync `refunded` outcome (requires separate GO + migration)  
- full-order refund ops redesign  
- `commerce_confirm` enablement  
- seller/buyer money triggers  

**Audit dependency check:** Full-order path couples Sync→restock→revoke, but that coupling is for **full** Sync `refunded`. No explicit dependency forces those into **partial provider money V1**. Keep them out unless a later GO expands scope.

---

## Blockers

| Blocker | Severity for P1 foundation | Severity for live money |
| --- | --- | --- |
| No Stripe Refunds API in `stripeApi.ts` | Resolve in P1 | Blocks live |
| No execution table | Resolve in P1 (local migration) | Blocks safe retries |
| Sync full-only amount rule | Out of scope (document + avoid calling) | Blocks Sync-visible partial refunded state |
| PI resolution from session vs stored ref | Must design in P1 | Blocks provider call |
| Live gates OFF / host not live-ready | Desired | Blocks production money |
| No remote migration number reserved | Re-check at apply | Blocks remote apply |

None of these make architecture undecidable → **READY_FOR_P1**.

---

## Exact recommended P1 deliverable only

**P1 — Local foundation (no live money, no remote apply, no gate enablement):**

1. New module `lib/store/partialRefundProviderMoneyExecution/` with capability ownership flags, dedicated **production gate (default OFF)**, provider port, and Stripe refund adapter (test-mode capable via existing Stripe config).  
2. Local migration draft for `store_partial_refund_provider_executions` + service_role RPCs (candidate historically **`20260908`**; P5A allocated **`20260909`**).  
3. Orchestrator: load committed ledger → claim execution → call provider → persist terminal/uncertain; **no** Sync/restock/entitlement/settlement/commission.  
4. Admin-only server action scaffolding behind gate + authz (UI can be minimal/disabled when gate OFF).  
5. Focused unit/contract tests listed above.  
6. Docs: implementation note + update `CURRENT_TASK` / report.  

**Explicitly not in P1:** remote migration apply, enabling any money gate, real Stripe live refunds, Sync partial outcome, compensation auto-wiring into provider success path, restock/entitlement/settlement/commission/payout.

**STOP — wait for explicit GO before P1 implementation.**
