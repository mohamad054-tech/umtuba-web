# UMTUBA Ads — Database Blueprint

**Document type:** Conceptual data model (not SQL DDL)  
**Style:** Entities, relationships, cardinality, scale notes  
**Rule:** No vendor SQL dialects and no migrations in this document

---

## 1. Modeling Principles

- **IDs:** Globally unique opaque identifiers (UUID/ULID-class).  
- **Money:** Integer minor units + ISO currency; never float.  
- **Time:** UTC storage; advertiser timezone for daily budget boundaries.  
- **Soft deletes** where legally required; hard delete via retention jobs.  
- **Append-only** for billing ledger, audit, review decisions, fraud marks.  
- **Partitioning mindset:** Events by time + region; budgets by advertiser; serve logs hot/cold tiers.  
- **PII minimization:** Customer list raw PII not retained; hashed identities only.  
- **Event outbox** accompanies billing and measurement aggregates.  
- **Definition versions** on metric and attribution rules referenced by facts.

---

## 2. Entity Catalog

### Identity & Advertiser

| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| **UserRef** | Pointer to UMTUBA identity | Links staff users to roles |
| **AdvertiserOrg** | Business entity buying ads | 1 org → N users, N campaigns |
| **AdvertiserMember** | User membership + role | Org N↔N User |
| **AdvertiserVerification** | KYC/business/gov/charity tier | Org 1→N verification records |
| **ApiClient** | API key metadata (hashed secret) | Org 1→N |

### Campaign Hierarchy

| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| **Campaign** | Objective, class, dates, default budgets | Org 1→N Campaign |
| **AdGroup** | Targeting + placement set + bid | Campaign 1→N AdGroup |
| **Ad** | Type, destination, status | AdGroup 1→N Ad |
| **Creative** | Media shape + asset refs + text | Ad 1→N Creative (A/B) |
| **CreativeAsset** | Image/video/file metadata | Creative N↔N Asset |
| **StructuredAdPayload** | Jobs/RE/Vehicles/Courses fields | Ad 1→0..1 Payload |
| **DestinationRef** | Typed destination (store, live, url, app, course, job…) | Ad 1→1 Destination |

### Placements & Eligibility

| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| **Placement** | Registry entry for inventory slot | Product-scoped |
| **AdGroupPlacement** | Allowed placements for ad group | AdGroup N↔N Placement |
| **FormatPlacementPolicy** | Which ad types allowed where | Format × Placement rules |

### Targeting

| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| **TargetingSpec** | Versioned predicate document for ad group | AdGroup 1→N (history) |
| **GeoTarget** | Country/region/city/radius fragments | Spec 1→N |
| **DemoTarget** | Age/gender (policy-gated) | Spec 0..1 |
| **InterestTarget** | Interest ids | Spec N↔N Interest |
| **DeviceTarget** | Device/OS/connection | Spec 0..1 |
| **ScheduleTarget** | Dayparting / blackouts | Spec 0..1 |
| **FrequencyCap** | Cap rules | Campaign/AdGroup/Advertiser levels |
| **Audience** | Named audience definition | Org 1→N Audience |
| **AudienceMembership** | UserRef ∈ Audience (materialized) | Audience N↔N UserRef |
| **AudienceLink** | Include/exclude binding | AdGroup N↔N Audience (+ mode) |

### Budgets & Billing

| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| **BudgetPolicy** | Daily/lifetime caps, timezone, pacing mode | Campaign/AdGroup 1→0..1 |
| **BudgetLedger** | Remaining counters / snapshots | Policy 1→N snapshots |
| **SpendCounter** | Hot daily/lifetime consumed | Scoped keys |
| **AdvertiserAccount** | Currency, balance/credit limit | Org 1→1 |
| **FundingTransaction** | Top-ups, invoice payments | Account 1→N |
| **BillingEvent** | Settled charge for billable unit | Account 1→N; links impression/click/conversion |
| **CreditEvent** | IVT/manual credits | Account 1→N; may reverse BillingEvent |
| **Invoice** | Period invoice for postpaid | Account 1→N |
| **PaymentMethodRef** | Tokenized method pointer | Account 1→N |

### Delivery & Measurement

| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| **ImpressionOpportunity** | Request/slot level (optional sample) | High volume |
| **Impression** | Served + viewable impression | → Ad, Placement, Creative |
| **ViewEvent** | Qualified video view / quartiles | → Impression |
| **ClickEvent** | Validated click | → Impression |
| **TrackingToken** | Signed token metadata / expiry | → Impression |
| **ConversionEvent** | Attributed conversion | → Click/View + destination fact |
| **AttributionModel** | Window + priority version | Referenced by ConversionEvent |
| **MetricDefinition** | Versioned metric dictionary | Referenced by reports |

### Reporting Aggregates

| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| **ReportAggregateDaily** | Pre-agg spend/impr/click/conv | Keys: campaign/ad/placement/geo/device… |
| **ReportAggregateHourly** | Near-real-time leaner agg | Same |
| **ReachEstimate** | HyperLogLog-style reach sketches (logical) | Campaign/date |
| **FunnelAggregate** | Destination funnel counts | Campaign/ad/date |
| **ExportJob** | Async advertiser export | Org 1→N |

*Aggregates are derived; source of truth remains event streams + billing ledger.*

### Fraud

| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| **FraudEvent** | Detected abuse signal/case fragment | Links user/device/impression/click |
| **FraudCase** | Investigation case | 1→N FraudEvent |
| **IvtMark** | Invalid traffic judgment on event | → Click/Impression/Conversion |
| **BudgetFreeze** | Freeze record + reason | → Account/Campaign |
| **DeviceGraphNode** *(logical)* | Shared risk graph pointer | Cross-domain with Identity/Store |

### Moderation & Review

| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| **ReviewSubmission** | Ad/creative submit for review | Ad/Creative 1→N |
| **ReviewDecision** | Approve/reject/changes | Submission 1→N |
| **PolicyCode** | Stable policy reason catalog | Decision N→1 |
| **UserAdReport** | Consumer report/hide | → Ad + UserRef |
| **AdvertiserStrike** | Strike / restriction | Org 1→N |
| **Appeal** | Appeal case | Decision 1→0..N |

### Audit

| Entity | Purpose | Key relationships |
|--------|---------|-------------------|
| **AuditLogEntry** | Append-only actor/action/target | Cross-entity |
| **AdminBreakGlassSession** | Time-boxed elevated access | Admin user |

---

## 3. Relationship Overview

```text
AdvertiserOrg
  ├── Campaign
  │     ├── BudgetPolicy
  │     └── AdGroup
  │           ├── TargetingSpec ── AudienceLink ── Audience
  │           ├── AdGroupPlacement ── Placement
  │           └── Ad
  │                 ├── DestinationRef
  │                 ├── StructuredAdPayload?
  │                 └── Creative ── CreativeAsset
  ├── AdvertiserAccount ── BillingEvent / CreditEvent / FundingTransaction
  └── Audience ── AudienceMembership

Impression ── ViewEvent / ClickEvent ── ConversionEvent
Click/Impression ── IvtMark / FraudEvent
Ad/Creative ── ReviewSubmission ── ReviewDecision
```

---

## 4. Status Enumerations (Conceptual)

### Campaign / AdGroup / Ad

`draft` · `pending_review` · `approved` · `active` · `paused` · `budget_exhausted` · `rejected` · `ended` · `frozen`

### ReviewDecision

`approved` · `rejected` · `changes_requested` · `escalated`

### BillingEvent

`pending` · `settled` · `credited` · `void`

### Audience

`processing` · `ready` · `failed` · `archived`

---

## 5. Scale & Partition Notes

| Data class | Scale mindset | Partition / tier idea |
|------------|---------------|------------------------|
| Impressions/clicks | Extreme write volume | Time + region; cold object storage |
| Aggregates | Large but queryable | Time + advertiser |
| Campaign graph | Moderate | By advertiser_id |
| Audience membership | Large | By audience_id shards |
| Billing ledger | Critical integrity | By account_id; strong backup |
| Audit/review | Moderate growth | Time |

---

## 6. Consistency Expectations

| Entity family | Consistency |
|---------------|-------------|
| Campaign graph | Strong per aggregate |
| Budget counters | Strong settle; soft serve |
| Billing/credits | Strong + idempotent |
| Membership | Eventual |
| Aggregates | Eventual |
| Fraud marks | Strong decision; async apply |
| Review decisions | Strong |

---

## 7. Cross-Domain References (Not Owned by Ads)

| External id | System |
|-------------|--------|
| `user_id` | Identity |
| `video_id` / `post_id` | Social |
| `live_session_id` | Live |
| `store_id` / `product_id` / `order_id` | Store |
| `course_id` / `enrollment_id` | UM Learning |
| `app_id` / `install_id` | Games / App platform |
| `notification_id` | Notifications |

Ads stores references + attribution joins; source systems remain authoritative.

---

## 8. Retention (Design Defaults)

| Class | Direction |
|-------|-----------|
| Raw serve beacons | Short–medium hot; sampled long-term |
| Settled billing | Long (finance/legal) |
| Review + audit | Long |
| Customer list uploads | Short; membership retained per policy |
| Aggregates | Medium–long |
| Fraud cases | Long |

Exact days are counsel + finance owned.

---

## 9. Explicit Non-Goals

- SQL DDL, indexes, ORM mappings  
- Choosing Postgres vs NoSQL vs warehouse vendors  
- Generating migrations  

---

## Related Documents

- `02_SYSTEM_ARCHITECTURE.md`  
- `05_TARGETING.md` · `06_BUDGET_SYSTEM.md` · `07_REPORTING.md` · `08_SECURITY.md`  
- Cross-ref: `docs/store/04_STORE_DATABASE_BLUEPRINT.md`  
