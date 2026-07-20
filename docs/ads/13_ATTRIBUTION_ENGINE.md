# UMTUBA Ads — Attribution Engine

**Document type:** Enterprise design blueprint (Ads V2)  
**Status:** Design only — not implemented  
**Builds on:** Attribution foundations in `07_REPORTING.md`, Attribution Bridge in `02_SYSTEM_ARCHITECTURE.md`, conversion entities in `09_DATABASE_BLUEPRINT.md`  
**Scope:** Unified, versioned attribution across paid Ads and ecosystem touchpoints—without Ads owning checkout

---

## 1. Scope

The **Attribution Engine** assigns credit for outcomes (purchases, leads, joins, enrollments, installs) to prior touchpoints across the UMTUBA ecosystem. It supports **advertiser-facing** paid reporting and **internal ecosystem** analytics (creators, Live, Store discovery) as related but separable ledgers when required.

### Goals

1. Cover paid Ads, organic video, creator content, Live commerce, Store search, Store recommendations, profile visits, external referrals, and future Learning/Games touches.  
2. Define funnel events from Impression through Purchase/Lead/Install with idempotent joins.  
3. Support multiple attribution models (last/first/linear/position-based; data-driven future).  
4. Enforce windows, deduplication, consent, and regional limits.  
5. Keep **Store as source of truth** for orders and payments; Ads never mutates orders.  
6. Handle refunds, cancellations, late events, and corrections with an audit trail.  
7. Separate creator commission attribution from advertiser ad reporting when policies differ.

### Non-goals

- Replacing Store order state machines or payment capture.  
- Perfect cross-device identity without consented linkage.  
- A single global legal definition of “conversion” for all countries.  
- Final numeric default windows (recorded as Open Decisions).  
- Claiming implemented real-time multi-touch UI today.

---

## 2. Core Concepts

| Concept | Meaning |
|---------|---------|
| **Touch** | Impression, View, Click, or organic engagement with a trackable object |
| **Conversion** | Downstream outcome event (purchase, lead, …) |
| **Attribution Model** | Versioned rules mapping touches → credit |
| **Window** | Click-through / view-through lookbacks |
| **Credit ledger** | Model-specific allocation (may be fractional) |
| **Advertiser credit** | What Ads Reporting shows for Campaign/Ad |
| **Ecosystem credit** | Internal/creator/Live/Store path analytics |
| **Identity key** | Logged-in UserRef and/or ephemeral device/session keys |
| **Idempotency key** | Prevents double-counting the same conversion |

**Current Design:** V1 described last-paid-click foundations. V2 specifies the full engine contract and conflict surfaces without freezing unpaid decisions.

---

## 3. Touch & Conversion Catalog

### 3.1 Touches (upstream)

| Touch | Typical source |
|-------|----------------|
| **Impression** | Ads Delivery |
| **View** | Qualified video/Live view (definition versioned) |
| **Click** | Ads or organic CTA |
| **Organic video engage** | Social/Watch (creator content) |
| **Creator content tag** | VideoProductLink / branded content |
| **Live commerce** | Live join, pin view, offer claim |
| **Store search** | Query → PDP |
| **Store recommendations** | Shelf → PDP |
| **Profile visit** | Profile / storefront |
| **External referral** | Signed landing with referrer token |
| **Learning / Games** *(Future)* | Course card / game storefront engage |

### 3.2 Conversions (downstream)

| Conversion | Authority |
|------------|-----------|
| **Landing** | Destination open (PDP, Live, URL, course) |
| **Add to cart** | Store |
| **Checkout start** | Store |
| **Purchase** | Store order / payment success |
| **Lead** | Form/chat/apply start-submit |
| **Registration** | Identity or vertical signup |
| **App install / deep-link convert** *(Future)* | Games/App measurement |
| **Enroll / lesson start** *(Future Learning)* | UM Learning |
| **Donation** | Charity flow |

Ads **reads** Store/Live/Learning facts; it does not write orders.

---

## 4. Architecture

```text
Touch producers (Delivery, Social, Live, Store browse, …)
        │ touch facts (append-only)
        ▼
┌─────────────────────┐
│  Attribution Engine │
│  join · window ·    │
│  model · dedupe     │
└──────────┬──────────┘
           │ conversion facts (Store/Live/Learning…)
           ▼
   Credit facts (model_version, weights)
           │
     ┌─────┴──────┬────────────────┐
     ▼            ▼                ▼
 Ads Reporting  Ecosystem      Creator commission
 (advertiser)   analytics      subsystem (separate)
```

### Boundaries

| System | Owns |
|--------|------|
| **Store** | Order, payment, refund, cancel, GMV amounts |
| **Live** | Session identity, pin interactions |
| **Ads Delivery** | Impression/View/Click ids + tracking tokens |
| **Attribution Engine** | Joins, models, credit facts, audit |
| **Creator commerce** | Commission rules (may use ecosystem credit, not Ads spend) |
| **Billing Account** | Ad charges remain independent of creator payouts |

---

## 5. Identity Without Exposing Sensitive Data

- Prefer **logged-in UserRef** for joins.  
- Anonymous: session/device keys with short retention; limited cross-session stitching.  
- **Conversion identity** in exports: opaque attribution ids, not emails/phones.  
- Cross-device: only via consented Identity graph; otherwise path breaks are expected and documented.  
- No advertiser access to raw user lists from attribution joins.

---

## 6. Windows, Deduplication, Idempotency

| Control | Design |
|---------|--------|
| **Click-through window** | Configurable per objective/model version — **default TBD (Open Decision)** |
| **View-through window** | Usually shorter; optional per Advertiser/feature flag |
| **Deduplication** | One primary conversion fact per `(conversion_id, model_version)` |
| **Idempotency** | Ingest key = producer event id; retries safe |
| **Multi-click** | Model decides; engine stores full path for path reporting |

Invalid traffic (IVT) touches are excluded from advertiser credit or marked non-qualifying (`08_SECURITY.md`).

---

## 7. Attribution Models

| Model | Credit rule | Status |
|-------|-------------|--------|
| **Last touch** | 100% to last eligible touch in window | Current Design candidate for advertiser default |
| **Last paid click** | Last Ads click; ignores organic for advertiser ledger | V1 foundation |
| **First touch** | 100% to first eligible touch | Supported option |
| **Linear** | Equal split across eligible touches | Supported option |
| **Position-based** | U-shaped weights (e.g., 40/20/40) | Supported option |
| **Data-driven** | Learned weights | **Future Capability** |

Each ConversionEvent stores `attribution_model_version` for reproducibility (`07_REPORTING.md`).

---

## 8. Advertiser-Facing vs Ecosystem Attribution

| Ledger | Purpose | Typical model |
|--------|---------|---------------|
| **Advertiser-facing** | Campaign ROAS/CPA in Ads Reporting | Last paid click or advertiser-selected model |
| **Ecosystem / internal** | Understand full path value | Multi-touch / position-based |
| **Creator commission** | Pay creators for tagged commerce | Store creator rules — **may differ** from Ads credit |

**Open Decision:** Paid versus organic credit conflict when both exist on one purchase—see §12 and V1 outstanding items.

Design requirement: systems must be able to emit **both** ledgers without double-charging the Advertiser Billing Account (billing ≠ attribution credit).

---

## 9. Refunds, Cancellations, Corrections

| Event | Attribution effect |
|-------|--------------------|
| **Cancel before capture** | Conversion reversed / voided |
| **Refund** | Negative revenue adjustment and/or conversion reverse per policy |
| **Partial refund** | Proportional revenue revise |
| **Late-arriving conversion** | Attribute if within window at event time; watermark lag labeled in Reporting |
| **Correction** | New correction fact; prior fact superseded, not silently rewritten |
| **IVT late mark** | Credit clawback on Ads spend may be separate from conversion reverse |

Timezone: store UTC; windows evaluated in documented TZ policy (event UTC + model version note). Advertiser dashboards may display in AdvertiserAccount timezone.

---

## 10. Consent & Regional Limits

- Honor personalized-ads / measurement consent flags by region.  
- If consent lacking: click-based first-party only, or aggregate-only reporting.  
- Policy packs may disable view-through.  
- Government/Charity may require longer retention of attribution audit—not broader user profiling.

---

## 11. Attribution Audit Trail

Append-only records for: model version publish, window changes, credit issuance, reversals, manual ops overrides (dual control), consent regime applied.  
Supports disputes and finance reconciliation with Enterprise Reporting (`15`).

---

## 12. Multi-Path Examples (Illustrative)

### Example A — Paid then Store

1. Watch Ad Impression + View  
2. Ad Click → Store PDP (Landing)  
3. Add to cart → Checkout → Purchase  

**Advertiser last-paid-click:** 100% to Campaign/Ad.  
**Ecosystem path report:** lists Watch placement assist.

### Example B — Organic creator then paid assist then Live buy

1. Organic video with product tag  
2. Later Discover Ad Click (same SKU)  
3. Joins Live → Live purchase (Store order)

**Conflict surface:** creator commission vs paid Ads ROAS. Engine can emit:  
- Advertiser credit → paid click (if last paid click model)  
- Creator commission → organic tag / Live host rules (Store)  
Exact priority is an **Open Decision**.

### Example C — Store search only

1. Store search → PDP → Purchase  
**Advertiser credit:** none (no paid touch).  
**Ecosystem:** Store search attribution for merchandising analytics.

### Example D — Cross-device limitation

1. Click ad on phone (logged out)  
2. Purchase on desktop (logged in, no link)  
**Result:** may not join; Reporting should not invent identity.

### Example E — Double conversion prevention

Same `order_id` ingested twice → idempotent; single conversion fact per model version.

---

## 13. Failure Modes

| Failure | Behavior |
|---------|----------|
| Store event delay | Near-real-time dashboards marked preliminary; finalize on watermark |
| Missing click id | Fall back to view-through only if enabled; else unattributed |
| Model version change mid-flight | New conversions use new version; history unchanged |
| Identity outage | Degrade to session-only joins |
| Clock skew | Prefer server event time; document skew tolerance |

---

## 14. MVP vs Future Capability

| MVP | Future |
|-----|--------|
| Last paid click + path assist list | Data-driven model |
| Store purchase + PDP funnel | Learning enroll, app install MMP-class |
| Refund reverse | Multi-touch advertiser UI defaults |
| Dual ledger hooks (ads vs ecosystem) | Clean-room / incrementality exports |

---

## 15. Open Decisions

1. **Default attribution windows** (click-through / view-through) per objective.  
2. **Paid versus organic attribution conflict** and creator commission interaction.  
3. Whether advertiser UI default is last paid click or last touch.  
4. Viewability / view definitions feeding view-through eligibility (thresholds TBD).  
5. Cross-device graph depth and retention.  
6. Regional data residency for raw touch logs.  
7. External DSP demand attribution if partner demand is allowed.  
8. Gender/sensitive targeting unrelated but consent packs may limit measurement features.

---

## 16. Design Completeness Checklist

- [x] Ecosystem touch + conversion coverage  
- [x] Windows, dedupe, identity, models  
- [x] Advertiser vs ecosystem vs creator ledgers  
- [x] Store ownership of orders; Ads non-mutation  
- [x] Refunds, late events, corrections, audit  
- [x] Examples + explicit deferred defaults  
- [x] Consent/regional limits  

---

## Related Documents

- `07_REPORTING.md` — metric foundations this engine feeds  
- `15_ENTERPRISE_REPORTING.md` — attribution reporting surfaces  
- `02_SYSTEM_ARCHITECTURE.md` — Attribution Bridge  
- `06_BUDGET_SYSTEM.md` — billing independent of credit  
- `08_SECURITY.md` — IVT exclusion  
- `10_FUTURE_ROADMAP.md` — commerce/Live measurement phases  
- Cross-ref: `docs/store/09_CREATOR_COMMERCE.md`, `docs/store/10_LIVE_SHOPPING.md`, `docs/store/12_ANALYTICS.md`  
