# 02 — Architecture Overview, Core Services & Delivery Model

## 1. Architectural style

The Ads Platform is a **domain-centric, database-authoritative** platform with
a thin service layer and product-facing contracts. It follows the same shape as
the existing UMTUBA foundations (UEOS, Store, World):

```
Product surface (Watch / Store / Search / ...)
  → Placement Contract (request slot, render descriptor, report event)
    → Ads Service Layer (server actions / RPC clients in lib/ads/*)
      → Database Authority (Supabase: RLS + constraints + SECURITY DEFINER RPCs)
        → UEOS (money, via RPC)  +  Object storage (creatives, signed URLs)
```

Key properties:

- **Authoritative invariants live in the database.** Status transitions,
  budget rules, targeting validity, spend locks, and event dedupe are enforced
  by constraints, triggers, and `SECURITY DEFINER` functions with pinned
  `search_path`, mirroring UEOS/Store patterns. Application code is a client of
  those guarantees, never the sole guardian.
- **The service layer is stateless.** It orchestrates, validates early for UX,
  and calls RPCs. It holds no money and no long-lived ad-decision state beyond
  caches that can be rebuilt.
- **Products integrate only through contracts.** No product imports ad tables
  or ad domain internals.

## 2. Core services

Each service is a bounded responsibility with its own tables/contracts. They can
start as modules within one deployment and split later without contract changes.

### 2.1 Advertiser & Identity Service

- Advertiser accounts, organization membership, and roles
  (owner / admin / campaign_manager / analyst / viewer).
- Account review state (draft → pending_review → approved / rejected /
  suspended).
- Maps an advertiser account to its UEOS billing account **reference** (no
  balances stored here).
- Consumes platform Auth for user identity; never re-implements auth.
- **Advertiser roles are distinct from Platform Admin.** Operator review actions
  are not an advertiser role and are never reachable from advertiser tooling
  (see §5 and doc 06 §1).

### 2.2 Campaign Service

- Owns the campaign object model: campaigns → ad sets → creatives → ads
  (see doc 03).
- Enforces objective/budget/schedule/status invariants.
- Produces the *eligible deliverable set* (approved ads with valid budget,
  schedule, and targeting) that Delivery consumes.

### 2.3 Targeting & Audience Service

- Validates and stores targeting specifications (see doc 04).
- Owns the taxonomy of allowed dimensions, interest/category allowlists, and
  minor-safety constraints.
- Provides audience-size **estimation contracts** (computed later; a contract in
  V1). Future home of custom and lookalike audiences.

### 2.4 Creative Service

- Creative asset intake, validation, private storage, and signed-URL delivery.
- Format-specific creative descriptors (video, image, carousel, story, etc.).
- Immutability of approved creatives; new revisions instead of edits.

### 2.5 Delivery Decisioning Service

- Given a placement request from a product, returns zero or more render
  descriptors: eligible ad(s), creative variant, and tracking handles.
- Applies eligibility filters, frequency capping, pacing, and (future) ranking /
  auction. Delivery is **flag-gated and off by default**.

### 2.6 Measurement Service

- Ingests impression/click/view/engagement/conversion events through
  server-side, signed, deduplicated pathways (see doc 05).
- Owns raw event tables and aggregation into daily/rollup metrics.

### 2.7 Reporting Service

- Read-only projections over measurement + campaign data for advertiser and
  operator dashboards. Never invents numbers; returns zeros when empty.

### 2.8 Moderation & Policy Service

- Versioned policy for eligibility, creative content, targeting limits, and
  placement rules.
- Review workflow and audit trail; human review now, assisted review later
  (see doc 06).

### 2.9 Billing Adapter (UEOS-backed)

- Translates commercial events (budget commitments, spend, credits, refunds)
  into UEOS journal postings via UEOS RPCs.
- Holds only references and idempotency keys; never balances of record
  (see doc 07).

### 2.10 Fraud / Traffic-Quality Readiness

- Not an engine in this phase — a set of hooks and data shapes (signed events,
  dedupe keys, rate limits, anomaly signals) that a future engine consumes
  (see doc 06).

## 3. Service interaction (request-time and management-time)

### Management-time (advertiser configures)

```
Advertiser UI → Advertiser/Campaign/Targeting/Creative services
             → DB RPCs (validate, persist, transition status)
             → Moderation queue (on submit)
```

### Request-time (product renders a slot) — future, flag-gated

```
Product slot → Placement Contract.request(context)
            → Delivery Decisioning (eligibility + capping + pacing + ranking)
            → returns render descriptor(s) (creative + tracking handles)
Product renders → user views/interacts
            → Placement Contract.report(event) → Measurement (signed, deduped)
            → Billing Adapter → UEOS posting (spend) [when billing enabled]
```

## 4. Delivery model (design, not implementation)

Delivery is the request-time path that turns intent into a served ad. It is
designed but **disabled** in the foundation.

### 4.1 Placement contract

A product exposes a slot by calling a placement contract with a **context**:

- placement id (e.g. `watch_feed`, `search_results`, `store_catalog`,
  `world_nearby`, `live_lobby`, `discover_feed`)
- coarse, privacy-safe context (locale, country/region, device class, surface,
  approximate coarse geo where policy allows, content category)
- non-identifying session/frequency handle

The contract returns render descriptor(s) or empty. Products must render exactly
what the descriptor specifies and must display required ad labeling.

### 4.2 Decision pipeline

The canonical delivery pipeline stage names, used identically across docs 02,
07, and 08, are:

```
eligibility → targeting → capping → pacing → ranking → selection
```

```
candidates = eligible deliverables for (placement, coarse context)
  → eligibility  (policy: creative/placement/minor-safety eligibility)
  → targeting    (coarse targeting predicates match)
  → capping      (frequency cap per session/handle/time window)
  → pacing       (budget headroom + pacing allows serving now)
  → ranking      (foundation: simple priority order;
                  future: quality × bid auction — see doc 07)
  → selection    (creative selection / rotation → render descriptor)
  → render descriptor(s) + tracking handles
```

Each stage is a pure, testable function over candidates and context. **Ranking**
is deliberately the **last pluggable stage before selection** so an auction or
AI ranker can replace the default priority ordering without touching earlier
stages or contracts (see doc 07).

### 4.3 Pacing and capping

- **Budget pacing:** spend is checked against remaining budget derived from UEOS
  references; pacing smooths delivery across the schedule. Overspend is
  prevented structurally (reserve/commit against budget before serve).
- **Frequency capping:** enforced on a non-identifying handle within bounded
  time windows; never requires storing a durable user profile.

### 4.4 Failure and degradation

- Any decision failure returns **empty** (no ad) — never an error surfaced to
  the end user and never a blocking state in the product.
- Products treat "no ad" as the normal default and render their own content.

## 5. Database authority

- **RLS + FORCE RLS** on all advertiser-scoped and sensitive tables. Members
  see only their accounts' data; anon has no privileged access.
- **Write gates:** privileged transitions (approve/reject/suspend, spend
  posting, metric aggregation) run through `SECURITY DEFINER` RPCs, never
  advertiser-writable — mirroring UEOS's single-write-gate discipline. Operator
  review RPCs are gated by `require_platform_admin()`; `service_role` is reserved
  for trusted server-side tooling/operational jobs and is **not** used by the
  Next.js app (see doc 06 §1).
- **Constraints over trust:** budgets in integer minor units, `end > start`,
  spend columns locked against client writes, targeting shape validated,
  event dedupe via unique keys.
- **Idempotency:** management mutations and event ingestion use idempotency /
  dedupe keys so retries and races are safe (same pattern as UEOS
  `request_fingerprint`).

## 6. Feature flags (capability gating)

Every capability is independently gated and defaults **off**:

| Flag (illustrative) | Gates |
| --- | --- |
| `ADS_DELIVERY_ENABLED` | Any request-time serving at all |
| `ADS_PLACEMENT_<surface>_ENABLED` | Serving into a specific product surface |
| `ADS_BILLING_ENABLED` | Real UEOS spend postings vs planning-only |
| `ADS_AUCTION_ENABLED` | Auction ranking stage vs default priority |
| `ADS_AI_OPTIMIZATION_ENABLED` | Model-driven pacing/ranking/creative select |
| `ADS_AUDIENCE_ESTIMATION_ENABLED` | Live audience-size computation |

Flags are checked at the platform boundary. A disabled capability behaves as if
absent (empty results, planning-only figures), never as a partial/unsafe state.

## 7. Multi-region & scale considerations (design intent)

- Event ingestion is designed for high volume: append-only raw events, async
  aggregation, dedupe keys, and rollups rather than per-request writes to shared
  hot rows.
- Targeting predicates are coarse and index-friendly; high-cardinality signals
  (interests/categories) use allowlists and set membership, not free text.
- Currency and value are always via UEOS; the platform stores currency codes and
  minor-unit integers only for planning/display, never as authoritative money.

## 8. Latency, availability & observability targets (design intent)

These are architectural targets to design against, not implemented SLAs. Actual
SLOs are set when delivery is enabled (Phase 3+).

### 8.1 Latency targets

| Path | Target (design) |
| --- | --- |
| Delivery decision (`request`) | p99 within a small single-digit budget (e.g. ≤ ~50 ms server-side) so ad slots never slow the product |
| Event report (`report`) | Fire-and-forget from the product; ingestion ack is async and off the render path |
| Reporting reads | Served from aggregates/rollups, not raw scans |

- Delivery must degrade to **empty** (no ad) rather than exceed its latency
  budget; a slow decision is treated as "no ad" (see §4.4).

### 8.2 Availability & degradation

- Ads is **non-blocking** for every product: if the platform is degraded or
  unavailable, products render their own content and simply show no ad.
- No delivery or reporting failure may block a product's core UX, playback, or
  checkout.

### 8.3 Observability (design intent)

- Structured metrics per stage (candidates, filtered, served, empty), per
  placement and coarse-geo — no PII.
- Trace/correlation ids on management mutations, delivery decisions, and event
  ingestion for end-to-end debugging and audit correlation.
- Operator dashboards for delivery health, decision latency, empty-rate, review
  throughput, and anomaly summaries (see docs 05–06).
- Full operational observability (dashboards, alerting, tracing backends) is
  detailed in doc 09.
