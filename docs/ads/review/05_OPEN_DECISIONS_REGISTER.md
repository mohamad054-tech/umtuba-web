# UMTUBA Ads — Open Decisions Register (Review)

**Document type:** Production readiness review — decisions consolidation
**Canonical source:** [`../implementation/01_IMPLEMENTATION_ROADMAP.md`](../implementation/01_IMPLEMENTATION_ROADMAP.md) §14 (OD-01…OD-50)
**Rule:** This review **does not** replace or renumber the canonical registry. New items are **PROPOSED** only.

---

## 1. Review Method

- Compared canonical OD-01…OD-50 to Design V2 (`../01_PRODUCT_VISION.md`–`../16_ADS_API_AND_INTEGRATIONS.md`) and Implementation `01`–`06`.
- Checked domain excerpts in `02`–`06` for conflicts with canonical recommendations.
- Searched for decisions implied in prose without IDs.

**Review status legend:** `Confirmed` · `Needs owner assignment` · `Conflict` · `PROPOSED`

---

## 2. Canonical Register (OD-01…OD-50) — Review View

| ID | Question (short) | Affected components | Options | Recommendation | Owner | Phase | Blocking? | Dependencies | Risk if delayed | Sources | Review status |
|----|------------------|---------------------|---------|----------------|-------|-------|-----------|--------------|-----------------|---------|---------------|
| OD-01 | Auction/ranking formula | Serving, Eligibility, yield | Stub; ML; hybrid | Stub first | Eng + Product | C+ | Scaled yield | Delivery sandbox | Wrong bids / delay widen | `../02`, `03` backend | Confirmed |
| OD-02 | Paid vs organic credit | Attribution, Store, Creator | Last paid; dual ledger; priority | Dual ledger | Product + Store + Finance | E/Rel-5 | Store claims | Store events | Double promises | `../13`, impl `01` | Confirmed |
| OD-03 | Sensitive targeting packs | Targeting, Eligibility, Legal | Off; packs; allow | Restrictive packs | Legal + T&S + Product | A+/Rel-8 | Public geo | Region launches | Legal exposure | `../05`, `08` | Needs owner assignment |
| OD-04 | Political ads | Review, Policy | Ban; allow; region | Default off | Legal + T&S | Rel-8 | If enabling | OD-03 | Regulatory | `../03`, `08` | Needs owner assignment |
| OD-05 | Prepaid vs postpaid | Billing, Finance UX | Prepaid; postpaid; hybrid | Prepaid candidate | Finance + Product | D/Rel-4 | Settle | Payment adapter | Wrong money model | `../06`, release | Needs owner assignment |
| OD-06 | Overshoot SLA | Billing, Eligibility | 0; fixed; % | Numeric before settle | Finance + Eng | D | Settle | OD-05 | Overspend Sev | `../06` | Needs owner assignment |
| OD-07 | Creator/Live revenue share | Live Ads, Finance | Defer; platform; split | Defer | Product + Live + Finance | Rel-7 | If UI promises | Live pilot | Partner conflict | `../10`, release | Confirmed |
| OD-08 | External DSP | Demand, Sec | None; certified | None through MVP | Product + Sec | Rel-9+ | Non-block MVP | — | Scope creep | `../16` | Confirmed |
| OD-09 | Viewability/IVT thresholds | Ingest, Billing, Reporting | Per-placement numbers | Set before finalize views | Eng + Trust | C–E | View billing | Delivery events | Dishonest metrics | `../07`, `08` | Needs owner assignment |
| OD-10 | Data residency | Infra, DB, Legal | Single; primary; AA | Before sensitive geos | Eng + Legal | Rel-8 | Sensitive geos | OD-45 | Non-compliance | `../08`, migrations | Needs owner assignment |
| OD-11 | Attribution windows | Attribution, Reporting | Days per objective | Pin versions at E | Product + Eng | E | CPA honesty | OD-02 | Irreproducible CPA | `../13` | Needs owner assignment |
| OD-12 | AI auto-optimize authority | AI, Budget | Human; limited; broad | Human-only default | Product + Sec | F/Rel-10 | If auto on | Reporting honesty | Silent spend | `../11` | Confirmed |
| OD-13 | Experiment stats framework | Experiments | Freq; Bayes; bandit | Defer; no auto-winner | Product + Eng | F+ | Non-block until flag | M16 | Misuse of significance | `../14` | Confirmed |
| OD-14 | API partner eligibility | Ads API | Internal; cert tiers | Cert before GA | Product + Legal + Sec | Rel-9 | API GA | M14 | Partner abuse | `../16` | Needs owner assignment |
| OD-15 | Ad Group vs ad_set shim | DB, UX, domain | Rename; shim; both | UX terms + DB shim | Eng | A | Non-block if mapped | M01 | Dual schema chaos | Foundation notes | Confirmed |
| OD-16 | First Delivery placement | Serving, Discover/Watch | Discover; Watch; both | Pick one for sandbox | Product + Eng | C/Rel-3 | Sandbox | Placement BFF | Blocked Delivery | `../04`, release | Needs owner assignment |
| OD-17 | Verification before Billing | Trust, Billing | Email; business; KYC | Business verify | Trust + Finance | Rel-4 | Settle beta | OD-05 | Fraudulent advertisers | `../08` | Needs owner assignment |
| OD-18 | Review staffing SLA owner | T&S ops | T&S; Product ops; outsource | Name before Rel-4 | T&S + Product | Rel-2–4 | External beta | M05 | Queue collapse | Release plan | Needs owner assignment |
| OD-19 | Monolith vs extract | Serving/Ingest deploy | Monolith; early extract | Seams first | Eng | C+ | Non-block | Metrics | Premature microservices | Backend plan | Confirmed |
| OD-20 | Queue/provider | Jobs, settle, assets | In-process; managed; custom | Before prod workers | Eng | C–D | Prod settle workers | M08–M10 | Lost jobs | Backend/migrations | Needs owner assignment |
| OD-21 | Warehouse vs Postgres | Reporting | PG; later WH; now WH | Postgres MVP | Eng + Data | E/Rel-8 | Non-block MVP | M09 | Scale pain later | `../15` | Confirmed |
| OD-22 | Realtime console transport | Frontend | Poll; SSE; channel | Poll MVP | Eng + Frontend | Rel-1+ | Non-block | — | Over-engineering | Frontend plan | Confirmed |
| OD-23 | Route naming | Frontend | advertise-style; rename | Before Public MVP bookmarks | Product + Frontend | Rel-1–8 | Non-block alpha | — | Broken bookmarks | Frontend/foundation | Needs owner assignment |
| OD-24 | Chart library | Reporting UI | Stack options | At Reporting UI | Frontend | E | Non-block tables-first | M09 | Delay charts | Frontend | Needs owner assignment |
| OD-25 | Form library | Wizard | Stack options | At Wizard | Frontend | A | Non-block | M03 | Inconsistent forms | Frontend | Needs owner assignment |
| OD-26 | Autosave | Wizard | Explicit; debounce; hybrid | Server draft + explicit submit | Product + Frontend | A | Non-block | M03 | Draft loss | Frontend | Confirmed |
| OD-27 | Mobile parity Public MVP | Frontend | Desktop; usable; full | Usable mobile / strong desktop | Product + Frontend | Rel-8 | Non-block if disclosed | M14 | Support load | Frontend/release | Confirmed |
| OD-28 | Agency multi-account UX | Frontend, Account | MVP; Phase 9; never | Phase 9 | Product | Rel-9 | Non-block MVP | OD-50 | Scope creep | Frontend | Confirmed |
| OD-29 | AI suggestion placement | AI UX | Wizard; panel; both | Panel + optional wizard | Product + Frontend | F | Non-block | M17 | Weak assist UX | `../11`, frontend | Confirmed |
| OD-30 | Admin console separation | Admin | In-app; isolated host | In-app gate first | Eng + Sec | Rel-2 | Non-block | M05 | Sec boundary confusion | Frontend/admin | Confirmed |
| OD-31 | Billing UX depth MVP | Billing UI | Status; top-up; invoices | Tied to OD-05 | Product + Finance | Rel-4–8 | Tied OD-05 | OD-05 | Confused advertisers | Frontend | Confirmed |
| OD-32 | Attribution model selector UI | Reporting | Hidden; advertiser choice | Hidden until OD-11 | Product | E | Non-block | OD-11 | Misleading comparisons | `../15` | Confirmed |
| OD-33 | Restricted account reports | Frontend, Trust | Read; block; support | Read-only; mutate blocked | Product + Trust | Rel-4 | Non-block | — | Support edge cases | Frontend | Confirmed |
| OD-34 | Coverage % thresholds | QA | None; risk; hard % | Risk-based | Eng + QA | All | Non-block | — | Fake quality | Testing plan | Confirmed |
| OD-35 | E2E framework depth | QA | Playwright expand; other | Prefer Playwright | Eng + QA | Rel-3+ | Non-block | — | Slow CI | Testing | Confirmed |
| OD-36 | Load tool | Perf | TBD tools | Before Rel-6 | Eng | Rel-3+ | Non-block sandbox | M12 | Blind widen | Testing | Needs owner assignment |
| OD-37 | Browser/device matrix | QA | TBD | Before Rel-8 | QA | Rel-8 | Non-block alpha | M14 | Late a11y/device bugs | Testing | Needs owner assignment |
| OD-38 | Synthetic prod checks | Ops/Sec | None; probes; full | Read-only + careful | Eng + Sec | Rel-8 | Non-block | M14 | Undetected prod drift | Testing/release | Confirmed |
| OD-39 | Staging data volume | Eng | Tiny; medium; prod-like | Medium synthetic | Eng | Rel-4 | Non-block | — | Weak soak | Testing | Confirmed |
| OD-40 | Chaos depth | Ops | None; staging; continuous | Staging drills | Eng | Rel-3+ | Non-block | M07 | Untested failure | Testing/release | Confirmed |
| OD-41 | Warehouse test env | Data | With OD-21 | With OD-21 | Data Eng | E+ | Non-block | OD-21 | — | Testing | Confirmed |
| OD-42 | AI quality benchmarks | AI | TBD method | After safety | Product + Eng | F | Non-block | M17 | Subjective ship | `../11`, testing | Needs owner assignment |
| OD-43 | Serve latency SLO | Serving | TBD ms | Before Rel-6 | Eng | Rel-3–6 | Widen | M07/M12 | Perf regressions | Backend/release | Needs owner assignment |
| OD-44 | Reporting freshness SLA | Reporting | TBD | Before Rel-8 | Eng + Product | E–8 | Public MVP claims | M09 | Dishonest dashboards | `../15`, release | Needs owner assignment |
| OD-45 | Launch countries | Compliance | TBD list | Per-geo approval | Product + Legal | Rel-8 | Public MVP | OD-03/10 | Illegal launch | Release | Needs owner assignment |
| OD-46 | MVP placement set | Placements | Subset Discover/Watch/Store | After OD-16 expand | Product | Rel-3–8 | Each widen | OD-16 | Scope creep | `../04`, release | Needs owner assignment |
| OD-47 | Partition threshold | Events DB | None until volume; early | Defer | Eng | G+ | Non-block | M08 | Premature complexity | Migrations | Confirmed |
| OD-48 | Physical naming family | DB | ads_*; split; hybrid | Pick at first Design migration | Eng | A | Non-block if consistent | M01 | Chaos naming | Migrations | Needs owner assignment |
| OD-49 | Public API auth mode | Ads API | Keys; OAuth; both | Keys near-term | Eng + Sec | Rel-9 | API GA | OD-14 | Auth churn | `../16` | Confirmed |
| OD-50 | Cross-org asset sharing | Asset Library | None; grants; vault | None until Rel-9 | Product + Sec | Rel-9 | Non-block MVP | OD-28 | Data leak | `../12` | Confirmed |

---

## 3. Findings

### 3.1 Missing decisions (proposed)

| Proposed ID | Question | Why needed | Suggested phase | Blocking? |
|-------------|----------|------------|-----------------|-----------|
| **OD-51 PROPOSED** | Who owns MetricDefinition versions and advertiser-facing changelog? | Reporting honesty (`../07`, `../15`) | E | Soft→Yes for Public MVP claims |
| **OD-52 PROPOSED** | Soft vs hard budget counter reconciliation interval / job cadence? | Prevent silent drift | D | Soft→Yes with settle |
| **OD-53 PROPOSED** | Depth of consumer “Why this ad” / ad topic controls? | Privacy/UX (`../05`, `08`) | Rel-6–8 | Soft (legal may elevate) |
| **OD-54 PROPOSED** | Brand-safety adjacent-content signal contract with Social? | Suitability floors (`../04`, `08`) | Rel-6 | Soft→Yes before Social widen |
| **OD-55 PROPOSED** | Ads billing payment provider adapter selection? | Settle path needs rail | D/Rel-4 | **Yes** for settle (with OD-05) |

Mark **PROPOSED — not yet canonical**. Do not renumber OD-01…50.

### 3.2 Duplicates

Domain tables in Implementation `02`–`06` correctly **reference** canonical IDs — not duplicates. No conflicting second registry found in Design V2 (Design lists opens narratively; Implementation canonicalizes them).

### 3.3 Hidden in prose (now captured or proposed)

| Topic | Was | Action |
|-------|-----|--------|
| Restricted-account report access | Frontend TBD | Canonical OD-33 |
| Payment provider for Ads | Implied only | **OD-55 PROPOSED** |
| Metric changelog ownership | Implied in reporting docs | **OD-51 PROPOSED** |
| Brand-safety content signals | Placement brand_safety floor without Social contract | **OD-54 PROPOSED** |
| Budget recon cadence | Soft vs hard checks | **OD-52 PROPOSED** |

### 3.4 Conflicting recommendations

| Topic | Assessment |
|-------|------------|
| Prepaid “candidate” vs postpaid Open | **No conflict** — candidate recommendation, Finance must close OD-05 |
| Stub auction vs “fair auction” vision | **No conflict** — stub for sandbox; formula before widen |
| Foundation “implemented” vs Design “not started” | **Ambiguity for engineers** — mitigated by M01 + OD-15; not an OD conflict |

### 3.5 Can defer (non-blocking through Public MVP if flagged off)

OD-07, OD-08, OD-13, OD-14, OD-21 (warehouse), OD-28, OD-41, OD-42, OD-49, OD-50, most AI/Experiment items if flags off.

### 3.6 Required before Phase A engineering start

| Must address | How |
|--------------|-----|
| OD-15, OD-48 | Agree approach in M01 (need not fully rename) |
| OD-25 | Can pick at Wizard start (non-blocking) |
| Owner names for Needs owner assignment rows | Phase 0 governance |

Phase A can start without closing OD-05/16, but those block later milestones.

### 3.7 Required before public launch (Rel-8)

**Blocking set:** OD-03, OD-04 (if any political path), OD-05 (if charging), OD-06, OD-09 (if billing views), OD-10 (if residency geos), OD-11 (if conversion claims), OD-16→OD-46, OD-17, OD-18, OD-43, OD-44, OD-45, plus **OD-55 PROPOSED** if settle live.

---

## 4. Decision Hygiene Recommendations

1. Assign named humans to every “Needs owner assignment” row in Phase 0.
2. Promote OD-51…55 only via PR editing canonical `01` §14 (not by silent use).
3. Reject implementation PRs that close Blocking ODs without decision log.
4. Keep Design V2 narrative opens pointed at OD IDs when docs are next edited (out of scope for this review task).

---

## Related Documents

- Canonical: [`../implementation/01_IMPLEMENTATION_ROADMAP.md`](../implementation/01_IMPLEMENTATION_ROADMAP.md) §14
- `01_ARCHITECTURE_REVIEW.md` · `04_IMPLEMENTATION_SEQUENCE.md` · `06_PRODUCTION_CHECKLIST.md`
