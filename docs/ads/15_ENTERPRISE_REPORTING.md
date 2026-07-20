# UMTUBA Ads — Enterprise Reporting

**Document type:** Enterprise design blueprint (Ads V2)  
**Status:** Design only — not implemented  
**Builds on:** `07_REPORTING.md` foundations; extends for agency, finance, ops, and reproducibility  
**Scope:** Advanced analytics layer over event streams / warehouse — not OLTP

---

## 1. Scope

**Enterprise Reporting** is the institutional analytics plane for Advertisers, agencies, finance, and platform operators. It sits **above** V1 core metrics and consumes Attribution Engine credits, Billing Account settlements, IVT adjustments, and Budget pacing signals.

### Goals

1. Provide multi-dimensional comparison and funnel/attribution views at account scale.  
2. Reconcile spend with billing and show preliminary vs finalized data.  
3. Support saved reports, exports (CSV/API), pagination, and future schedules.  
4. Offer role-based visibility, agency multi-account, and executive/ops/finance dashboards.  
5. Enforce privacy thresholds, residency, retention, and reproducible metric versions.  
6. Keep heavy queries off transactional Delivery/Campaign databases.

### Non-goals

- Replacing real-time Delivery counters used for Budget soft-checks.  
- Final numeric viewability/IVT thresholds (still Open Decisions).  
- Claiming a live warehouse deployment in the current codebase.  
- User-level advertiser exports of audiences.

---

## 2. Relationship to V1 Reporting

| V1 (`07`) | Enterprise (`15`) |
|-----------|-------------------|
| Core metric definitions | Expanded dictionary + reproducibility |
| Advertiser console modules | Comparison, saved reports, agency rollups |
| Attribution foundations | Full attribution reporting via `13` |
| Basic exports | Large async jobs, API export, pagination |
| Platform ops snapshot | Executive / finance / integrity packs |

Enterprise Reporting **does not redefine** Delivery honesty principles; it operationalizes them for scale.

---

## 3. Architecture

```text
Domain events (Delivery, Billing, Fraud/IVT, Store/Live bridges, Attribution credits)
        │
        ▼
  Stream / bus → warehouse fact tables + aggregate marts
        │
        ▼
  Enterprise Reporting Service (query API, saved reports, export jobs)
        │
        ├── Advertiser / Agency consoles
        ├── Finance reconciliation views
        └── Platform executive / ops dashboards

OLTP (Campaign, Budget hot counters) ──✗── not used for heavy analytical scans
```

**Data freshness labels** required on every response: `realtime_counter` | `near_realtime` | `preliminary` | `finalized`.

---

## 4. Metric Dictionary (Foundation)

Numeric thresholds (viewability %, view duration, IVT windows) remain **TBD**—definitions below are contractual shapes.

| Metric | Definition (foundation) | Notes |
|--------|-------------------------|-------|
| **Impressions** | Count of impressions meeting active MetricDefinition version (often viewable) | Billable vs analytical may differ |
| **Reach** | Approx distinct users with ≥1 impression in range | Sketch-based at scale |
| **Frequency** | Impressions / Reach | Undefined if Reach=0 |
| **Views** | Qualified video/Live views per definition version | Not equal to impressions |
| **View rate** | Views / Impressions (or Views / video impressions) | Document denominator version |
| **Clicks** | Validated non-IVT clicks | Signed token rules |
| **CTR** | Clicks / Impressions | |
| **CPC** | Spend / Clicks | Settled spend |
| **CPM** | Spend / Impressions × 1000 | |
| **Conversions** | Count of attributed conversions (type + model version) | From Attribution Engine |
| **Conversion rate** | Conversions / Clicks (or / Impressions—declare) | Denominator must be labeled |
| **CPA** | Spend / Conversions | By conversion type |
| **ROAS** | Attributed revenue / Spend | Store revenue methodology labeled |
| **Spend** | Settled advertiser charges in period | Billing Account ledger |
| **Invalid traffic (IVT)** | Share or count of impressions/clicks marked IVT | Credits adjust spend |

Additional enterprise metrics: refund-adjusted ROAS, credit amount, paced spend vs Budget, forecast error.

---

## 5. Dimensions & Comparisons

### Slice dimensions

| Dimension | Examples |
|-----------|----------|
| Account / AdvertiserOrg | Agency rollup |
| Campaign / Ad Group / Ad / Creative | Hierarchy compare |
| Country / region / city | Privacy thresholds |
| Language | Creative or UI language |
| Device / OS / app version | Client telemetry |
| Placement | Placement Registry id / product |
| Time of day / day of week | Advertiser TZ + UTC |
| Product / Store / Creator / Live room | Ecosystem ids |
| Course *(Future)* | Learning |
| Attribution model version | Side-by-side methodology |

### Comparison views

- Account overview  
- Campaign comparison  
- Ad group comparison  
- Creative comparison  
- Funnel reporting (by destination type)  
- Attribution reporting (path assists + primary credit)  
- Forecast vs actual (from AI estimates or pacing forecasts—labeled estimates)

---

## 6. Finance, Budget, Fraud Overlays

| Module | Content |
|--------|---------|
| **Spend & billing reconciliation** | Dashboard spend vs BillingEvent/Invoice; explain deltas (pending IVT) |
| **Budget pacing** | Daily/lifetime consumed vs target pace (`06`) |
| **Fraud/IVT adjustments** | Gross vs net after credits |
| **Refund & credit reporting** | Store refund impact on ROAS + Ads CreditEvent |
| **Currency** | Account currency primary; FX for cross-account agency views with rate timestamp |
| **Time zones** | Report TZ parameter; store facts in UTC |

---

## 7. Dashboards by Audience

| Audience | Focus |
|----------|-------|
| **Executive** | Spend, ROAS foundation, growth, trust KPIs |
| **Operational** | Delivery health, Review SLA, fill, pacing incidents |
| **Finance** | Settled spend, invoices, credits, reconciliation breaks |
| **Advertiser / Analyst** | Performance, funnels, creatives, placements |
| **Agency** | Multi-account overview with tenant isolation |

Role-based visibility follows `08_SECURITY.md` (Analyst read; Billing Manager financial; platform Auditor export).

---

## 8. Saved Reports, Exports, API

| Capability | Design |
|------------|--------|
| **Saved reports** | Named query: metrics, dims, filters, TZ |
| **Scheduled reports** *(Future)* | Email/webhook delivery of exports |
| **CSV export** | Async for large ranges |
| **API export** | Same semantic as console (`16`) |
| **Pagination** | Cursor-based for large dimensions |
| **Report versioning** | Saved definition version + MetricDefinition set pin |
| **Reproducibility** | Re-run returns same numbers for finalized watermark + pinned defs |

Late data corrections: publish correction batches; finalized reports may rev with `revision_id` rather than silent rewrite.

---

## 9. Privacy, Residency, Retention

- **Small-N suppression** on geo/device/creator cuts.  
- No pivoting to individual users.  
- **Data residency:** warehouse regions follow Open Decision on residency; queries should not pull raw events across illegal borders.  
- Retention tiers: hot marts vs cold archive; finance-grade spend longer.  
- Youth/sensitive packs may hide dimensions entirely.

---

## 10. Preliminary vs Finalized

| Label | Meaning |
|-------|---------|
| **Preliminary** | Includes unsettled beacons; IVT window open |
| **Finalized** | Past IVT/credit watermark; finance-aligned |

UI and API must not mix labels without disclosure. Budget soft counters remain separate from finalized Spend.

---

## 11. Failure Modes

| Failure | Behavior |
|---------|----------|
| Warehouse lag | Show stale freshness; degrade to near-realtime limited metrics |
| Reconciliation break | Finance alert; do not auto-edit Billing ledger from reports |
| MetricDefinition change | New reports use new version; old saved reports pin old |
| Over-wide query | Reject / force async job |
| Privacy threshold trip | Return suppressed cells, not zeros pretending emptiness |

---

## 12. MVP vs Future Capability

| MVP | Future |
|-----|--------|
| Hierarchy + placement + geo/device + spend recon | Scheduled reports, FX agency rollups |
| CSV async export | Clean-room partner shares |
| Preliminary/final labels | Incrementality / holdout report packs |
| Attribution primary credit views | Full multi-touch advertiser UI |
| Pin MetricDefinition | Self-serve custom metrics |

---

## 13. Open Decisions

1. Viewability and IVT **numeric** thresholds.  
2. Default attribution windows affecting conversion metrics (`13`).  
3. Paid vs organic credit in advertiser ROAS.  
4. Regional data residency topology.  
5. Prepaid vs postpaid presentation in finance dashboards.  
6. Budget overshoot SLA impact on “spend accuracy” SLO.  
7. External DSP demand metrics if enabled.  
8. Creator-dimension visibility vs creator privacy.

---

## 14. Design Completeness Checklist

- [x] Enterprise slices + comparison + funnel/attribution  
- [x] Billing recon, pacing, IVT, refunds, currency/TZ  
- [x] Saved/export/API/pagination/freshness/versioning  
- [x] Role-based + agency + exec/ops/finance views  
- [x] Privacy thresholds, residency, retention, corrections  
- [x] Warehouse-not-OLTP rule  
- [x] Metric table with TBD thresholds called out  

---

## Related Documents

- `07_REPORTING.md` — foundation metrics and event families  
- `06_BUDGET_SYSTEM.md` — pacing and settlement  
- `08_SECURITY.md` — IVT, roles  
- `13_ATTRIBUTION_ENGINE.md` — credit facts  
- `14_EXPERIMENT_PLATFORM.md` — experiment result segmentation  
- `16_ADS_API_AND_INTEGRATIONS.md` — reporting query API  
- `09_DATABASE_BLUEPRINT.md` — aggregate entities  
