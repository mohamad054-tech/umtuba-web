# UMTUBA Ads — Implementation Planning V1

**Document type:** Execution planning blueprint (above Ads Design V2)
**Repository:** `umtuba-web`
**Branch context:** `office/ads-design-v2`
**Status:** Planning only — this document does not authorize code, migrations, or schema changes by itself
**Constraint:** No application code, SQL, API schemas, or package changes in this planning slice

---

## 1. Executive Summary

Ads Design V2 freezes the **product and architecture identity** of UMTUBA Ads as an ecosystem demand platform (Social, Store, Live, Learning, Games—not feed-only). Implementation Planning V1 translates that design into a **ordered delivery program**: Foundation → Review → Delivery MVP → Billing → Reporting → AI Optimization.

**Planning stance**

| Layer | Role |
|-------|------|
| Design V2 (`docs/ads/01`–`16`) | Source of truth for concepts, boundaries, and open decisions |
| This roadmap | Phase gates, dependencies, risks, and success criteria for build |
| Existing foundation notes (`../ADS_PLATFORM_FOUNDATION_V1.md`, `../ADS_ADMIN_REVIEW_FOUNDATION_V1.md`) | Early scaffolding already present in-repo; must be **reconciled** with Design V2 terminology and gaps—not treated as full Design V2 delivery |

**North star for implementation:** trustworthy self-serve advertisers, labeled inventory, hard budget ceilings, Review before Delivery, Store as order truth, Ads never mutating checkout/Live sessions.

---

## 2. Current State

### 2.1 Completed in Ads Design V2

| Area | Documents | Outcome |
|------|-----------|---------|
| Vision & philosophy | `../01_PRODUCT_VISION.md` | Ecosystem demand positioning; trust before scale |
| System architecture | `../02_SYSTEM_ARCHITECTURE.md` | Services, Delivery vs management paths, integrations |
| Ad types & placements | `../03_AD_TYPES.md`, `../04_PLACEMENTS.md` | Formats, verticals, Placement Registry model |
| Targeting & budget | `../05_TARGETING.md`, `../06_BUDGET_SYSTEM.md` | Geo→audiences; daily/lifetime; auto-stop; pacing hooks |
| Reporting foundations | `../07_REPORTING.md` | Metrics, funnels, attribution foundations |
| Security | `../08_SECURITY.md` | Review, IVT, RBAC, audit, budget protection |
| Conceptual data model | `../09_DATABASE_BLUEPRINT.md` | Entities without SQL |
| Product roadmap | `../10_FUTURE_ROADMAP.md` | Phased ecosystem activation |
| Enterprise design | `../11_AI_ADVERTISING_ENGINE.md`–`../16_ADS_API_AND_INTEGRATIONS.md` | AI Engine, Asset Library, Attribution, Experiments, Enterprise Reporting, Ads API |

**Design V2 exit (docs):** Stakeholders can implement against a stable Campaign → Ad Group → Ad → Creative spine, with Placement Registry, Billing Account, Attribution, IVT, Review, Audit, and Delivery contracts.

### 2.2 What has not started (or is incomplete relative to Design V2)

| Capability | Status vs Design V2 |
|------------|---------------------|
| Full Design V2 object model in production (Asset Library, Attribution Engine, Experiments, Ads API, Enterprise Reporting marts) | **Not started** as Design V2 scope |
| Live Delivery / Ad Server on Discover & Watch with auction | **Not started** (delivery intentionally disabled in early foundation notes) |
| Real Billing Account charges / prepaid or postpaid settlement | **Not started** (budgets are planning estimates only in foundation notes) |
| Store / Live attribution ledgers per `../13_ATTRIBUTION_ENGINE.md` | **Not started** |
| Creative Asset Library as first-class reusable catalog (`12`) | **Not started** as Design V2 library |
| Public Ads API / webhooks (`16`) | **Not started** |
| AI Advertising Engine assisted mode (`11`) | **Not started** |
| Experiment Platform (`14`) | **Not started** |
| Government / Charity / Jobs / Real Estate vertical packs at scale | **Not started** |
| Closing Open Decisions (auction formula, attribution windows, etc.) | **Still open** — must not be silently decided in code |

### 2.3 Early scaffolding already in the repository *(acknowledge only)*

Prior to / alongside Design V2 documentation, `umtuba-web` contains an **Ads Platform Foundation** and **Admin Review Foundation** (documented under `../ADS_PLATFORM_FOUNDATION_V1.md` and `../ADS_ADMIN_REVIEW_FOUNDATION_V1.md`): advertiser accounts, membership RBAC, campaigns/ad sets/creatives/ads, submit-for-review, admin queues, private creative storage, and metrics *scaffolding*—with **Delivery off** and **no real payments**.

**Planning implication:** Phase A and Phase B are not greenfield in absolute terms. They must:

1. Inventory what exists.
2. Map naming to Design V2 (e.g., Ad Group vs historical “ad set” wording).
3. Close gaps (Asset Library separation, Budget hard-stop semantics, Placement Registry, policy packs).
4. Avoid breaking Watch, Discover, Live, Store, Search, or Auth.

This roadmap does **not** restate those foundation schemas or APIs.

---

## 3. Development Principles

1. **Design V2 is normative** — Implementation follows `01`–`16`; local shortcuts that violate boundaries are defects.
2. **Trust before yield** — Review, RBAC, audit, and budget protection precede auction sophistication.
3. **Delivery fail-closed** — If Ads is unhealthy, surfaces show organic-only; never block core social/commerce.
4. **Money paths are special** — Billing and budget settlement are idempotent, audited, and separate from soft serve checks.
5. **Store owns orders** — Ads attributes; Ads never writes orders, payments, or refunds.
6. **Live owns sessions** — Ads may deep-link; Ads never starts/stops Lives.
7. **No silent Open Decision closure** — Auction formula, attribution defaults, gender packs, prepaid vs postpaid, etc. stay explicit until product/legal decide.
8. **Region policy packs** — Targeting and campaign-class legality are country-gated.
9. **Terminology stability** — Prefer Design V2 terms in new work: Campaign, Ad Group, Ad, Creative, Placement Registry, Advertiser, Billing Account, Attribution, IVT, Review, Audit, Delivery, Budget.
10. **Docs-first for each phase exit** — Each phase should leave a short implementation note under `docs/ads/implementation/` when code ships (future docs); this file is the master plan only.
11. **No provider lock-in in planning** — Billing rails, model vendors, and stream buses remain adapter-shaped.
12. **Reconcile then extend** — Prefer evolving existing foundation over parallel duplicate Ads stacks.

---

## 4. Phase A — Ads Foundation

**Goal:** Stable advertiser tenancy and campaign hierarchy ready for Review and (later) Delivery eligibility—aligned with Design V2.

### Includes

| Workstream | Intent |
|------------|--------|
| **Advertisers** | AdvertiserOrg / advertiser account lifecycle, verification tiers hooks |
| **Accounts** | Billing Account shell (currency, limits placeholders—no real charge yet) |
| **Campaigns** | Objectives, class, dates, status machine per Design V2 |
| **Ad Groups** | TargetingSpec binding, placement set, bid placeholders |
| **Ads** | Type, destination refs (Website/Store/… as allowed in MVP), status |
| **Creatives** | Shape + asset refs; immutability rules for approved creatives |
| **RBAC** | Owner / Admin / Campaign Manager / Analyst / Billing-oriented roles per `08` |
| **Admin Foundation** | Platform-admin gates, operator visibility into accounts/campaigns (not full moderation depth—see Phase B) |

### Explicitly deferred in Phase A

- Serving ads to consumers
- Auction / ranker
- Real money settlement
- AI generation
- Public Ads API
- Full Asset Library productization (may keep simple upload paths)

### Success criteria (Phase A)

- [ ] Advertiser can create hierarchy Campaign → Ad Group → Ad → Creative under RBAC.
- [ ] Unauthorized members cannot mutate foreign tenants.
- [ ] Approved creative edit policy matches Design V2 (revision, not silent mutate).
- [ ] Naming and status vocabulary reconciled with Design V2 docs.
- [ ] No consumer Placement Delivery enabled unless explicitly flagged off by default.
- [ ] Core UMTUBA surfaces unaffected.

---

## 5. Phase B — Review & Moderation

**Goal:** Nothing reaches Delivery eligibility without Review; audit trail is authoritative.

### Includes

- Submit / approve / reject / changes-requested / suspend / restore flows for Advertiser, Campaign, Ad, Creative (as scoped).
- Policy reason codes; appeals hooks (even if UI is minimal).
- Continuous re-review triggers (destination change, spike in user reports—hooks).
- Labeling requirements check (Sponsored / class labels).
- Vertical-sensitive holds (Government/Charity elevated when those classes open).
- Operator queues and SLAs (targets, not necessarily automation).
- Alignment with Fraud/IVT *hooks* (full IVT pipeline can deepen in Phase C/D).

### Depends on

Phase A tenancy + hierarchy + RBAC.

### Success criteria (Phase B)

- [ ] No path to “eligible for Delivery” without approved Review state.
- [ ] Every decision writes Audit / review events with actor.
- [ ] Advertiser roles cannot self-approve.
- [ ] Reject/suspend reasons required where policy demands.
- [ ] Admin surfaces remain platform-admin gated.

---

## 6. Phase C — Delivery Engine MVP

**Goal:** First paid (or pre-billing metered) serve path on a **minimal** Placement Registry set—Discover and/or Watch—with fail-closed behavior.

### Includes

- Placement Registry entries for MVP slots only.
- Ad request → candidate → policy/fraud filters → rank stub → select → tracking tokens.
- Impression / view / click event ingestion with idempotency.
- Soft budget eligibility checks (hard settle may wait for Phase D).
- Frequency caps (basic).
- Feature flag `ADS_DELIVERY_ENABLED` (or equivalent) default safe.
- Degradation: omit ad slots; never break organic feed/player.

### Explicitly deferred

- Full auction formula finalization (Open Decision—use documented stub/rules).
- Live companion, Search, Notifications, Learning, Games inventory.
- External DSP.
- Multi-region active-active.

### Depends on

Phases A + B (only approved, in-date, budget-capable ads).

### Success criteria (Phase C)

- [ ] Controlled cohort sees labeled ads on agreed placements only.
- [ ] Events dedupe; signed tracking tokens validated.
- [ ] Kill switch disables Delivery without deploy drama.
- [ ] No Sev-1 impact on Watch/Discover availability attributable to Ads.
- [ ] IVT obvious bots rejected or marked (v0 acceptable).

---

## 7. Phase D — Billing

**Goal:** Advertiser spend becomes real, governed money—not UI estimates.

### Includes

- Billing Account ledger (minor units).
- Prepaid and/or postpaid per **Open Decision**—implement only the chosen MVP model.
- Billable events from Delivery (CPM/CPC as MVP).
- Credits for IVT / manual ops with dual control.
- Auto-stop on daily/lifetime exhaustion and payment failure.
- Invoices or receipts as appropriate to model.
- Reconciliation hooks for Reporting (Phase E).

### Depends on

Phase C billable event stream; Phase A account shell; Phase B trust (fraud freezes).

### Success criteria (Phase D)

- [ ] No silent overspend beyond documented race tolerance.
- [ ] Idempotent charges; double-charge is P0.
- [ ] Advertiser sees remaining Budget and stop reasons.
- [ ] Ops can freeze accounts; Audit records credits.
- [ ] Ads billing never mutates Store payment objects.

---

## 8. Phase E — Reporting

**Goal:** Honest advertiser and ops metrics from streams/warehouse—not heavy OLTP scans.

### Includes

- MetricDefinition versioning (impressions, views, reach, clicks, CTR, CPC, CPM, spend; conversion hooks as ready).
- Hierarchy + placement + geo/device breakdowns (privacy thresholds).
- Preliminary vs finalized (IVT window).
- Budget pacing views.
- Store attribution **foundation** join if Store contracts ready (else click→PDP only).
- Export CSV / async jobs (API reporting can follow `16` later).
- Enterprise Reporting slices only as needed for MVP honesty—not full `15` on day one.

### Depends on

Phases C–D events + ledger; Attribution Engine design (`13`) for conversion credit rules when enabled.

### Success criteria (Phase E)

- [ ] Advertiser dashboard matches settled spend within agreed freshness SLO.
- [ ] Metric definitions documented and pinned.
- [ ] Small-N suppression on sensitive cuts.
- [ ] No PII user lists in standard exports.
- [ ] Finance can reconcile Billing vs dashboard finalized spend.

---

## 9. Phase F — AI Optimization

**Goal:** Assisted intelligence under human and policy control—not autonomous spend.

### Includes (ordered internally)

1. **Rules first** — fatigue heuristics, underperformance alerts, validators.
2. **Assisted AI** — NL draft, copy variants, localization assist, explainability bundles.
3. **Optimization proposals** — human-approved changes only until Open Decision on auto-apply authority.

### Hard constraints

- No raw PII to models.
- No expansion into prohibited/sensitive targeting.
- No bypass of Review.
- No mutation of running Experiment arms (when Experiments exist).
- Estimates labeled as non-guarantees.
- Model/prompt version audit + kill switch + rollback of campaign objects only.

### Depends on

Phases A–E (signals + creatives + policy). Asset Library (`12`) strongly recommended before heavy generative variants.

### Success criteria (Phase F)

- [ ] Assisted draft → human apply → Review path proven.
- [ ] Explainability present on suggestions.
- [ ] Kill switch disables AI without disabling Delivery.
- [ ] No autonomous budget raise in default policy.
- [ ] Policy filter blocks sensitive expansions in tests.

---

## 10. Dependencies Between Phases

```text
Phase A  Foundation (Advertisers, hierarchy, RBAC, admin shell)
   │
   ▼
Phase B  Review & Moderation ──────────────┐
   │                                         │
   ▼                                         │
Phase C  Delivery Engine MVP                 │
   │                                         │
   ▼                                         │
Phase D  Billing ◄── billable events ────────┤
   │                                         │
   ▼                                         │
Phase E  Reporting ◄── events + ledger ──────┘
   │
   ▼
Phase F  AI Optimization (rules → assisted → proposals)
```

| From → To | Dependency nature |
|-----------|-------------------|
| A → B | Entities and RBAC required to review |
| B → C | Only approved inventory eligible |
| C → D | Billable impressions/clicks required |
| C+D → E | Facts + settled spend for honest metrics |
| A–E → F | Creatives, policy, and performance signals |
| Store/Live contracts → E (attribution depth) | External; may lag—plan click-only interim |
| Open Decisions → C/D/E | Auction, windows, prepaid/postpaid gate depth of each phase |

**Parallelism (limited):** Documentation, policy pack drafts, and Placement UX specs may proceed in parallel with A/B. Consumer Delivery UI behind flags may be stubbed during B but must not serve unpaid unreviewed ads.

---

## 11. Rollout Strategy

| Stage | Approach |
|-------|----------|
| **Internal dogfood** | Platform employees / test advertisers only |
| **Closed pilot** | Invited SMB/sellers; Delivery flag on for cohort |
| **Regional expand** | One or two countries; policy packs validated |
| **Self-serve widen** | After Review SLA and IVT thresholds met |
| **Surface expand** | Discover/Watch first; then Store/Search/Live per Design roadmap |

**Release tactics**

- Feature flags per phase capability (Delivery, Billing charge, AI assist).
- Kill switches independent for Delivery vs Billing settle vs AI.
- Prefer additive migrations and reversible flags when implementation begins (not in this planning doc).
- Do not couple Ads rollout to unrelated Store marketplace branch merges.

**Comms**

- Advertiser UI must state planning-only vs real charges clearly during pre-Billing phases.
- Sponsored labels mandatory from first consumer impression.

---

## 12. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dual naming (foundation vs Design V2) confuses implementers | Rework, bugs | Explicit mapping in Phase A exit; prefer Design terms going forward |
| Enabling Delivery before Review hardened | Trust / legal | Phase gate B → C; default Delivery off |
| Budget race overspend | Advertiser harm | Soft serve + hard settle; documented tolerance (Open Decision) |
| Attribution conflict with Creator commerce | Double promises | Keep ledgers separate; defer defaults |
| Fraud / fake clicks on MVP | Budget drain | Signed tokens, velocity IVT, freeze APIs |
| Scope creep (verticals, DSP, AI auto) | Delay MVP | Out of Scope + phase fences |
| Coupling to Store checkout changes | Blocked Ads | Contract-only integration; never own orders |
| Open Decisions closed silently in code | Policy debt | Checklist in PR/docs; reject silent closures |
| Performance regression on Watch/Discover | Platform Sev-1 | Isolation, timeouts, fail-omit ads |
| Local unrelated dirty files on branch | Bad commits | Keep Ads work docs/code scoped; ignore unrelated app dirt |

---

## 13. Success Criteria Summary (All Phases)

| Phase | One-line exit |
|-------|----------------|
| **A** | Multi-tenant hierarchy + RBAC aligned to Design V2; Delivery still off by default |
| **B** | Review mandatory; audit complete; no self-approve |
| **C** | Labeled MVP Delivery on agreed placements with kill switch |
| **D** | Real ledger charges/credits; auto-stop; no Store payment mutation |
| **E** | Honest dashboards; preliminary/final; reconcilable spend |
| **F** | Assisted AI with human approval; policy blocks; kill switch |

**Program-level success (post F):** Advertisers retain spend with measurable CTR/CPC (and CPA when attribution ready); user hide/report rates stable; IVT within pilot threshold; Design V2 open decisions either closed formally or still explicitly open.

---

## 14. Open Decisions Registry (Canonical)

**Authority:** This section is the **canonical registry** for Ads Implementation Planning V1. Documents `02`–`06` reference IDs here and may add domain-only rows; they must not invent conflicting finals.

**Terminology bridge (not an open rename of Design V2):** Prefer Design V2 terms **Campaign**, **Ad Group**, **Ad**, **Creative**, **Placement**, **Advertiser** (org), **Billing Account**, **Impression**, **View**, **Click**, **Conversion**, **Attribution**, **Budget**, **Pacing**, **Moderation/Review**, **Fraud/IVT**, **Platform admin**, **Store seller**, **Creator**. Historical scaffolding “ad set” / `advertiser_accounts` are compatibility names only until reconciliation (OD-15).

| ID | Question | Options | Recommendation | Owner | Phase | Blocking? |
|----|----------|---------|----------------|-------|-------|-----------|
| OD-01 | Auction / ranking formula? | Rules stub; bid×pValue×quality ML; hybrid | Ship **rules stub** until measured; keep pluggable | Eng + Product | C+ | **Blocking** for scaled yield; non-blocking for Delivery sandbox with stub |
| OD-02 | Paid vs organic attribution credit when both touch a purchase? | Last paid click only; dual ledger; priority table with creator commission | **Dual ledger** (ads reporting ≠ creator commission); do not invent single credit | Product + Store + Finance | E / Rel-5 | **Blocking** for Store promo beta claims |
| OD-03 | Gender / sensitive targeting by country? | Off globally; policy packs per country; allow with bans on housing/jobs/credit | **Policy packs**; default restrictive | Legal + T&S + Product | A+ | **Blocking** for public geo launch |
| OD-04 | Political advertising beyond Government class? | Ban; allow with elevated review; region-only | **Default off** until Legal closes | Legal + T&S | Rel-8 | **Blocking** for any political enablement |
| OD-05 | Billing MVP model? | Prepaid only; postpaid/invoice; hybrid | **Prepaid-only candidate** for closed beta | Finance + Product | D / Rel-4 | **Blocking** for real settle |
| OD-06 | Budget overshoot SLA / tolerance? | 0; fixed minor units; small % | Document numeric SLA before settle-on | Finance + Eng | D | **Blocking** for settle |
| OD-07 | Creator / Live inventory revenue share? | Defer; platform-only; host-sold split | **Defer**; no UI promises | Product + Live + Finance | Rel-7 | Non-blocking for Live pilot if share UI off |
| OD-08 | External DSP demand? | None; certified only later | **None** through Public MVP | Product + Sec | Rel-9+ | Non-blocking MVP |
| OD-09 | Viewability / IVT numeric thresholds? | TBD numbers per placement | Set before finalize metrics / billable views | Eng + Trust | C–E | **Blocking** for finalized view billing |
| OD-10 | Regional data residency topology? | Single region; region-primary; active-active | Decide before multi-region public | Eng + Legal | Rel-8 | **Blocking** for residency-sensitive geos |
| OD-11 | Default attribution windows? | Click/view days per objective | Pin versions; publish defaults at E | Product + Eng | E | **Blocking** for conversion CPA honesty |
| OD-12 | AI automatic optimization authority? | Human-only; limited auto; broad auto | **Human-only by default** | Product + Sec | F / Rel-10 | **Blocking** if any auto-apply on |
| OD-13 | Experiment statistical framework? | Frequentist; Bayesian; bandit | Defer; no auto-winner | Product + Eng | F+ | Non-blocking until Experiments flag |
| OD-14 | API partner eligibility & pricing? | Internal only; certified tiers | Cert program before GA | Product + Legal + Sec | Rel-9 | **Blocking** for public API GA |
| OD-15 | Ad Group naming vs scaffolding “ad set”? | Rename UX+DB; UX rename + DB shim; keep both labels | **UX Design terms + DB shim** | Eng | A | Non-blocking if mapped |
| OD-16 | First consumer Placement for Delivery MVP? | Discover sponsored; Watch between-videos; both | Pick one for sandbox, then expand | Product + Eng | C / Rel-3 | **Blocking** for Delivery sandbox |
| OD-17 | Min advertiser verification before real Billing? | Email-only; business verify; KYC tier | Business verify before settle | Trust + Finance | Rel-4 | **Blocking** for settle beta |
| OD-18 | Review staffing SLA owner (closed pilot)? | T&S; Product ops; outsource | Name owner before Rel-4 | T&S + Product | Rel-2–4 | **Blocking** for external beta |
| OD-19 | Monolith modules vs extracted services timing? | Stay modular monolith; extract G/H early | **Monolith seams first**; extract on metrics | Eng | C+ | Non-blocking |
| OD-20 | Queue / job provider? | In-process; managed queue; custom | Decide before heavy async (assets/settle) | Eng | C–D | **Blocking** for production settle workers |
| OD-21 | Reporting warehouse vs Postgres-only? | Postgres rollups; warehouse later; warehouse now | **Postgres MVP**; warehouse later | Eng + Data | E / Rel-8 | Non-blocking MVP |
| OD-22 | Realtime transport for console? | Poll; SSE; product realtime channel | **Poll/short query MVP** | Eng + Frontend | Rel-1+ | Non-blocking |
| OD-23 | Exact advertiser/admin route naming? | Keep advertise-style; rename Design paths | Decide before Public MVP bookmarks | Product + Frontend | Rel-1–8 | Non-blocking alpha |
| OD-24 | Charting library? | TBD among approved stack options | Pick at Reporting UI slice | Frontend | E | Non-blocking if tables-first |
| OD-25 | Form library? | TBD among approved stack options | Pick at Wizard slice | Frontend | A | Non-blocking if consistent |
| OD-26 | Autosave behavior? | Explicit save; debounced draft; hybrid | **Server draft + explicit submit** | Product + Frontend | A | Non-blocking |
| OD-27 | Mobile parity at Public MVP? | Desktop-class; mobile usable; mobile full | **Mobile usable, desktop powerful** | Product + Frontend | Rel-8 | Non-blocking if disclosed |
| OD-28 | Agency multi-account UX timing? | MVP; Phase 9; never | **Phase 9** | Product | Rel-9 | Non-blocking MVP |
| OD-29 | AI suggestion placement in UI? | Wizard; side panel; both | Side panel + optional wizard assist | Product + Frontend | F | Non-blocking |
| OD-30 | Admin console separation? | In-app `/admin`; isolated host | **In-app admin gate** first | Eng + Sec | Rel-2 | Non-blocking |
| OD-31 | Billing UX depth in MVP? | Status-only; top-up; full invoices | Status + prepaid top-up when OD-05 closes | Product + Finance | Rel-4–8 | Tied to OD-05 |
| OD-32 | Attribution model selector in Reporting UI? | Hidden (platform default); advertiser choice | **Hidden default** until OD-11 pinned | Product | E | Non-blocking |
| OD-33 | Restricted-account report access? | Read reports; block all; support-only | **Read-only reports; mutate blocked** | Product + Trust | Rel-4 | Non-blocking |
| OD-34 | Test coverage % thresholds? | None; risk-based; hard % | **Risk-based gates** (`05`) | Eng + QA | All | Non-blocking |
| OD-35 | E2E framework adoption depth? | Expand Playwright; other | Prefer existing Playwright ecosystem | Eng + QA | Rel-3+ | Non-blocking |
| OD-36 | Load-testing tool? | TBD | Pick before Rel-6 widen | Eng | Rel-3+ | Non-blocking sandbox |
| OD-37 | Browser/device QA matrix? | TBD | Define before Rel-8 | QA | Rel-8 | Non-blocking alpha |
| OD-38 | Synthetic production checks? | None; read-only probes; full synthetic | Read-only + careful synthetic | Eng + Sec | Rel-8 | Non-blocking |
| OD-39 | Staging data volume? | Tiny; medium; prod-like | Medium synthetic | Eng | Rel-4 | Non-blocking |
| OD-40 | Chaos-testing depth? | None; staging only; continuous | Staging drills first | Eng | Rel-3+ | Non-blocking |
| OD-41 | Warehouse test environment? | N/A until OD-21 | With OD-21 | Data Eng | E+ | Non-blocking |
| OD-42 | AI quality benchmark methodology? | TBD | After safety gates | Product + Eng | F | Non-blocking |
| OD-43 | Ad-serving latency SLO number? | TBD ms | Set before Rel-6 expand | Eng | Rel-3–6 | **Blocking** for widen |
| OD-44 | Reporting freshness SLA number? | TBD | Set before Rel-8 | Eng + Product | E–8 | **Blocking** for Public MVP claims |
| OD-45 | Launch countries for Public MVP? | TBD list | Legal+Product approval per geo | Product + Legal | Rel-8 | **Blocking** Public MVP |
| OD-46 | Exact MVP placement set? | Subset of Discover/Watch/(Store) | Close with OD-16 then expand list | Product | Rel-3–8 | **Blocking** each widen |
| OD-47 | Event table partitioning threshold? | None until volume; early partition | **Defer** until justified | Eng | G+ | Non-blocking |
| OD-48 | Physical table naming family? | `ads_*`; split prefixes; hybrid | Pick in first Design-aligned migration | Eng | A | Non-blocking if consistent |
| OD-49 | Public API auth primary mode? | API keys; OAuth; both | Keys near-term; OAuth later (`16`) | Eng + Sec | Rel-9 | **Blocking** API GA |
| OD-50 | Cross-org agency asset sharing? | None; explicit grants; vault | **None** until Rel-9 | Product + Sec | Rel-9 | Non-blocking MVP |

**Rule:** PRs must not close Blocking ODs silently. Closing requires owner sign-off recorded in release notes / decision log.

---

## 15. Out of Scope (This Planning Program / Near-Term)

- Implementing or modifying `app/`, `lib/`, `supabase/`, migrations, packages, or tests **as part of this documentation task**.
- Force-closing Open Decisions.
- Full Enterprise Reporting mart (`15`) on day one of Phase E.
- Public Ads API GA (`16`).
- Experiment Platform GA (`14`).
- Rewarded/playable ads, Notifications push ads, Audio formats.
- Partner DSP onboarding.
- Replacing Store promotions/coupons with Ads.
- Merging this branch’s planning work into unrelated Store or Live feature branches.
- Any commit/push implied by this document alone.
- Cleaning or committing unrelated local changes (e.g., Discover UI files).

---

## Related Documents

- Design spine: `../01_PRODUCT_VISION.md` … `../16_ADS_API_AND_INTEGRATIONS.md`
- Early scaffolding notes: `../ADS_PLATFORM_FOUNDATION_V1.md`, `../ADS_ADMIN_REVIEW_FOUNDATION_V1.md`
- Product-phase narrative: `../10_FUTURE_ROADMAP.md`
- Implementation series:
  - `02_DATABASE_MIGRATIONS_PLAN.md`
  - `03_BACKEND_SERVICES_PLAN.md`
  - `04_FRONTEND_PLAN.md`
  - `05_TESTING_PLAN.md`
  - `06_RELEASE_PLAN.md`

---

## Design Completeness Checklist (This Doc)

- [x] Executive summary and current state (Design V2 done vs not started)
- [x] Development principles
- [x] Phases A–F with intent and success criteria
- [x] Dependencies and rollout
- [x] Risks, canonical Open Decisions Registry, out of scope
- [x] No code, SQL, or API schemas
- [x] Terminology aligned with Design V2
