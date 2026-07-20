# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 02 · Financial Ledger Architecture

**Document type:** Architecture (design only)  
**Status:** Not implemented  
**Related:** `01_SETTLEMENT_PRODUCT_VISION.md`, `11_DATABASE_CONCEPTUAL_BLUEPRINT.md`

---

## 1. Recommendation

**Recommended model: Hybrid platform ledger with merchant (and optional store) subledgers.**

| Option | Verdict |
|--------|---------|
| Platform-wide ledger only | Rejected as sole model — hard to isolate merchant statements and payout eligibility |
| Per-store ledger only | Rejected — merchants with many stores need consolidated KYB, reserves, and payouts |
| Per-merchant ledger only | Incomplete — loses store-level attribution needed for ops and category fees |
| **Hybrid account / subledger** | **Selected** — one Chart of Accounts (CoA), merchant control accounts, store analytical dimensions |

### Why hybrid

1. **One balancing domain** for the platform (daily books close cleanly).  
2. **Merchant subledger** for statements, holds, and payout wallets per currency.  
3. **Store dimension** on entries for attribution without fragmenting cash control accounts.  
4. Scales to multiple countries via **currency-isolated accounts** (see `07`).

---

## 2. Core concepts

### 2.1 Accounts

An **account** is a named balance bucket in a single currency, owned by the platform CoA or a merchant subledger.

**Account classes (illustrative)**

| Class | Examples |
|-------|----------|
| Asset | Platform payment clearing, merchant funds payable (contra as liability), FX clearing |
| Liability | Merchant payable (per merchant + currency), buyer refund liability, tax payable (extension) |
| Revenue | Platform commission revenue, processing fee revenue (if retained), FX gain |
| Expense | Platform-funded promo expense, FX loss, payout rail fees (if absorbed) |
| Equity / contra | Rare; prefer explicit revenue/expense |

**Merchant subledger accounts (per merchant × currency)**

- `merchant_payable` — recognized, not yet paid out  
- `merchant_held` — reserved/held portion  
- `merchant_in_transit` — payout batch submitted, not confirmed  
- Optional analytical splits by store via dimensions, not separate cash accounts

### 2.2 Ledger transactions

A **ledger_transaction** is an atomic economic event:

- Has `idempotency_key` (unique)  
- Has `source_type` + `source_id` (order payment, refund, adjustment, payout, etc.)  
- Has `posted_at` / `value_date`  
- Contains ≥2 **ledger_entries** that **balance** in the same currency  
- Is **immutable** after post (void via compensating transaction)

### 2.3 Journal entries (debits & credits)

Each **ledger_entry**:

- References one account  
- Has `direction` debit|credit **or** signed amount convention (pick one platform-wide; recommend explicit debit/credit columns)  
- Amount in **integer minor units**  
- Currency **MUST** match the parent transaction currency  
- MAY carry `store_id`, `order_id`, `settlement_id` as non-authoritative dimensions for reporting

**Balancing rule:** For every transaction, `sum(debits) = sum(credits)` in that currency.

### 2.4 Event sources (future)

| Source event | When recognized (policy-gated) |
|--------------|--------------------------------|
| Payment captured / settled | First recognition candidate |
| Refund succeeded | Compensating recognition |
| Chargeback / dispute loss | Compensating + reserve |
| Manual adjustment | Finance operator + maker-checker |
| Payout submitted / confirmed / failed | Move payable → in transit → cleared or reverse |
| Reserve hold / release | Reclass within merchant subledger |

**MUST NOT** emit recognition from: cart, quote, unpaid order, active inventory reservation, or fulfillment-only updates.

---

## 3. Currency isolation

- Every account is **single-currency**.  
- Every transaction is **single-currency**.  
- Cross-currency effects require an explicit FX transaction pair (see `07`) with rate timestamp — never invent rates.  
- Merchant statements are **per currency**; UI MUST NOT show a single “total earnings” across currencies without labeled conversion disclaimer (presentation-only).

---

## 4. Correction entries

Destructive edits to posted entries are **forbidden**.

| Need | Pattern |
|------|---------|
| Fix wrong recognition | Compensating transaction referencing original `ledger_transaction_id` |
| Partial unwind | Compensating amount ≤ original recognized amount (policy-enforced) |
| Reclass hold → payable | Balanced reclass transaction (same currency) |

---

## 5. Idempotency

- Every posting path MUST accept an idempotency key.  
- Retries return the same `ledger_transaction` id.  
- Duplicate provider webhooks MUST NOT double-post.

---

## 6. Snapshots vs live balances

| Artifact | Role |
|----------|------|
| **Order financial snapshot** | Frozen breakdown (merchandise, shipping, tax, discount, commission, fees, net) at recognition |
| **Account balance** | Derived from posted entries (materialized cache allowed, rebuildable) |
| **Settlement item** | Links snapshot lines into a settlement period |

Caches MUST be rebuildable from the immutable entry stream.

---

## 7. Audit retention

- Ledger transactions/entries: long retention (jurisdiction-dependent; design for multi-year).  
- Soft-delete of accounts is allowed only if no open balances; entries remain.  
- Export for auditors MUST be complete for a closed period.

---

## 8. What this is not

- Not double-entry training for operators (finance ops runbooks come later).  
- Not a claim that `20260817` analytics/finance foundation implements this ledger (it does not).  
- Not SQL DDL (see conceptual blueprint in `11`).

---

## 9. Open decisions referenced

See `12_IMPLEMENTATION_ROADMAP_AND_OPEN_DECISIONS.md`: **OD-SD01** (recognition trigger), **OD-SD02** (store vs merchant payable primacy), **OD-SD03** (debit/credit column convention).
