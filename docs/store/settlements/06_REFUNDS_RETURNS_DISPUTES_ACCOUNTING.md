# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 06 · Refunds, Returns, Disputes Accounting

**Document type:** Architecture (design only)  
**Status:** Not implemented  
**Related:** `02`, `04`, `09`

---

## 1. Dual-state principle

Every case has **operational** state (what happened to the order/return/dispute ticket) and **financial** state (what the ledger/settlement did). They MUST be linked but MUST NOT be collapsed into one enum.

| Domain | Examples |
|--------|----------|
| Operational | return requested, item received, dispute opened, chargeback won/lost |
| Financial | refund pending/succeeded, clawback posted, reserve increased, settlement cancelled |

---

## 2. Scenario matrix (financial effects)

| Scenario | Financial intent |
|----------|------------------|
| **Full refund** (payment success) | Reverse recognition; cancel unpaid settlement items; if already paid out → clawback / negative eligibility |
| **Partial refund** | Proportional or line-based reverse of snapshot components (policy) |
| **Return without refund** | Usually no buyer money movement; MAY still affect seller score/ops only |
| **Cancellation before payment final** | No recognition ever; no settlement item |
| **Cancellation after payment final** | Treated like refund path financially |
| **Chargeback** | Aggressive hold + reverse; fees MAY be seller-borne (OD) |
| **Dispute (pre-chargeback)** | Hold settlement eligibility for linked amounts |
| **Shipping refund** | Reverse shipping component per snapshot tags |
| **Tax refund** | Extension via tax component tags (`08`) |
| **Seller-funded discount** | Already reduced merchandise base at sale; refund math uses snapshot |
| **Platform-funded promotion** | Refund MUST NOT treat promo as seller merchandise revenue; platform expense unwind as designed |

---

## 3. Adjustments

`adjustments` are controlled finance events:

- Reason code, amount minor, currency, merchant/store, optional order link  
- Maker-checker above threshold  
- Always post compensating ledger transactions  
- Never silently edit snapshots  

---

## 4. Reserves vs disputes

| Tool | Use |
|------|-----|
| Rolling reserve | Systemic risk buffer |
| Dispute hold | Case-linked freeze |
| Chargeback reserve spike | Temporary increase while open |

---

## 5. Inventory reservation interaction

Commerce Safety reservations are **inventory**, not money:

- Expiry/release of reservation **MUST NOT** by itself create refunds or settlements  
- Consumption of reservation at payment finality (future) is a **inventory** event that may *coincide* with recognition but is not a ledger substitute  
- Refunds MAY trigger inventory restock policies operationally; finance follows payment refund truth  

---

## 6. Idempotency & provider events

Refund and chargeback webhooks MUST be idempotent. Duplicate events produce the same financial outcome once.

---

## 7. Open decisions

See `12`: **OD-SD14** (partial refund allocation), **OD-SD15** (post-payout clawback), **OD-SD16** (chargeback fee bearer).
