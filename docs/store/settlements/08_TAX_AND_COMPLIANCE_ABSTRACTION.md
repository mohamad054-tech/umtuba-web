# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 08 · Tax and Compliance Abstraction

**Document type:** Architecture extension points only  
**Status:** Not implemented  
**Important:** **Not legal advice. Not tax advice.** Country rules require professional validation before enablement.

---

## 1. Purpose

Provide **hooks** so settlement/payout can respect tax identity, withholding, invoicing, KYC/KYB, and sanctions screening—without encoding jurisdiction-specific law in this design pack.

---

## 2. Tax extension points

| Hook | Intent |
|------|--------|
| Tax on merchandise (VAT/GST/sales tax) | Snapshot tags already separate tax from merchandise (`03`) |
| Tax on platform fees | Optional component on commission/processing fees |
| Withholding on payouts | Reduce payout amount; liability account |
| Seller tax identity | Merchant profile fields + verification status |
| Invoices / credit notes | Document generation interface (future) |
| Country reporting packs | Export jobs per regime |

Checkout tax configs today are **not** a compliance engine; they MUST NOT be treated as filing-ready.

---

## 3. KYC / KYB

| Stage | Effect on finance |
|-------|-------------------|
| Unverified | Block payout profiles & batches |
| Partial | Cap payout amounts / frequency (policy) |
| Verified | Standard rails per country capability |
| Rejected / expired | Freeze payouts; hold settlements `under_review` |

KYC provider adapters are out of band; architecture only requires status + reason codes.

---

## 4. Sanctions & screening

- Screening on merchant onboarding, payout profile changes, and periodic refresh  
- Positive hit → fail-closed holds  
- Decisions audited; details restricted  

---

## 5. Retention & holds

- Compliance holds distinct from dispute holds (`04`)  
- Retention of financial and identity artifacts: jurisdiction-dependent; design for configurable retention classes  

---

## 6. Professional validation gate

Before enabling payouts in a country, Ops/Legal/Tax MUST sign off a country checklist. Engineering MUST NOT invent rates, thresholds, or filing formats in code without that sign-off.

---

## 7. Open decisions

See `12`: **OD-SD20** (marketplace tax model), **OD-SD21** (withholding support phase), **OD-SD22** (KYC provider strategy).
