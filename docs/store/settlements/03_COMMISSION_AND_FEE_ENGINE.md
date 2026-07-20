# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 03 · Commission and Fee Engine

**Document type:** Architecture (design only)  
**Status:** Not implemented  
**Related:** `02_FINANCIAL_LEDGER_ARCHITECTURE.md`, `04_SETTLEMENT_LIFECYCLE.md`

---

## 1. Purpose

Compute **platform take-rate and fee components** for a financially recognized order in a deterministic, versioned, snapshotable way—so historical orders are never recomputed when commercial rules change.

---

## 2. Recommendation (commission model)

**Versioned rule engine with ordered evaluation + mandatory snapshot at recognition.**

Evaluation order (highest specificity wins; first matching tier within a priority band):

1. Negotiated seller (merchant) rate overlay  
2. Category + country rule  
3. Country default  
4. Global platform default  

Promotional **waivers** apply as time-bounded overlays that reduce commission but MUST still snapshot the waiver id/version.

Processing fees (payment rail) are modeled as a **separate fee component**, not folded invisibly into commission.

---

## 3. Fee components (conceptual)

| Component | Description | Paid by (typical) |
|-----------|-------------|-------------------|
| `platform_commission` | % and/or fixed fee on merchandise base | Seller (deducted from proceeds) |
| `payment_processing_fee` | Acquirer/PSP fee | Policy: seller or platform (OD) |
| `tax_on_platform_fees` | Tax on fees where required | Extension point (`08`) |
| `payout_rail_fee` | Cost to send payout | Policy (OD) |
| `fx_conversion_fee` | If settlement currency ≠ sale currency | See `07` |

**Base for commission (default recommendation)**

- Commission applies to **merchandise subtotal net of seller-funded discounts**  
- **MUST NOT** include platform-funded promo amounts as seller merchandise  
- Shipping and tax: **excluded** from merchandise commission base unless OD explicitly changes policy  

---

## 4. Rule shapes

### 4.1 Percentage commission

`commission_minor = floor(base_minor * rate_bps / 10_000)`  
Document rounding mode (floor vs half-up) as an OD; default **floor** for predictability.

### 4.2 Fixed fees

Fixed minor units per order or per item, same currency as sale currency at recognition.

### 4.3 Category / country / negotiated

Rules carry:

- `effective_from` / `effective_to`  
- `priority`  
- `merchant_id` nullable (negotiated)  
- `category_id` nullable  
- `country_code` nullable  
- `currency` nullable (if fee fixed in a currency)  
- `version` (monotonic)

### 4.4 Promotional waivers

- Time window, merchant/store/category scope  
- Cap (max waiver minor units)  
- Snapshot waiver version on the order financial snapshot

---

## 5. Versioning and immutability

| Object | Mutability |
|--------|------------|
| `commission_rule_versions` | Append-only versions; never edit past versions in place |
| Active pointer | Soft “current” for *new* recognitions only |
| `order_financial_snapshots` | Immutable after post |

**Rule:** Changing a rate mid-flight affects only orders recognized **after** the new version’s `effective_from`. Already snapshotted orders keep old math forever.

---

## 6. Order financial snapshot (required fields, conceptual)

At recognition, freeze at least:

- Sale currency  
- Merchandise base minor  
- Shipping minor (policy tag: pass-through / platform / seller)  
- Tax minor (policy tag)  
- Discount components (seller-funded vs platform-funded)  
- Commission rule version ids used  
- Commission minor  
- Processing fee minor  
- Tax-on-fees minor (if any)  
- **Net merchant proceeds minor**  
- Recognition event id (payment settlement id)  
- Idempotency key  

**MUST NOT** accept client-supplied snapshot totals.

---

## 7. Interaction with unpaid orders & reservations

| Condition | Commission engine |
|-----------|-------------------|
| Order payment not final | Engine MUST NOT run recognition |
| Inventory reservation active only | Engine MUST NOT run recognition |
| Payment final + policy gates passed | Engine runs once (idempotent) |

---

## 8. Security

- Rule CRUD: platform finance operator / admin only  
- Sellers MAY read **their** effective rate summary, not other merchants’ negotiated rates  
- Snapshots readable by merchant finance roles for own stores only  

---

## 9. Testing expectations (future implementation)

- Deterministic minor-unit math fixtures  
- Version freeze regression (old order unchanged after rate change)  
- Specificity ordering  
- Waiver caps  
- Rejection of client money fields  
- Idempotent re-recognition  

---

## 10. Open decisions

See `12`: **OD-SD04** (commission base), **OD-SD05** (who bears processing fees), **OD-SD06** (rounding mode), **OD-SD07** (shipping/tax in base).
