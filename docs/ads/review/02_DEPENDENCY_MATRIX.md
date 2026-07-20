# UMTUBA Ads — Dependency Matrix

**Document type:** Production readiness review — cross-product dependencies
**Status:** Review only — planned contracts, not proven runtime integrations
**Sources:** Design V2 placements/integrations; `../implementation/03_BACKEND_SERVICES_PLAN.md`; Attribution `../13_ATTRIBUTION_ENGINE.md`

**Legend**

| Sync model | Meaning |
|------------|---------|
| Sync read | Request-time lookup |
| Event | Async domain event |
| Flag | Feature/cohort gate |
| None | No hard dependency |

| Blocking | Meaning |
|----------|---------|
| Hard | MVP/path cannot ship without it |
| Soft | Degrades feature; core Ads can still progress |
| Future | Post-MVP |

---

## 1. Matrix

| Ads component | Upstream dependency | Downstream consumer | Source of truth | Data contract (conceptual) | Sync model | Failure behavior | Ownership boundary | MVP? | Future? | Blocking |
|---------------|---------------------|---------------------|-----------------|----------------------------|------------|------------------|--------------------|------|---------|----------|
| Advertiser accounts | Identity (`auth.users`) | Campaign, Billing, Admin | Ads Advertiser org | user_id membership | Sync | Deny create | Ads owns org; Identity owns user | Yes | Agency | Hard |
| Team / roles | Identity | Console RBAC | Ads membership | role enum | Sync | Fail closed | Ads | Yes | Agency grants | Hard |
| Campaigns / Ad Groups / Ads | Advertiser org; Placement Registry ids | Eligibility, Review | Ads hierarchy | status, schedule, objective | Sync + events | Draft-only if deps down | Ads | Yes | Verticals | Hard |
| Targeting | Identity age/region signals; policy packs | Eligibility | Ads TargetingSpec + Policy | geo/lang/age/interests | Sync read features | Exclude unknown age | Ads owns spec; Identity owns age truth | Yes | AI audiences | Hard (basic); Soft (advanced) |
| Creatives / Asset Library | Media pipeline / CDN | Serving, Review | Ads assets | asset version, scan state | Async process | Reject asset | Ads; Media shared infra | Yes | Brand kits | Hard |
| Review / moderation | Platform admin identity | Eligibility | Ads review decisions | approve/reject audit | Sync RPC | No eligibility without approve | Ads Trust; admin table | Yes | Automation | Hard |
| Budget / Billing Account | Payment adapters *(future)*; Ads ledger | Eligibility soft-check; Reporting | Ads ledger | minor units, currency | Sync settle RPC | Freeze / stop serve | Ads money; **not** Store payments | Shell MVP; settle Soft→Hard | Invoicing | Hard for settle |
| Placement Registry | Product teams declare slots | Eligibility, Serving, Console | Ads registry + product UX | placement_id, shapes | Sync + config | Unknown placement denied | **Product owns slot UX**; Ads owns registry row | Yes | New products | Hard |
| Delivery eligibility | Campaign/Review/Budget/Freeze + request context | Ad Serving | Ads eligibility | candidate set | Sync hot | Empty set | Ads | Sandbox+ | — | Hard for Delivery |
| Ad Serving | Discover/Watch/(Store) BFF request | Consumers; Event ingest | Ads serve response | creative + token | Sync hot | Omit ad; organic continues | Ads serve; **Product owns chrome** | Sandbox+ | Live/Search | Hard for Delivery |
| Event ingestion | Client beacons; signed tokens | Billing, Reporting, Attribution | Ads events | impression/click/view ids | Sync ack + async | Dedupe / poison DLQ | Ads | With Delivery | — | Hard with Delivery |
| Reporting | Events + ledger + attribution | Advertiser/Admin consoles | Ads aggregates | MetricDefinition version | Eventual | Stale/preliminary labels | Ads | MVP honesty | Warehouse | Soft early; Hard Public MVP claims |
| Attribution | Ads touches + Store/Live/Learning facts | Reporting | **Store orders** for purchases; Ads results for credit | order_id, model_version | Event | Unattributed / reverse | Store owns order; Ads owns credit facts | Soft until Rel-5 | Multi-touch | Hard for Store promo claims |
| Store promotions | Store catalog eligibility, seller verify | Serving destinations; Attribution | Store catalog | product_id, status | Sync read | Ineligible destination | Store owns SKU; Ads promotes | Rel-5 | Dynamic catalog | Soft until Store beta |
| Live Ads | Live session metadata | Serving; Attribution | Live session | live_session_id | Sync read | No fake LIVE; omit ad | Live owns session | Rel-7 pilot | Share model | Soft |
| Discover inventory | Discover feed BFF | Serving | Discover placement | placement request | Sync | Collapse slot | Discover owns feed rank organic | OD-16 | — | Hard if chosen first |
| Watch inventory | Watch player BFF | Serving | Watch placement | between-video slot | Sync | Skip ad | Watch owns player | OD-16 | — | Hard if chosen first |
| Search inventory | Search results | Serving | Search | sponsored block | Sync | Omit sponsored | Search owns relevance floor | Future | — | Soft |
| Profiles inventory | Profile surfaces | Serving | Profile | low-density slots | Sync | Omit | Profiles | Future | — | Soft |
| Notifications | Notification delivery + prefs | Limited sponsored notifs | Notifications | caps, quiet hours | Sync + prefs | Default off | Notifications owns rails | Future / limited | — | Soft |
| UM Learning | Course catalog | Course Ads; enroll attribution | Learning | course_id, enroll events | Sync + event | Omit / unattributed | Learning owns progress | Future | — | Soft |
| Games / App Ads | Games catalog / MMP | App Ads | Games/App | install events | Event | Unattributed | Games owns sessions | Future | — | Soft |
| Experiments | Campaign creatives; Reporting metrics | Assignment; AI lock | Ads experiment registry | arm, unit hash | Sync assign | Abort on SRM | Ads | Future flag | — | Soft |
| AI recommendations | Reporting aggregates; Assets | Campaign/Creative drafts | Ads AI proposals | model_version | Async + human approve | Manual fallback | Ads; no PII out | Future | Auto-apply OD-12 | Soft |
| Admin enforcement | Platform admin table | Eligibility/Billing freeze | Ads freezes / stop | freeze flags | Sync | Fail closed serve | Ads Admin | Yes | Incidents | Hard |
| Notifications (ops) | Review/budget events | Advertiser alerts | Notifications product | template events | Event | Retry | Notifications delivers; Ads emits | Soft | — | Soft |
| Creator commerce attribution | Organic VideoProductLink / Live pins | Ecosystem ledger | Store creator rules | commission facts | Event | Separate from Ads ROAS | Store/Creator — **not Ads payout** | Soft | OD-07 | Soft (must not block Ads ledger) |

---

## 2. Hard vs Optional (Summary)

### Hard for Ads management MVP (Phase A–B)

- Identity
- Ads org/membership/RBAC
- Media upload pipeline
- Platform admin for Review

### Hard for Delivery sandbox (Phase C)

- At least one Placement BFF contract (Discover **or** Watch — OD-16)
- Review-approved inventory
- Token + ingest path
- Emergency stop

### Hard for money (Phase D)

- Billing Account settle path
- OD-05/06/17 closures
- Payment adapter (PROPOSED OD-55)

### Hard for Store promo claims (Rel-5)

- Store conversion events + OD-02/11

### Optional / future

- Search, Profiles, Notifications ads
- Learning, Games
- Live (pilot soft)
- Public Ads API
- Warehouse
- DSP
- AI / Experiments flags

---

## 3. Failure Behavior North Stars

1. **Consumer products never hard-fail** because Ads is down — omit inventory.
2. **Store checkout never blocked** by Ads attribution lag.
3. **Live session never started/stopped** by Ads.
4. **Frozen/unapproved ads never serve**, even if cache stale (prefer empty).

---

## 4. Ownership Boundary Rules

| System | Owns | Must not |
|--------|------|----------|
| Ads | Demand, Delivery eligibility, Ads ledger, Ads attribution credit | Mutate Store orders / Live sessions |
| Store | Catalog, cart, checkout, orders, payments, creator commission | Depend on Ads for checkout |
| Social surfaces | Organic ranking, placement chrome | Silent unlabeled ads |
| Identity | AuthN, age signals | Ads spend authority |

---

## Related Documents

- `01_ARCHITECTURE_REVIEW.md`
- `../04_PLACEMENTS.md` · `../13_ATTRIBUTION_ENGINE.md`
- `../implementation/03_BACKEND_SERVICES_PLAN.md` · `../implementation/06_RELEASE_PLAN.md`
