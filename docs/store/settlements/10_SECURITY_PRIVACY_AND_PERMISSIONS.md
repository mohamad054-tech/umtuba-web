# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 10 · Security, Privacy, and Permissions

**Document type:** Architecture (design only)  
**Status:** Not implemented  
**Related:** `05_PAYOUT_ARCHITECTURE.md`, `11_DATABASE_CONCEPTUAL_BLUEPRINT.md`

---

## 1. Roles

| Role | Scope | Typical powers |
|------|-------|----------------|
| **Seller owner** | Own merchant/stores | Payout profile manage (with verification), view statements, request payout |
| **Seller manager** | Assigned stores | View store-attributed earnings; **no** payout profile change / approve |
| **Finance viewer** (merchant) | Own merchant | Read-only statements & payout history |
| **Platform finance operator** | Platform | Reconciliation, holds, adjustments (maker), batch prepare |
| **Platform admin** | Platform | Break-glass; still audited; SHOULD NOT routine-approve payouts alone |
| **Support** | Limited | Read masked fields; no approve; no raw bank data |
| **Auditor** | Read-only finance | Export under control; no mutate |
| **Service role** | System | Posting jobs, provider webhooks, expiry/cron — least privilege keys |

---

## 2. Hard requirements

1. **Least privilege** — default deny cross-merchant and cross-store finance.  
2. **Segregation of duties** — payout batch **maker ≠ checker**.  
3. **No cross-store financial access** for seller manager of store A into store B of another merchant; within merchant, store scoping is configurable but payout profiles remain merchant-level owner-controlled.  
4. **Mask bank data** — display last-4 / token only.  
5. **Secret isolation** — provider credentials never in browser, mobile, or seller JWT.  
6. **Export controls** — every export logged.  
7. **Operator audit logs** — all privileged mutations.  
8. **No buyer PII leakage** into merchant finance UIs (use opaque order refs / fulfillment contact policy already used by Store order management).  
9. **No client-authored financial totals** — server derives all money.  

---

## 3. Maker-checker matrix (minimum)

| Action | Maker | Checker |
|--------|-------|---------|
| Publish commission rule version | Finance operator | Second finance operator or admin |
| Approve payout batch above threshold | Finance operator | Different finance operator |
| Manual adjustment above threshold | Finance operator | Checker |
| Release compliance hold | Compliance-capable role | Second approver (OD) |

Threshold amounts are config (**OD-SD13**).

---

## 4. Data classification

| Class | Examples | Controls |
|-------|----------|----------|
| Secret | PSP keys, webhook secrets | Vault; rotate |
| Restricted financial | Full IBAN, tax ids | Encrypt at rest; mask in UI |
| Confidential | Settlements, ledgers | RLS + role checks |
| Internal | Reason codes | Need-to-know |

---

## 5. Privacy

- Buyer addresses/emails MUST NOT appear on settlement statements by default.  
- Support tools use existing order privacy projections where possible.  
- Right-to-erasure interactions with immutable ledgers: prefer pseudonymization of PII fields while retaining amounts (legal OD).  

---

## 6. Threat themes

| Threat | Mitigation |
|--------|------------|
| Seller inflates payout | Server-side eligibility only; no client amounts |
| Insider fraudulent payout | Maker-checker + audit |
| IDOR across merchants | Strict ownership checks on every read/write |
| Webhook forgery | Signature verify + idempotency (future payment work) |
| Replay | Idempotency keys on postings and payouts |

---

## 7. Open decisions

See `12`: **OD-SD13**, **OD-SD26** (merchant finance viewer role packaging), **OD-SD27** (erasure vs ledger retention).
