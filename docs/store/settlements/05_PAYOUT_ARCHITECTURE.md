# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 05 · Payout Architecture

**Document type:** Architecture (design only) — **abstractions only**  
**Status:** Not implemented; no live bank/PSP/wallet integration claimed  
**Related:** `04_SETTLEMENT_LIFECYCLE.md`, `10_SECURITY_PRIVACY_AND_PERMISSIONS.md`

---

## 1. Purpose

Define how **eligible** merchant balances leave platform custody through controlled, idempotent, auditable payout operations—without binding the design to a single provider.

---

## 2. Payout rail abstractions (future adapters)

| Rail capability | Description | Notes |
|-----------------|-------------|-------|
| `bank_transfer` | Local/international bank payout | Beneficiary account verification required |
| `connected_payment_account` | Provider-connected seller account (e.g. future Stripe Connect–class) | Capability differs by country |
| `local_payout_provider` | Regional payout APIs | Adapter interface only |
| `lawful_wallet` | Wallets only where legally permitted | Country capability matrix |

Architecture speaks in **capabilities**, not vendor SDKs. Country enablement is a config matrix (OD + compliance).

---

## 3. Core objects

| Object | Role |
|--------|------|
| `merchant_payout_profiles` | Verified payout destinations for a merchant |
| `payout_batches` | Group of payouts for a settlement close / run |
| `payouts` | One transfer intent to one profile for one currency amount |
| `payout_attempts` | Append-only try history (retries, provider refs) |

Amounts: integer minor units + currency. **No mixed-currency payouts.**

---

## 4. Beneficiary verification

Before a profile becomes `active`:

1. Ownership attestation (merchant KYB-linked)  
2. Account validation / micro-deposit or provider verification (rail-specific)  
3. Sanctions / screening hooks (`08`)  
4. Masked display only (last-4 / token), secrets in vault  

Inactive/unverified profiles MUST NOT receive payouts.

---

## 5. Batch lifecycle

```text
draft → approved → submitting → submitted → partially_paid | paid | failed → closed
```

- **Maker-checker:** create/schedule ≠ approve (see `10`)  
- Approval records actor ids and material hash of batch contents  
- Submitting posts ledger moves: `merchant_payable` → `merchant_in_transit`  

---

## 6. Attempts, retries, dedupe

- Each attempt has idempotency key / provider idempotency key  
- Retries create new `payout_attempts` rows; they MUST NOT double-credit providers  
- Failure reasons stored as stable codes + safe provider message excerpt  
- Automatic retry policy: bounded exponential backoff; poison queue after N failures  

---

## 7. Receipts & merchant visibility

- On success: receipt id, amount, currency, rail, completion time  
- Merchants see masked beneficiary and status; not raw account numbers  
- Platform finance sees full operational detail under audit controls  

---

## 8. Capability by country

Maintain a **capability registry** (config):

- Country → allowed rails  
- Min/max amounts  
- Cutoff times  
- Required KYC tier  

Unknown country → fail closed (no payout).

---

## 9. Security summary (payout-specific)

| Control | Requirement |
|---------|-------------|
| Segregation of duties | Maker ≠ checker for batch approval |
| Least privilege | Store managers cannot change payout profiles without owner/finance role |
| Secret isolation | Provider keys only in server/vault; never in client |
| Cross-merchant isolation | Absolute |
| Export controls | Payout exports audited |
| Support | Read-only limited fields; no unilateral approve |

---

## 10. Failure & rollback patterns

| Event | Ledger / settlement effect |
|-------|----------------------------|
| Attempt failed before provider accept | Reverse in-transit → eligible/held |
| Provider accepted then returned | Compensating entries + settlement `failed`/`reversed` as applicable |
| Duplicate webhook | Idempotent no-op |

Forward-fix preferred over destructive deletes.

---

## 11. Open decisions

See `12`: **OD-SD11** (first rail), **OD-SD12** (connected accounts vs bank-first), **OD-SD13** (auto vs manual approve thresholds).
