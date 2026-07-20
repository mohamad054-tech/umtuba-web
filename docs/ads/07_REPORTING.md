# UMTUBA Ads — Reporting & Analytics

**Document type:** Measurement, analytics, and attribution blueprint  
**Principle:** OLTP serves delivery and billing; analytics serves decisions via event streams / warehouse  
**Scope:** Advertiser, creator (future), and platform reporting—including Store and Live attribution foundations

---

## 1. Reporting Philosophy

- Emit **immutable fact events** from Delivery, Measurement, Billing, Store, Live, Learning.  
- Separate **billable metrics** from **analytical metrics** when they diverge (e.g., IVT credits).  
- Definitions are **versioned** (what counts as a view, click, conversion).  
- Privacy: aggregate first; user-level exports are restricted and purpose-limited.  
- Attribution is explicit, windowed, and reproducible.  
- Near-real-time for spend pacing dashboards; batch for finance reconciliation.

---

## 2. Core Metrics

### 2.1 Delivery & Engagement

| Metric | Definition (foundation) |
|--------|-------------------------|
| **Impressions** | Count of billable/viewable impressions per active definition version |
| **Views** | Qualified video views (viewability + time/quartile threshold) |
| **Reach** | Deduplicated users exposed ≥1 time in date range |
| **Frequency** | Impressions / reach |
| **Clicks** | Validated click events (non-IVT) |
| **CTR** | Clicks / impressions |
| **Video quartile rates** | 25/50/75/100% completion among views |

### 2.2 Cost Efficiency

| Metric | Definition |
|--------|------------|
| **Spend** | Settled advertiser charges in period |
| **CPC** | Spend / clicks |
| **CPM** | Spend / impressions × 1000 |
| **CPV** | Spend / views |
| **CPA** | Spend / conversions (by conversion type) |
| **ROAS foundation** | Attributed revenue / spend (commerce objectives) |

ROAS requires Store (or partner) revenue attribution; shown with methodology disclaimer and attribution model version.

### 2.3 Conversion Funnel (Generic)

```text
Impression → View (video) → Click → Landing/PDP → Soft convert → Hard convert
```

Exact funnel steps depend on destination type (Store, App, Course, Job apply, Donation).

---

## 3. Breakdown Dimensions

| Dimension | Examples |
|-----------|----------|
| **Time** | Hour, day, week, month (advertiser TZ + UTC) |
| **Geography** | Country, region, city (as privacy allows) |
| **Device** | Phone/tablet/desktop/TV |
| **OS** | iOS/Android/… |
| **Placement** | `placement_id` / product |
| **Ad hierarchy** | Campaign, ad group, ad, creative |
| **Ad type / class** | Store, Live, Jobs, Government, … |
| **Connection** | Wi-Fi/cellular (optional) |
| **Audience segment** | Coarse buckets, not user lists |

Cardinality controls: high-cardinality cuts may be sampled or delayed.

---

## 4. Funnel Reporting by Destination

### Store

| Step | Event foundation |
|------|------------------|
| Click / product open | Ads click → Store PDP view |
| Add to cart | Store `add_to_cart` |
| Checkout start | Store checkout |
| Purchase | Store `payment_success` / order placed |
| Revenue | Order GMV minor units (gross/net policy) |
| Refund adjustment | Optional negative conversion / revenue revise |

### Live

| Step | Event foundation |
|------|------------------|
| Click join | Ads → Live join |
| Watch time | Live watch heartbeat aggregates |
| Product pin interact | Live shopping events |
| Live purchase | Store order with Live attribution |

### App / Games

| Step | Event foundation |
|------|------------------|
| Click | Ads |
| Install | First-party or MMP |
| First open | App open |
| Retention D1/D7 | Future cohort reporting |

### Courses / Learning

| Step | Event foundation |
|------|------------------|
| Click | Ads |
| Enroll | Learning enroll |
| First lesson | Start |
| Completion | Course complete (privacy-aware) |

### Jobs / Listings / Charity

| Vertical | Conversion foundation |
|----------|----------------------|
| Jobs | Apply start / apply submit |
| Real Estate / Vehicles | Lead / contact / chat start |
| Charity | Donation completed |
| Website | Landing + optional pixel (future) |

---

## 5. Attribution Foundations

### 5.1 Objects

| Object | Role |
|--------|------|
| **Click ID / View ID** | Tracking token minted at serve |
| **Attribution window** | Click-through and view-through windows per objective |
| **Priority rules** | Last click vs last touch vs data-driven (future) |
| **Conversion fact** | Joins conversion to campaign/ad/placement |
| **Model version** | Frozen on each conversion for reproducibility |

### 5.2 Store Attribution

- Prefer first-party join via click id stored in session / deep link.  
- Align with Store Creator Commerce attribution where both organic tags and paid ads exist—**paid vs organic credit rules must be explicit** (see outstanding decisions).  
- Multi-touch foundation reserved; V1 design assumes last paid click within window, with view-through optional flag.

### 5.3 Live Attribution

- Join Live session id + ads click id.  
- Purchases during/after Live use Live shopping attribution bridges plus ads window.

### 5.4 Cross-product

A user may see Watch ad → join Live → buy in Store. Reporting should allow:

- Primary conversion credit (single)  
- Path reporting (assist views/clicks) as secondary analytics  

---

## 6. Event Fact Families

| Family | Example facts |
|--------|---------------|
| Delivery | `ad_opportunity`, `ad_impression`, `ad_view`, `ad_click` |
| Video | `quartile_25`, `quartile_50`, `quartile_75`, `complete` |
| Billing | `charge_settled`, `credit_issued`, `budget_exhausted` |
| Fraud | `ivt_marked`, `click_rejected` |
| Store bridge | `attributed_pdp_view`, `attributed_purchase` |
| Live bridge | `attributed_live_join`, `attributed_live_purchase` |
| Learning bridge | `attributed_enroll` |
| App bridge | `attributed_install` |
| Review | `ad_approved`, `ad_rejected` |

Each fact: timestamps, region, ids (campaign/ad/placement/creative), money minor units when relevant, definition_version.

---

## 7. Dashboards

### Advertiser Console

| Module | Content |
|--------|---------|
| **Overview** | Spend, impressions, clicks, CTR, CPC/CPM, conversions, CPA, ROAS |
| **Hierarchy** | Drill campaign → ad group → ad → creative |
| **Placements** | Performance by surface |
| **Geo / device** | Breakdown charts |
| **Time** | Hourly/daily trends |
| **Funnel** | Destination-specific |
| **Diagnostics** | Learning limited / budget limited / review pending / frequency capped |
| **Exports** | CSV/API rate-limited |

### Platform Ops

| Module | Content |
|--------|---------|
| Yield | Fill rate, eCPM, revenue |
| Integrity | IVT rate, credit rate |
| Trust | Hide/report rates by placement |
| Review SLA | Queue age |
| Ecosystem | % spend → Store/Live/Learning outcomes |

### Seller / Creator (limited)

When Store sellers or creators are advertisers or inventory partners: scoped performance without leaking cross-advertiser data.

---

## 8. Real-Time vs Batch

| Lane | Latency | Use |
|------|---------|-----|
| Hot counters | Seconds | Budget remaining, crude spend |
| Near-real-time stream | ~1–5 min | Advertiser live charts |
| Warehouse batch | Hourly/daily | Finance-grade, ROAS, cohort |
| Live ops HUD | Seconds | Live placement health |

Finance reconciliation uses settled billing ledger, not approximate dashboard counters.

---

## 9. Data Quality & Honesty

- Metric definition changelog visible to advertisers.  
- “Preliminary” vs “finalized” spend flags during IVT windows.  
- Anomaly detection: sudden CTR spikes → quarantine metrics + fraud review.  
- Clock and timezone clearly labeled on charts.  
- Currency conversion for multi-region portfolio views uses published rates with timestamp.

---

## 10. Privacy Constraints

- No advertiser access to individual user identities in standard reports.  
- Small-N suppression on geo/device cuts.  
- Youth and sensitive category reporting aggregated carefully.  
- Government advertisers may have contractual audit exports under dual control.

---

## 11. API & Export (Design)

- Async report jobs for large ranges.  
- Webhooks for budget exhausted / campaign ended (future).  
- Conversion export with attribution ids for advertisers’ own BI.  

---

## Related Documents

- `02_SYSTEM_ARCHITECTURE.md` — Measurement & Attribution Bridge  
- `06_BUDGET_SYSTEM.md` — spend settlement  
- `08_SECURITY.md` — fraud impact on metrics  
- `09_DATABASE_BLUEPRINT.md` — reports entities  
- Cross-ref: `docs/store/12_ANALYTICS.md`  
