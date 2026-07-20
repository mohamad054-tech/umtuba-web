# UMTUBA Ads — System Architecture

**Document type:** System architecture blueprint  
**Style:** Service-oriented + event-driven; ecosystem-integrated  
**Scale:** Tens of millions of users; multi-region ready; multi-product inventory

---

## 1. Architectural Principles

1. **Social core is upstream** — Identity, graph, content, Live sessions, notifications owned by UMTUBA platform services; Ads consumes contracts.
2. **Ads is a demand + delivery domain** — Campaign management, targeting, auction eligibility, budgeting, billing events, and measurement live here.
3. **Inventory is declared by products** — Discover, Watch, Store, Learning, Games expose placement slots; Ads does not scrape UIs.
4. **Money paths are strongly governed** — Advertiser funds, holds, charges, refunds: idempotent, audited, fail-closed.
5. **Delivery is latency-sensitive; reporting is eventual** — Serve path is hot; analytics warehouse is cold/warm.
6. **Trust services are first-class** — Review, fraud, and policy sit beside auction—not bolted after launch.
7. **No hardcoding of payment or ML vendors** — Adapters for billing rails and ranking models.
8. **Failure isolation** — Ads outage must degrade to organic-only surfaces; Ads must not take down Watch or checkout.
9. **Region and policy aware** — Feature flags for targeting legality, campaign classes, and data residency.
10. **Same boundaries as modular monolith or microservices** — Start coalesced if needed; keep service seams clear.

---

## 2. High-Level Architecture

```text
┌────────────────────────────────────────────────────────────────────────────┐
│              CLIENTS (Web / iOS / Android / TV / Advertiser Console)       │
│   Discover · Watch · Live · Search · Store · Profile · Learning · Games    │
│                     + Ads Manager + Admin / Risk Consoles                  │
└───────────────────────────────────┬────────────────────────────────────────┘
                                    │ API Gateway / BFF
                                    │ auth · rate limit · routing · edge cache
        ┌───────────────────────────┼────────────────────────────┐
        ▼                           ▼                            ▼
┌─────────────────┐       ┌──────────────────┐         ┌─────────────────┐
│ UMTUBA Platform │       │  Ads Domain      │         │ Admin / Ops     │
│ Identity        │◄─────►│  Services        │◄───────►│ Review Queue    │
│ Graph           │       │                  │         │ Fraud Console   │
│ Video / Watch   │       │                  │         │ Billing Ops     │
│ Live            │       └────────┬─────────┘         └─────────────────┘
│ Notifications   │                │
│ Store           │                │ domain events
│ Learning        │                ▼
│ Games           │     ┌─────────────────────┐
│ Media CDN       │     │  Event Bus / Stream │
└─────────────────┘     │  (impressions,      │
                        │   clicks, bills,    │
                        │   review, fraud)    │
                        └──────────┬──────────┘
                                   │
     ┌───────────┬─────────────────┼──────────────┬──────────────┐
     ▼           ▼                 ▼              ▼              ▼
 Audience    Delivery         Billing         Fraud         Warehouse
 Builder     Ranker/Cache     Ledger          Engine        / Metrics
```

---

## 3. Major Services

| Service | Responsibility |
|---------|----------------|
| **Campaign Service** | Campaigns, ad groups, ads, lifecycle states, scheduling |
| **Creative Service** | Assets, variants, transcodes hooks, creative policy metadata |
| **Placement Registry** | Declared placements, eligible ad types, UX constraints |
| **Targeting Service** | Geo, demo, interests, devices, schedules, include/exclude audiences |
| **Audience Service** | Custom audiences, exclusions, future AI/lookalike audiences |
| **Budget Service** | Daily/lifetime budgets, holds, pacing hooks, auto-stop |
| **Ad Server / Delivery** | Request → candidate → rank → select → log; ultra-low latency path |
| **Auction / Ranker** | Bid × pValue × quality/safety; pluggable models |
| **Billing Service** | Advertiser accounts, top-ups, charges, invoices, refunds |
| **Measurement / Events** | Impression, view, click, conversion ingestion; idempotent keys |
| **Reporting Service** | Aggregates, advertiser dashboards, export jobs |
| **Attribution Bridge** | Store, Live, Learning, App install conversion joins |
| **Review / Moderation** | Queues, decisions, appeals, vertical policy packs |
| **Fraud / IVT Service** | Fake clicks, bots, collusion, budget-drain patterns |
| **Policy / Feature Flags** | Regional legality of targeting and campaign classes |
| **Advertiser Identity** | Business profiles, verification tiers, RBAC for ads accounts |
| **Notification Bridge** | Limited sponsored notification inventory + user caps |
| **Admin Gateway** | Ops tools: freeze budgets, force-stop ads, audit export |

### Delivery path vs management path

| Path | Latency | Consistency |
|------|---------|-------------|
| **Ad request / serve** | Milliseconds | Strong enough for budget soft checks; hard settle async |
| **Campaign CRUD** | Human-scale | Strong per advertiser aggregate |
| **Billing settle** | Seconds–minutes | Strong + idempotent |
| **Reporting** | Minutes (near-real-time optional for Live) | Eventual |
| **Review** | Minutes–hours SLA | Strong decision log |

---

## 4. Layer View

### Clients

- Consumer surfaces request ads via placement SDKs / BFF.  
- Advertiser Console: campaign builder, creative upload, billing, reports.  
- Admin: review, fraud, advertiser support, yield tools.

### Backend

- API Gateway / BFFs (consumer vs advertiser vs admin).  
- Domain services with clear ownership of aggregates.  
- Outbox pattern for billing and measurement events.  
- Feature flags per country / campaign class.

### Media

- Shared UMTUBA media pipeline for images/video/carousel assets.  
- Transcoding, virus scan, CDN, signed URLs.  
- Creative hashes for duplicate and malware detection.

### Cross-cutting

| Concern | Approach |
|---------|----------|
| AuthN/AuthZ | UMTUBA identity + Ads RBAC scopes |
| Observability | Traces on serve path; structured audit on money/review |
| i18n | Creative language + UI locale separate from targeting language |
| Data residency | Region-aware storage for advertiser PII and raw events where required |
| Degradation | If Ads unhealthy → omit ad slots; never block organic content |

---

## 5. Data Flow

### 5.1 Campaign creation flow

```text
Advertiser → Campaign Service → Creative Service (assets)
           → Targeting Service → Budget Service (reserve rules)
           → Review Service (submit)
           → On approve: Ad becomes eligible for Delivery index
```

### 5.2 Serve flow (hot path)

```text
Client placement request
  → BFF (user token, device, locale, placement_id)
  → Ad Server
      → Candidate retrieval (targeting index + budget-eligible set)
      → Fraud/policy filters
      → Ranker
      → Select N ads for slot
      → Return creative payload + tracking tokens
  → Async: impression opportunities / served events → Event Bus
```

### 5.3 Engagement & billing flow

```text
Client fires viewability / click / video quartile beacons
  → Measurement Service (dedupe, validate)
  → Event Bus
      → Billing (billable events per pricing model)
      → Budget Service (consume / auto-stop)
      → Reporting aggregates
      → Fraud scoring (delayed / realtime hybrid)
```

### 5.4 Conversion / attribution flow

```text
Store order / Live purchase / Course enroll / App install event
  → Attribution Bridge (click/view windows, priority rules)
  → Conversion fact (campaign, ad, placement, timestamp)
  → Reporting + optional advertiser postbacks (future)
```

---

## 6. Integration with UMTUBA Products

| Product | Ads consumes | Ads provides |
|---------|--------------|--------------|
| **Social / Discover / Watch** | User context, content graph signals (privacy-safe), media CDN | Sponsored units in feed/watch |
| **Live** | Live session metadata, viewer context | Live Ads / promote Live; Live attribution |
| **Search** | Query + intent signals | Sponsored results clearly labeled |
| **Store** | Product/SKU eligibility, seller verification | Store Ads traffic; purchase attribution |
| **Profiles** | Profile visit context | Profile/spotlight ads where policy allows |
| **Notifications** | Delivery rails + user notification prefs | Strictly capped sponsored notifications |
| **UM Learning** | Course catalog eligibility | Course ads; enroll/start attribution |
| **Games** | App/game catalog | App Ads; install/open attribution |
| **Identity** | Auth, age gates, region | Advertiser org binding |
| **Wallet / Points** | Policy for points-funded promos (future) | Optional points boost campaigns (future) |

### Boundary rules

- Ads never writes Store inventory or orders.  
- Ads never starts a Live; it may deep-link to one.  
- Organic ranking remains owned by each product; Ads inserts labeled inventory.  
- Attribution windows and rules are versioned in Ads Measurement, not silently changed in Store.

---

## 7. Delivery & Indexing Architecture

### Candidate index

Logical indexes (implementation-agnostic):

- By placement eligibility  
- By geo shards  
- By schedule windows  
- By budget-active bit  
- By review-approved bit  

### Caching

- Creative payloads CDN-cached.  
- User targeting features short-TTL cached at edge/BFF.  
- Negative caches for exhausted budgets to avoid thundering herd.

### Consistency on budget

- Soft check at serve (may overshoot slightly under race).  
- Hard settle on billable events.  
- Auto-stop when remaining budget ≤ 0 or policy hold.

---

## 8. Future Scalability

| Dimension | Approach |
|-----------|----------|
| **QPS** | Shard ad server by region; placement-specific clusters for Watch/Live |
| **Advertisers** | Partition campaign stores by advertiser_id |
| **Events** | Append-only streams; aggregate into warehouse; hot counters for budgets |
| **Creatives** | Immutable asset versions; new edit = new creative revision |
| **Multi-region** | Region-primary delivery; global advertiser config with residency rules |
| **Peak Live** | Pre-warm Live placement caches; isolate Live serve pool |
| **ML rankers** | Sidecar/model service; fallback to rules-based ranker |
| **Partner demand** | Future adapter slot; never on critical path until trusted |

### Scalability north stars

| Dimension | Target mindset |
|-----------|----------------|
| Users | 10M+ MAU capable |
| Ad requests | Peak Watch/Live concurrent serve without organic degradation |
| Events | Billions of beacons/day class over time |
| Consistency | Strong for money/review; eventual for reports |
| Compliance | Regional targeting legality + audit export |

---

## 9. Consistency Model

| Domain | Consistency |
|--------|-------------|
| Campaign structure | Strong per campaign aggregate |
| Review decisions | Strong + append-only audit |
| Budget remaining | Strong settle; soft serve checks |
| Billing ledger | Strong + idempotent |
| Serve logs | Append-only; at-least-once → deduped |
| Reporting | Eventual (minutes typical) |
| Audience membership | Eventual |
| Fraud scores | Near-real-time + batch re-score |

---

## 10. Deployment Topology (Conceptual)

```text
Region A                          Region B
├─ Ad Server pool                 ├─ Ad Server pool
├─ Campaign/Budget replicas       ├─ read-heavy replicas
├─ Event collectors               ├─ Event collectors
└─ link to regional warehouse     └─ link to regional warehouse
              \                     /
               Global control plane
        (policy, advertiser identity,
         cross-region admin, feature flags)
```

Exact active-active vs primary-secondary is an implementation decision; seams above remain stable.

---

## 11. Security Architecture Touchpoints

Detailed controls live in `08_SECURITY.md`. Architecture requirements:

- Separate admin network path and step-up auth.  
- Serve path accepts only signed tracking tokens.  
- Budget freeze API available to Fraud and Admin.  
- PII minimized in serve logs; join keys carefully governed.

---

## 12. Explicit Non-Goals of This Document

- SQL schemas (see `09_DATABASE_BLUEPRINT.md`)  
- Exact auction formula coefficients  
- Vendor selection for stream bus or warehouse  
- UI wireframes  

---

## Related Documents

- `01_PRODUCT_VISION.md`  
- `03_AD_TYPES.md` · `04_PLACEMENTS.md` · `05_TARGETING.md`  
- `06_BUDGET_SYSTEM.md` · `07_REPORTING.md` · `08_SECURITY.md`  
- `09_DATABASE_BLUEPRINT.md` · `10_FUTURE_ROADMAP.md`  
- Cross-ref: `docs/store/03_STORE_ARCHITECTURE.md`, `docs/store/10_LIVE_SHOPPING.md`  
