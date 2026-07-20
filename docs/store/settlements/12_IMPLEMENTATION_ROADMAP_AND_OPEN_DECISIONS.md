# UMTUBA Store — Merchant Settlement & Payout Architecture V1  
## 12 · Implementation Roadmap and Open Decisions

**Document type:** Planning (design only)  
**Status:** Not implemented — does not authorize code, SQL, or migrations by itself  
**Prerequisites (product sequencing, not auto-coupled):** Live payment capture + webhooks (outside this package); Commerce Safety reservation lifecycle already designed separately.

---

## 1. Phased milestones

### M1 — Ledger foundation

| Field | Content |
|-------|---------|
| **Objective** | Hybrid CoA + merchant currency accounts; post balanced transactions; idempotent posting API (internal) |
| **Dependencies** | Stable order + payment finality events (future payments work) |
| **Security** | Service-role posting only; no seller writes; audit events |
| **Tests** | Balance invariants; idempotency; currency isolation; compensating entries |
| **Ops readiness** | Rebuild balances from entries; freeze switch |
| **Rollout gates** | Shadow mode (post but hide from sellers) |
| **Rollback / forward-fix** | Stop poster; keep immutable rows; fix forward |

### M2 — Recognition + commission snapshots

| Field | Content |
|-------|---------|
| **Objective** | Order financial snapshots; versioned commission engine; recognize only on payment finality |
| **Dependencies** | M1; payment settled events; rule admin UI/API |
| **Security** | No client money; rule publish maker-checker |
| **Tests** | Snapshot freeze; specificity; unpaid/reservation non-recognition |
| **Ops readiness** | Rule change runbook |
| **Rollout gates** | Closed merchants only |
| **Rollback / forward-fix** | Disable recognition; compensate bad posts |

### M3 — Settlement periods & eligibility

| Field | Content |
|-------|---------|
| **Objective** | Periods, items, state machine (`04`); holds/reserves |
| **Dependencies** | M2 |
| **Security** | Merchant read isolation; operator holds audited |
| **Tests** | Illegal transitions; eligibility gates; multi-currency separation |
| **Ops readiness** | Period close checklist |
| **Rollout gates** | Statements visible read-only before payouts |
| **Rollback / forward-fix** | Freeze transitions to `scheduled` |

### M4 — Payout profiles & batching (rail #1)

| Field | Content |
|-------|---------|
| **Objective** | Profiles, batches, attempts, maker-checker; one rail adapter |
| **Dependencies** | M3; KYC gate; country capability matrix |
| **Security** | SoD; masked bank data; secret vault |
| **Tests** | Dedupe; retry; failed payout requeue; IDOR |
| **Ops readiness** | Payout ops runbook; kill switch |
| **Rollout gates** | Low limits; allowlisted merchants |
| **Rollback / forward-fix** | Disable approvals; reverse in-transit via compensating entries |

### M5 — Refunds / disputes financial integration

| Field | Content |
|-------|---------|
| **Objective** | Align refunds/chargebacks with snapshots & settlements (`06`) |
| **Dependencies** | M2–M4; payment refund webhooks |
| **Security** | Idempotent webhooks; hold automation |
| **Tests** | Full/partial refund; post-payout clawback paths |
| **Ops readiness** | Dispute desk + finance handoff |
| **Rollout gates** | Dispute hold auto-enabled |
| **Rollback / forward-fix** | Manual holds; forward compensate |

### M6 — Reconciliation automation

| Field | Content |
|-------|---------|
| **Objective** | Runs/issues across orders↔payments↔ledger↔payouts↔statements (`09`) |
| **Dependencies** | M1–M5; provider statement ingest |
| **Security** | Finance-only issue resolution; export audit |
| **Tests** | Missing/duplicate/mismatch fixtures |
| **Ops readiness** | Daily/weekly close |
| **Rollout gates** | Zero open critical issues before expand volume |
| **Rollback / forward-fix** | Re-run recon; no destructive drops |

### M7 — Multi-currency FX (optional expansion)

| Field | Content |
|-------|---------|
| **Objective** | Rate-sourced conversion; FX gain/loss (`07`) |
| **Dependencies** | M1; approved rate provider; Legal/Finance OD sign-off |
| **Security** | Fail closed without rate timestamp |
| **Tests** | Rounding; no invented rates |
| **Ops readiness** | FX exception queue |
| **Rollout gates** | Single corridor pilot |
| **Rollback / forward-fix** | Disable conversion path |

### M8 — Tax/compliance adapters

| Field | Content |
|-------|---------|
| **Objective** | KYC/KYB hard gates; withholding hooks; reporting exports (`08`) |
| **Dependencies** | Professional validation per country |
| **Security** | Restricted identity data; screening |
| **Tests** | Fail-closed payout without KYC |
| **Ops readiness** | Country enablement checklist |
| **Rollout gates** | Signed compliance pack |
| **Rollback / forward-fix** | Country kill switch |

---

## 2. What must already be true before M1 in production

- Live payment finality (not deferred-only stubs) for any real recognition  
- Commerce gate + inventory reservation behavior understood so unpaid/reserved paths cannot be mistaken for revenue  
- Clear ownership: Finance Ops + Platform Engineering + Compliance  

This settlements package **does not** implement those prerequisites.

---

## 3. Open Decisions Register

| ID | Question | Options | Recommendation | Blocking? | Domain | Target |
|----|----------|---------|----------------|-----------|--------|--------|
| **OD-SD01** | When is payment “final” for recognition? | Capture; provider settlement; T+N bank | Provider settlement or capture+low-risk policy | **Blocking** for M2 | Payments/Finance | M2 |
| **OD-SD02** | Payable primacy | Merchant-only; store-only; merchant with store dims | Merchant payable + store dimensions | Non-blocking | Ledger | M1 |
| **OD-SD03** | Debit/credit representation | Two columns; signed amounts | Explicit debit_minor + credit_minor | Non-blocking | Ledger | M1 |
| **OD-SD04** | Commission base | Gross merchandise; net of seller discounts; include shipping | Net of seller-funded discounts; exclude shipping/tax | **Blocking** for M2 | Commercial | M2 |
| **OD-SD05** | Who bears processing fees? | Seller; platform; split | Seller deduction unless promo says otherwise | Blocking for snapshots | Commercial | M2 |
| **OD-SD06** | Rounding mode | Floor; half-up; half-even | Floor for commission | Non-blocking | Eng | M2 |
| **OD-SD07** | Shipping/tax as seller revenue? | Never; pass-through; seller-owned shipping | Not merchandise revenue by default | Blocking for M2 | Commercial | M2 |
| **OD-SD08** | Delivery/return wait before eligible | 0; 7; 14; 30 days | Start conservative (e.g. 14) then tune | Blocking for M3 | Risk | M3 |
| **OD-SD09** | Rolling reserve % | 0; 5; 10; tiered | Tiered by risk/KYC | Blocking for M3 | Risk | M3 |
| **OD-SD10** | Settlement period cadence | Daily; weekly; biweekly | Weekly default | Non-blocking | Ops | M3 |
| **OD-SD11** | First payout rail | Bank; connected account; local provider | Bank or connected—pick one corridor | **Blocking** for M4 | Payments | M4 |
| **OD-SD12** | Connected accounts vs bank-first | Connect-first; bank-first; hybrid | Hybrid capability matrix | Non-blocking | Payments | M4 |
| **OD-SD13** | Auto-approve payout threshold | All manual; auto below X | Manual early; auto later under X | Blocking for SoD policy | Security/Finance | M4 |
| **OD-SD14** | Partial refund allocation | Proportional; line-item; SKU priority | Line-item when possible else proportional | Blocking for M5 | Finance | M5 |
| **OD-SD15** | Post-payout clawback | Negative balance; invoice merchant; net next payout | Net next payout + freeze if large | Blocking for M5 | Finance | M5 |
| **OD-SD16** | Chargeback fee bearer | Seller; platform; share | Seller by default | Non-blocking | Commercial | M5 |
| **OD-SD17** | Enable FX conversion? | Sale=settlement only; FX later | Sale=settlement first | Blocking for M7 | Finance | M7 |
| **OD-SD18** | FX rate provider | ECB; commercial; PSP | TBD with Finance | Blocking for M7 | Finance | M7 |
| **OD-SD19** | FX fee bearer | Seller; platform | Seller unless negotiated | Non-blocking | Commercial | M7 |
| **OD-SD20** | Marketplace tax model | Platform TOR; seller TOR; hybrid | Country-specific—needs counsel | **Blocking** per country | Tax/Legal | M8 |
| **OD-SD21** | Withholding phase | None; M8; later | Later unless legally required earlier | Non-blocking | Tax | M8 |
| **OD-SD22** | KYC provider strategy | In-house; vendor A/B | Vendor + status abstraction | Blocking for M4 payouts | Compliance | M4/M8 |
| **OD-SD23** | Recon cadence | Intraday; daily; weekly | Daily automated + weekly close | Non-blocking | Ops | M6 |
| **OD-SD24** | Auto-hold on mismatch | Always; severity-based; manual | Severity-based auto-hold | Non-blocking | Risk | M6 |
| **OD-SD25** | Merchant statement format | PDF; CSV; both | Both | Non-blocking | Product | M3 |
| **OD-SD26** | Merchant finance viewer role | Separate role; owner-only | Separate finance viewer | Non-blocking | Product/Security | M3 |
| **OD-SD27** | Erasure vs ledger retention | Pseudonymize PII; legal hold matrix | Pseudonymize; keep amounts | Blocking for privacy program | Legal/Privacy | M8 |
| **OD-SD28** | Multi-store payout split | Always consolidate; optional split | Consolidate at merchant | Non-blocking | Product | M4 |
| **OD-SD29** | Platform-funded promo funding account | Marketing expense; contra-revenue | Marketing expense | Non-blocking | Finance | M2 |
| **OD-SD30** | Recognition without delivery | Allow; forbid | Forbid by default (use OD-SD08) | Blocking for M3 | Risk | M3 |

**Open decisions count: 30**

---

## 4. Terminology consistency cheat-sheet

| Term | Use |
|------|-----|
| Merchant | KYB legal entity |
| Store | Selling unit under merchant |
| Recognition | Ledger + snapshot when payment final |
| Settlement | Eligibility & periodization of proceeds |
| Payout | External transfer |
| Reservation | Inventory only (Commerce Safety) |

---

## 5. Explicit non-goals for early milestones

- No Ads billing coupling  
- No carrier COD settlement in M1–M4 unless OD expands  
- No rewriting Commerce Safety / checkout / hardening docs as “done finance”  
