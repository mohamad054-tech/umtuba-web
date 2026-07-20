# UMTUBA Ads — Budget System

**Document type:** Spend control and pacing blueprint  
**Scope:** Daily/lifetime budgets, dates, limits, auto-stop, future pacing  
**Principle:** Advertisers never lose control of maximum spend; platform never silently overspend without defined tolerance

---

## 1. Budget Principles

1. **Hard ceilings exist** — Lifetime and optional account spending limits cannot be exceeded beyond documented race tolerance.  
2. **Separate planning from settlement** — Soft serve checks vs hard billing settlement.  
3. **Timezone explicit** — Daily budgets reset in advertiser-selected timezone.  
4. **Auto-stop is mandatory** — Exhausted budget, end date, review rejection, fraud hold, payment failure.  
5. **Idempotent charges** — Billable events carry unique keys; double charge is a P0 defect.  
6. **Pacing is optional intelligence** — V1 design supports even spend hooks; algorithms evolve behind the Budget Service.  
7. **Money in minor units** — Integer currency amounts; never floats.  
8. **Audit everything** — Budget changes, tops-ups, freezes, and stops are append-only.

---

## 2. Hierarchy of Spend Controls

```text
Advertiser Account
  ├─ Account spending limit (optional monthly / lifetime)
  ├─ Payment method / prepaid balance
  └─ Campaign
        ├─ Campaign daily budget?
        ├─ Campaign lifetime budget?
        ├─ Campaign start / end
        └─ Ad Group
              ├─ Ad group daily budget?
              ├─ Ad group bid / bid strategy
              └─ Ad
                    └─ (usually inherits; optional ad-level schedule)
```

**Inheritance rules (design default):**

- Most restrictive applicable cap wins.  
- If both campaign and ad group daily budgets set, Delivery respects both.  
- Account limit is the ultimate backstop.

---

## 3. Daily Budget

| Property | Definition |
|----------|------------|
| **Amount** | Max billable spend per calendar day in advertiser timezone |
| **Reset** | At timezone midnight (± settle lag) |
| **Overshoot tolerance** | Small % or fixed minor units under concurrent serve races—documented SLA |
| **Behavior at exhaustion** | Ad group/campaign ineligible until next reset or budget increase |

### Daily budget modes

| Mode | Intent |
|------|--------|
| **Standard** | Aim to spend up to daily cap with basic even pacing |
| **Accelerated** *(optional)* | Spend as fast as eligible inventory allows until cap |
| **Off** | No daily cap; lifetime/account caps still apply |

---

## 4. Lifetime Budget

| Property | Definition |
|----------|------------|
| **Amount** | Max total billable spend for campaign (or ad group) lifetime |
| **Consumption** | Sum of settled billable events |
| **At exhaustion** | Permanent auto-stop until budget raised |
| **With daily** | Both enforced |

Lifetime budget is required for many SMB “set and forget” campaigns; optional for always-on brand campaigns with daily only.

---

## 5. Campaign Dates

| Field | Behavior |
|-------|----------|
| **start_at** | Becomes eligible at timestamp (timezone-aware) |
| **end_at** | Auto-stop after timestamp; in-flight serves may complete briefly |
| **draft / scheduled / active / ended / paused** | Lifecycle states in Campaign Service |
| **Pause** | Immediate eligibility removal; budget not released backward |

Scheduled campaigns can pass review before start; Delivery ignores until `start_at`.

---

## 6. Spending Limits

### Account-level

- Monthly spend cap  
- Lifetime advertiser cap  
- Per-payment-method velocity caps (fraud)  
- New advertiser graduated limits  

### Campaign-level

- Lifetime + daily as above  
- Optional max CPC/CPM/CPA ceilings (bid caps)  

### Billing balance models

| Model | Description |
|-------|-------------|
| **Prepaid** | Advertiser loads balance; spend draws down |
| **Postpaid / invoice** | Credit limit + invoicing (verified advertisers) |
| **Hybrid** | Prepaid for SMB; invoice for enterprise |

Payment adapters reuse platform payment principles (provider-agnostic); Ads owns the **advertiser ledger**.

---

## 7. Automatic Stop Conditions

| Trigger | Effect | Resume |
|---------|--------|--------|
| Daily budget exhausted | Pause delivery until reset | Automatic next day |
| Lifetime exhausted | Stop campaign/ad group | Manual budget increase |
| End date reached | End | Clone / extend dates |
| Payment failure / insufficient funds | Stop | After successful top-up |
| Review reject / policy strike | Stop + optional account hold | Appeal / fix |
| Fraud hold | Immediate freeze | Admin release |
| Advertiser pause | Stop | Manual resume |
| Destination invalid (ended Live, delisted SKU) | Pause ad | Fix destination |
| Account spending limit hit | Stop all | Raise limit / next period |

Auto-stop emits events to Notification Bridge (email/push to advertiser roles).

---

## 8. Billing Events & Pricing Models (Budget Consumers)

Budgets consume **settled billable events**, not raw beacons.

| Pricing model | Billable unit (foundation) |
|---------------|----------------------------|
| **CPM** | 1000 billable impressions |
| **CPC** | Valid click |
| **CPV / view** | Qualified video view |
| **CPA** *(foundation)* | Qualified conversion (Store purchase, install, etc.) |
| **Flat / sponsorship** *(future)* | Reserved inventory deal |

Invalid traffic (IVT) determined by Fraud Service is non-billable or credited.

---

## 9. Holds, Reservations, and Settlement

```text
Serve time:     soft budget check (remaining > 0)
Beacon time:    candidate billable event
Fraud window:   provisional hold optional
Settle time:    charge ledger + decrement budget
Credit time:    IVT / dispute → credit + budget restore (policy)
```

**Idempotency key:** `(event_id)` or `(impression_id, event_type)`.

---

## 10. Future Pacing Algorithms

### Goals

- Spend smoothly across the day (even pacing).  
- Catch up after underspend when inventory returns.  
- Respect dayparting and conversion-heavy hours without reckless end-of-day dumps.  
- Multi-campaign portfolio pacing under account limits (later).

### Design hooks

| Component | Role |
|-----------|------|
| **PacingController** | Computes eligible bid throttle / probability of participation |
| **SpendForecast** | Short-horizon predicted spend |
| **Control signal** | Pass-through probability or multiplier to Ranker |
| **Fallback** | If controller fails → conservative even pacing or accelerated hard-cap only |

### Algorithm families (non-binding)

- PID-style spend controllers  
- Throttled probabilistic participation  
- ML bid modifiers under hard caps  

V1 implementation may ship **even pacing v0**; architecture keeps PacingController replaceable.

---

## 11. Budget Change Controls

| Change | Rules |
|--------|-------|
| Increase daily/lifetime | Immediate effect after authZ |
| Decrease below spent | Set remaining to 0; stop; cannot set lifetime < spent |
| Timezone change | Restricted once active; or delayed to next day |
| Currency | Account currency immutable after first funding (design default) |

Sensitive changes may require step-up auth for high-spend accounts.

---

## 12. Advertiser UX Requirements

- Live remaining daily / lifetime meters  
- Clear “why stopped” reasons  
- Forecast: “At current pace, budget lasts ~X hours” (best-effort)  
- Alerts at 50% / 80% / 100% spend  
- Immutable spend ledger export  

---

## 13. Platform Ops Controls

- Force freeze campaign / account budgets  
- Manual credit issuance with dual control  
- Adjust overshoot tolerance per region  
- Emergency global pause (incident)  

All ops actions → audit log (`08_SECURITY.md`).

---

## 14. Failure Modes

| Failure | Degraded behavior |
|---------|-------------------|
| Budget Service timeout on serve | Fail closed (no ad) for paid slots |
| Billing lag | Soft remaining may be stale; settle reconciles |
| Clock skew | Prefer server time; advertiser TZ for daily boundaries |
| Partial outage | Pause new spends; finish settlements from durable queue |

---

## Related Documents

- `02_SYSTEM_ARCHITECTURE.md` — Budget & Billing services  
- `07_REPORTING.md` — spend and efficiency metrics  
- `08_SECURITY.md` — budget protection  
- `09_DATABASE_BLUEPRINT.md` — budgets & billing entities  
