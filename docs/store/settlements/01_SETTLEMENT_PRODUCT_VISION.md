# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 01 · Settlement Product Vision

**Document type:** Architecture / product vision (design only)  
**Status:** Not implemented — documentation under `docs/store/settlements/`  
**Audience:** Product, Finance Ops, Platform Engineering, Compliance  
**Depends on (upstream, existing foundations):** Orders, Checkout, Deferred Payment Attempts, Commerce Safety & Inventory Reservation, Fulfillment (operational). **Does not modify those systems.**

> This package describes **future** seller financial settlements and payouts. It does **not** claim that live payments, ledger, commissions, or payouts exist in the current codebase. Current Store finance surfaces remain placeholders (`not_configured`).

---

## 1. Purpose

UMTUBA Store must eventually pay merchants correctly, safely, and audibly for **finalized** commerce activity—without conflating browse carts, unpaid orders, inventory reservations, or fulfillment logistics with seller revenue.

This architecture defines:

- How money **moves conceptually** from buyer payment → platform custody → merchant settlement → payout
- How **fees, commissions, reserves, refunds, and disputes** affect what merchants can withdraw
- How **multi-merchant, multi-store, multi-country, multi-currency** operations stay isolated and reconcilable
- How **compliance** (KYC/KYB, tax, sanctions) can gate payouts without inventing country-specific legal advice here

---

## 2. Product principles

| Principle | Meaning |
|-----------|---------|
| **Trust before cash-out** | Payouts require verified beneficiaries, clear eligibility, and audit trails |
| **Finality before proceeds** | Unpaid orders and active inventory reservations are **never** seller revenue |
| **Separation of concerns** | Order ≠ Payment ≠ Fulfillment ≠ Reservation ≠ Settlement ≠ Payout |
| **Integer money** | All amounts in **minor units** with an explicit **currency** on every financial record |
| **No mixed-currency totals** | Never sum across currencies; convert only with explicit FX policy (see `07`) |
| **Immutable ledger** | Corrections use compensating entries; never rewrite history |
| **Snapshots bind history** | Commission and fee rules applied to an order are frozen at financial recognition time |
| **No client-authored money** | Buyers/sellers never supply authoritative totals, fees, or payout amounts |
| **Least privilege** | Cross-store and cross-merchant financial access is forbidden by default |
| **Architecture ≠ advice** | Tax/compliance sections are extension points only—not legal or tax advice |

---

## 3. Actors and entities

| Entity | Role |
|--------|------|
| **Merchant** | Legal/KYB entity that may own one or more stores |
| **Store** | Selling surface; owns catalog and store-scoped orders |
| **Buyer** | Pays for orders; does not access merchant ledgers |
| **Platform** | Collects payments (future), withholds commissions/fees, settles and pays out |
| **Finance operator** | Platform role that runs reconciliation and payout operations |
| **Auditor** | Read-only financial audit access |
| **Payment / payout providers** | External rails (future adapters; not specified as live integrations here) |

---

## 4. What merchants experience (future UX intent)

1. **Earnings overview** — recognized proceeds by currency; never mixes currencies.  
2. **Settlement statements** — period-based statements of eligible vs held amounts.  
3. **Payout settings** — verified payout profiles (bank / connected account / local rail / wallet where lawful).  
4. **Holds & issues** — clear reasons (reserve, dispute, KYC, mismatch) without leaking buyer PII.  
5. **History** — immutable statement downloads and payout receipts.

Browse Beta / Commerce Safety do **not** imply these screens exist today.

---

## 5. State domains (must stay separate)

```text
Order lifecycle     → commercial commitment & fulfillment workflow
Payment lifecycle   → capture / authorize / refund / chargeback (provider truth)
Reservation         → inventory hold (Commerce Safety); not money
Fulfillment         → ship / deliver / return logistics
Settlement          → recognition & eligibility of merchant proceeds
Payout              → external transfer of eligible balances
```

**Hard rules**

- Pending-payment orders → **no** settlement recognition  
- Active inventory reservation → **no** proceeds  
- Shipping and tax lines → **not** merchandise revenue unless an explicit platform policy says otherwise (see Open Decisions)  
- Platform-funded promotions vs seller-funded discounts → different ledger treatments (see `06`)

---

## 6. Capability scope of this architecture

**In scope (design)**

- Multi-merchant / multi-store  
- Multi-country / multi-currency accounting model  
- Commissions, processing fees, reserves, adjustments  
- Refunds, returns, disputes, chargebacks (financial effects)  
- Settlement periods, payout batches/attempts/retries  
- Reconciliation and audit  
- KYC/KYB and compliance **extension points**

**Out of scope (this package)**

- Implementing SQL, RPCs, APIs, or UI  
- Choosing or integrating a specific live payment or payout provider  
- Changing Commerce Safety, checkout, orders, payment attempts, fulfillment, shipping, analytics, or Store Hardening  
- Providing country-specific tax or regulatory determinations

---

## 7. Success criteria (future)

A settlement system is ready for closed finance beta when:

1. Every recognized amount is backed by an immutable ledger entry set that balances.  
2. Unpaid and reserved inventory paths cannot increase withdrawable balances.  
3. Commission snapshots make historical orders immune to rule changes.  
4. Payouts require maker-checker (or equivalent) and verified beneficiaries.  
5. Reconciliation can explain gaps between provider statements and the ledger.  
6. Sellers never see another merchant’s financial data.

---

## 8. Document map

| File | Topic |
|------|--------|
| `02_FINANCIAL_LEDGER_ARCHITECTURE.md` | Ledger model recommendation |
| `03_COMMISSION_AND_FEE_ENGINE.md` | Fees & rule versioning |
| `04_SETTLEMENT_LIFECYCLE.md` | Eligibility & settlement states |
| `05_PAYOUT_ARCHITECTURE.md` | Payout rails & batches |
| `06_REFUNDS_RETURNS_DISPUTES_ACCOUNTING.md` | Refunds & disputes |
| `07_MULTI_CURRENCY_AND_FX.md` | FX & currency isolation |
| `08_TAX_AND_COMPLIANCE_ABSTRACTION.md` | Tax/KYC extension points |
| `09_RECONCILIATION_AND_AUDIT.md` | Reconciliation |
| `10_SECURITY_PRIVACY_AND_PERMISSIONS.md` | Roles & SoD |
| `11_DATABASE_CONCEPTUAL_BLUEPRINT.md` | Conceptual entities (no SQL) |
| `12_IMPLEMENTATION_ROADMAP_AND_OPEN_DECISIONS.md` | Phases & open decisions |

---

## 9. Normative language

| Term | Meaning in this package |
|------|-------------------------|
| **MUST / MUST NOT** | Required architectural constraint |
| **SHOULD** | Strong default recommendation |
| **MAY** | Optional extension |
| **Future** | Not present in current production Store implementation |
| **OD-SDxx** | Open Decision id in `12` |
