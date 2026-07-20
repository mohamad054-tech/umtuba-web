# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 04 · Settlement Lifecycle

**Document type:** Architecture (design only)  
**Status:** Not implemented  
**Related:** `02`, `03`, `05`, `06`

---

## 1. Definition

**Settlement** is the process of determining how much of recognized merchant proceeds becomes **eligible for payout**, subject to holds, reserves, disputes, and compliance.

Settlement is **not**:

- Order status  
- Payment capture  
- Inventory reservation  
- Fulfillment shipping  
- The payout transfer itself  

---

## 2. Settlement states (normative)

| State | Meaning |
|-------|---------|
| `pending` | Recognition happened (or candidate); eligibility window not open |
| `eligible` | Available to include in a settlement period / payout |
| `held` | Temporarily blocked (reserve, risk, manual hold) |
| `under_review` | Compliance or finance review required |
| `scheduled` | Assigned to a future payout batch |
| `processing` | Included in an in-flight payout attempt |
| `paid` | Payout confirmed by provider (or equivalent finality) |
| `failed` | Payout attempt failed; funds return to eligible/held per reason |
| `reversed` | Prior paid settlement undone via compensating finance events |
| `cancelled` | Never paid; closed without payout (e.g. full clawback) |

Transitions MUST be audited. Illegal skips (e.g. `pending` → `paid`) are forbidden.

---

## 3. Settlement periods

A **settlement_period** is a time box (e.g. daily/weekly) per merchant (and optionally per currency):

- Opens/closes with operator or automated close job  
- Aggregates **settlement_items** (order-linked net proceeds slices)  
- Produces a statement artifact for the merchant  

Periods MUST NOT mix currencies.

---

## 4. Eligibility gates (default policy sketch)

An item MAY move `pending` → `eligible` only when **all** hold:

1. **Payment finality** — payment status is a platform-defined “settled/captured” class (not pending/deferred stub alone).  
2. **Recognition posted** — order financial snapshot + balancing ledger transaction exist.  
3. **Delivery / return window** — optional waiting period after delivery or shipment (OD).  
4. **No open blocking dispute** — or only partial eligibility if policy allows.  
5. **Reserve rules applied** — rolling reserve % parked in `held`.  
6. **Compliance clear** — KYC/KYB not in blocking state; no sanctions hold.  
7. **Reconciliation not blocking** — no critical unmatched payment for that order.

**MUST NOT** become eligible because inventory was reserved or an unpaid order exists.

---

## 5. Holds, reserves, under_review

| Mechanism | Effect |
|-----------|--------|
| Rolling reserve | Portion of proceeds stays `held` for N days/periods |
| Dispute hold | Linked order items → `held` or `under_review` |
| Compliance hold | Merchant-level block → new items `under_review` |
| Manual finance hold | Operator action with reason code + audit |

Release of holds creates eligibility **or** cancellation/clawback via adjustments (`06`).

---

## 6. Interaction with payouts

```text
eligible → scheduled → processing → paid
                         ↘ failed → eligible | held | under_review
```

`paid` is only set when payout provider confirmation (or controlled manual confirmation with maker-checker) is recorded. Failed payouts MUST NOT erase recognition; they re-queue funds.

---

## 7. Reversal & cancellation

- **reversed:** after `paid`, if clawback needed (chargeback after payout) — may create negative future eligibility or receivable from merchant (OD).  
- **cancelled:** item closed without payout (e.g. full refund before payout).  

Both require compensating ledger entries.

---

## 8. Multi-store merchants

- Settlement items retain `store_id` for attribution.  
- Payout MAY consolidate at merchant level (recommended) while statements show store breakouts.  
- Cross-store access controls still apply for human users (see `10`).

---

## 9. Operational readiness (future)

- Period close checklist  
- Exception queue for `under_review`  
- Merchant-visible reason codes (safe, non-PII)  
- Kill switch: freeze new `scheduled` transitions  

---

## 10. Open decisions

See `12`: **OD-SD01** (recognition/finality), **OD-SD08** (return window), **OD-SD09** (reserve %), **OD-SD10** (period cadence).
