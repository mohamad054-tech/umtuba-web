# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 09 · Reconciliation and Audit

**Document type:** Architecture (design only)  
**Status:** Not implemented  
**Related:** `02`, `04`, `05`, `06`

---

## 1. Goal

Ensure platform books, provider truth, and merchant settlements tell the **same story**—and when they do not, create durable, assignable issues.

---

## 2. Reconciliation surfaces

Reconcile across:

| Stream | Truth role |
|--------|------------|
| Orders | Commercial intent & snapshots linkage |
| Payment attempts | Attempt ledger (incl. deferred stubs today) |
| Successful payments | Provider-settled money in |
| Refunds / chargebacks | Provider money out / reverses |
| Inventory reservation consume/release | Inventory consistency only; not cash |
| Fulfillment | Ops correlation (delivery windows) |
| Ledger | Authoritative platform books |
| Settlements / settlement items | Merchant eligibility |
| Payouts / attempts | Money out to merchants |
| Provider statements | External bank/PSP statements |

---

## 3. Reconciliation runs

A `reconciliation_run`:

- Scope: time range, currency, provider, merchant (optional)  
- Produces matches, mismatches, missing, duplicates  
- Is idempotent for the same scope key  

`reconciliation_issues` capture:

- Type: `missing_payment`, `duplicate_event`, `amount_mismatch`, `currency_mismatch`, `unlinked_order`, `payout_unconfirmed`, `late_event`, etc.  
- Severity, status (`open`/`in_progress`/`resolved`/`wont_fix`)  
- Linked ids  
- Operator notes (no secrets)  

---

## 4. Handling anomalies

| Anomaly | Response pattern |
|---------|------------------|
| Missing provider event | Wait window → escalate; do not invent payment |
| Duplicate event | Idempotent ignore; issue if double-posted historically |
| Delayed capture | Keep settlement `pending` |
| Amount mismatch | Block eligibility; finance investigation |
| Payout unconfirmed | Keep `merchant_in_transit`; escalate |

Operator corrections use **adjustments** + compensating ledger entries—not silent balance edits.

---

## 5. Period close

Close procedure (future runbook):

1. Freeze recognition for period boundary  
2. Run reconciliation to zero critical issues  
3. Close settlement period  
4. Approve payout batches (maker-checker)  
5. Archive statement artifacts  
6. Record `financial_audit_events` for close  

---

## 6. Audit records

`financial_audit_events` append-only:

- Actor, action, entity refs, before/after hashes (where safe)  
- Includes payout approvals, hold changes, rule publishes, export downloads  

Retention: long-lived; deletion only under legal hold policy.

---

## 7. Inventory note

Reservation consume/release participates in **operational** reconciliation (oversell prevention) but **MUST NOT** be treated as cash reconciliation substitutes.

---

## 8. Open decisions

See `12`: **OD-SD23** (recon cadence), **OD-SD24** (auto-hold on mismatch), **OD-SD25** (statement format).
