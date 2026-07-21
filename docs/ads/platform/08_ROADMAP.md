# 08 — Production Roadmap & Future Implementation Phases

This roadmap sequences the platform from the already-shipped foundation to a
full ecosystem advertising platform. Every phase is **flag-gated**, additive,
and reviewed before implementation. No phase applies migrations remotely without
explicit approval, and money always flows through UEOS.

## Phase 0 — Foundation (already shipped)

Status: **in repository** (`20260807_ads_platform_foundation_v1.sql`,
`20260806_ads_admin_review_foundation_v1.sql`, `lib/ads/**`, `app/advertise/**`,
`app/admin/ads/**`).

- Advertiser accounts + roles, campaigns, ad sets, creatives, ads.
- Review workflow + audit, private creative storage (signed URLs).
- Targeting spec + policy contracts, metrics scaffolding.
- Delivery **disabled**, no payments, no auctions, no fake data.

This package treats Phase 0 as Layer 0 of the platform.

## Phase 1 — Platform hardening & contracts

- Formalize the **placement contract** and **event-report contract** as stable,
  versioned interfaces (design in docs 02–03).
- Solidify database authority: constraints, RLS/FORCE RLS, write-gate RPCs,
  idempotency/dedupe keys for management and (future) events.
- Complete policy-as-data model (versioned eligibility/creative/targeting/
  placement policies) and audit coverage.
- Operator moderation tooling completeness (queue, decisions, appeals, audit).

Exit criteria: contracts frozen; invariants DB-enforced; full audit; still no
serving.

## Phase 2 — Measurement foundation

- Server-side signed **event ingestion**, dedupe keys, append-only raw events.
- Async **aggregation** into daily/rollup metrics; zero-not-fake reporting.
- Attribution windows defined per objective (single-touch).
- Advertiser + operator reporting over real (initially internal/test) events.

Exit criteria: trustworthy counts end-to-end with no delivery yet (events from
controlled test surfaces).

## Phase 3 — Delivery pilot (one placement)

- Enable `ADS_DELIVERY_ENABLED` + **one** placement flag (e.g. `search_results`
  or `store_catalog`) in a controlled rollout.
- Decision pipeline: eligibility → targeting → capping → pacing → default
  priority ranking → creative select.
- Planning-only economics (no billing yet); measurement validates the loop.
- Product integration proves the contract (product renders descriptor + reports
  events; never reads ad tables).

Exit criteria: safe, labeled, policy-compliant serving into one surface with
accurate measurement.

## Phase 4 — Billing foundation (UEOS-backed) + minimal IVT gate

- **Minimal IVT (invalid-traffic) gate ships *with* billing, before any billable
  spend.** Only trusted, signed, deduped, replay-checked events (trust level
  `trusted`; see doc 06 §7.1) are eligible to become billable. This is a
  deliberately small gate — not the full fraud engine — sufficient to protect
  spend.
- Enable `ADS_BILLING_ENABLED`. Billing Adapter posts spend to UEOS
  (idempotent), pricing models (CPM/CPC/CPV/CPA) via policy.
- Budgets/pacing derived from UEOS balances + committed spend; structural
  overspend prevention.
- Statements/invoices as projections over UEOS journals; refunds/credits as UEOS
  compensations.
- PSP funding **through UEOS settlement** (not through Ads).

Sequencing (mandatory ordering within billable flow):

```
Minimal IVT gate  →  Billable Event  →  UEOS Billing posting
        (Phase 4, ships with billing)
                            │
                            ▼
        Future Fraud Engine (Phase 6)  →  Advanced Detection
        (retroactive invalidation + clawback via UEOS compensations)
```

- The **full fraud engine remains Phase 6.** Phase 4's minimal gate blocks
  obviously invalid traffic up front; Phase 6 adds advanced detection and can
  retroactively invalidate already-billed events via UEOS compensating journals.

Exit criteria: real spend posts correctly and reconciles to UEOS; only trusted
events are billed through the minimal IVT gate; no independent Ads ledger.

## Phase 5 — Multi-placement rollout

- Progressively enable placements across products: Watch, Discover, World
  (coarse-geo, policy-gated), Live, Store (sponsored products), Creator
  (sponsored creators), UM Learning, Games (minor-safe), and later Messages
  (strict policy).
- Per-placement policy, labeling, and product-specific integrity rules (e.g.
  Watch playback/exact-context integrity, World privacy-safe geo).
- Frequency capping and pacing tuned per surface.

Exit criteria: platform serves multiple surfaces under one campaign model with
per-surface policy.

## Phase 6 — Fraud / traffic-quality engine (advanced detection)

- Build on Phase 4's **minimal IVT gate** with advanced detection across the
  full threat taxonomy (doc 06 §7.0): bot traffic, click/conversion fraud,
  self-clicking, account farms, creator/merchant collusion, coordinated abuse.
- Consume the readiness hooks (signed events, dedupe, replay protection,
  handles, trust levels, anomaly signals).
- Advanced invalid-traffic filtering and **retroactive** invalidation;
  quarantine/suspend flows; spend clawback via UEOS compensations.
- Operator dashboards for traffic-quality and anomaly review.

Exit criteria: billable counts are invalid-traffic-filtered (minimal gate from
Phase 4) and further hardened by advanced detection; invalidations reconcile via
UEOS.

## Phase 7 — Auctions & bidding

- Enable `ADS_AUCTION_ENABLED`: replace default ranking with quality × bid
  auction (second-price / unified), reserve prices/floors as policy.
- Bid strategies (manual, target-cost) with clearing price feeding UEOS billing.
- Auctions only reorder already-eligible, policy-safe candidates.

Exit criteria: auctions clear against real budgets and post correct spend.

## Phase 8 — AI optimization

- Enable `ADS_AI_OPTIMIZATION_ENABLED` incrementally: pacing prediction, bid
  shaping, creative selection, quality prediction, lookalike/custom audiences.
- Models advise policy-bounded stages; human-auditable, reversible, coarse/
  consented signals only.

Exit criteria: measurable performance lift with all safety/privacy/financial
invariants intact and auditable.

## Cross-cutting, every phase

- **Feature flags default off**; nothing serves or bills until explicitly
  enabled.
- **Privacy-first**: coarse, consented, non-PII signals; minor-safety
  structural; no individual/sensitive targeting.
- **Database authority**: invariants enforced in DB, not only app code.
- **UEOS is money**: Ads holds references and posts via UEOS RPCs only.
- **No remote migration apply** without explicit approval; local-first.
- **Auditability**: every policy/moderation/billing action logged and
  reversible.

## Dependencies & sequencing rationale

- Measurement precedes delivery so counts are trustworthy before anything
  serves.
- Delivery precedes billing so spend posts against a proven serving loop.
- A **minimal IVT gate ships with billing (Phase 4)** so no spend is billed on
  untrusted traffic, even before the full fraud engine exists.
- The **full fraud engine (Phase 6)** precedes auctions so bids clear on clean
  traffic and advanced invalidation is in place.
- Auctions precede AI optimization so models optimize a well-defined,
  economically correct system.
