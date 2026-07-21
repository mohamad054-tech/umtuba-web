# 07 — UEOS Integration, Future Billing, Auction & AI Optimization

## 1. UEOS integration (money boundary)

UEOS is the **single financial authority** for UMTUBA. The Ads Platform is a
**consumer** of UEOS and never owns financial state.

### 1.1 Ownership split

| Concern | Owner |
| --- | --- |
| Accounts, balances, journals, ledger lines | **UEOS** |
| Currency truth, posting, idempotency, immutability | **UEOS** |
| Settlement, payouts, FX (future) | **UEOS** |
| Advertiser billing-account **reference** | Ads (reference only) |
| Budgets, spend intent, pacing, commercial events | Ads |
| Planning/display figures (minor-unit integers) | Ads (non-authoritative) |

Ads stores **references** (UEOS account ids, product/policy ids) and idempotency
keys. It never stores balances of record and never computes money truth.

### 1.2 Integration contract

All money movement is a UEOS journal via UEOS's single write gate
(`ueos_post_journal`; account creation via `ueos_ensure_account`). Ads calls
these RPCs through the **Billing Adapter**; it never writes ledger tables.

```
Ads commercial event (spend / credit / refund)
  → Billing Adapter builds a UEOS posting request
      (event_type, product_code=ads, policy_id, reference to ad/campaign,
       lines, idempotency key / request fingerprint)
  → ueos_post_journal (UEOS enforces balance, policy, idempotency, immutability)
  → Ads stores the returned journal reference on the commercial event
```

### 1.3 Idempotency & correctness

- Every posting carries an idempotency key / request fingerprint; retries replay
  the existing journal (never double-post), matching UEOS semantics.
- Corrections are **UEOS compensating journals**, never in-place edits.
- Ads reconciles delivery/measurement to UEOS postings by reference.

### 1.4 Policy linkage

- Ads uses a UEOS `product_code` for ads and **required** `policy_id`s for
  billable postings (UEOS mandates policy for non-system product codes).
- Ads policy (doc 06) and UEOS policy are distinct: Ads policy governs
  eligibility/content/targeting; UEOS policy governs how money posts.

## 2. Future billing (design intent)

Billing is **not implemented** in this phase (`ADS_BILLING_ENABLED = false`;
figures are planning-only). The target design:

### 2.1 Billing accounts & funding

- Each advertiser account maps to a UEOS billing account (reference).
- Funding models: **prepay/credit balance** and/or **postpay/invoice**, both
  represented as UEOS accounts and journals.
- Payment providers (PSPs) integrate **through UEOS settlement**, never through
  Ads directly. Ads never touches card/bank data.

### 2.2 Spend flow (minimal IVT gate before billing)

A **minimal invalid-traffic (IVT) gate ships with billing in Phase 4** — before
any event can become billable spend. It is intentionally small (trust-level +
dedupe + replay checks), not the full fraud engine (Phase 6).

```
delivery produces candidate billable events (impression/click/conversion per pricing model)
  → Minimal IVT gate: keep only trusted, deduped, replay-checked events
                       (trust level = trusted; see doc 06 §7.1)
  → Billable Event
  → Billing Adapter posts spend to UEOS (idempotent)      ← UEOS Billing
  → budget/pacing derived from UEOS balance + committed spend
  → overspend prevented structurally (reserve/commit before serve)

        … later, Future Fraud Engine (Phase 6) → Advanced Detection
            → retroactive invalidation + spend clawback via UEOS compensations
```

- Only `trusted` events pass the gate; `unverified` / `suspicious` / `rejected`
  events are never billed (they may still be counted as diagnostics).
- The gate cannot be bypassed: billing consumes only gate-approved events.

### 2.3 Pricing models (supported by design)

- CPM (per thousand impressions), CPC (per click), CPV (per view), CPA (per
  action/conversion). Each maps billable events → UEOS postings via policy.
- The campaign object model already carries budgets in minor units; pricing
  model is an ad-set-level attribute in the billing phase.

### 2.4 Invoicing & statements

- Statements and invoices are **projections over UEOS journals**, not an
  independent Ads ledger.
- Refunds/credits (e.g. invalidated traffic) are UEOS compensating journals.

## 3. Future auction & bidding (design intent)

Auctions are **not implemented** (`ADS_AUCTION_ENABLED = false`). The delivery
pipeline (doc 02 §4) is designed so ranking is the **last pluggable stage**:

### 3.1 Insertion point

```
... eligibility → targeting → capping → pacing → RANKING → select
                                                    ▲
                          default: priority order   │
                          auction:  quality × bid ──┘   (drop-in replacement)
```

The auction replaces only the ranking stage. Campaign/ad-set/placement contracts
and measurement are unchanged.

### 3.2 Auction design targets

- **Inputs:** bid (from ad-set bid strategy), predicted quality/relevance,
  policy eligibility, pacing state.
- **Mechanisms:** support second-price and unified-auction models; per-placement
  reserve prices and floors as policy.
- **Bid strategies:** manual bid, target-cost, and (later) automated bidding.
- **Fairness & safety:** auctions respect all policy/minor-safety/frequency
  constraints already applied earlier in the pipeline; they can only reorder
  already-eligible candidates.
- **Billing tie-in:** clearing price feeds the Billing Adapter → UEOS posting.

### 3.3 Sequencing

Auctions come **after** a stable delivery + measurement + billing foundation, so
that bids clear against real budgets, quality is measured, and spend posts
correctly through UEOS.

## 4. Future AI optimization (design intent)

AI optimization is **not implemented** (`ADS_AI_OPTIMIZATION_ENABLED = false`).
The architecture keeps decisioning pluggable so models can later drive:

- **Budget pacing:** smooth/accelerated spend prediction within budget.
- **Bid shaping:** automated bidding toward objective outcomes (auction phase).
- **Creative selection / rotation:** predicted-best creative per context.
- **Audience modeling:** lookalike/custom audience expansion (doc 04 §8).
- **Quality prediction:** relevance/quality scores feeding the auction.

Guardrails (permanent):

- Models **advise** deterministic, policy-bounded stages; they cannot bypass
  policy, minor-safety, privacy, or budget invariants.
- Every model-influenced decision is **auditable** and has human-overridable
  controls.
- Optimization uses coarse, consented, aggregate signals — never PII or private
  data.
- Each optimization capability is independently flag-gated and reversible.

## 5. Summary of the money & decision boundary

- **Ads decides** who/what/where/how-fast and records commercial intent and
  consumption.
- **UEOS decides** money truth: balances, postings, idempotency, immutability,
  settlement.
- **Auctions/AI** may reorder or tune *eligible* candidates and *predict* within
  budgets, but never override policy, safety, privacy, or UEOS financial
  authority.
