# UMTUBA Ads — Architecture Review

**Document type:** Production readiness review — architecture
**Branch context:** `office/ads-design-v2`
**Status:** Review only — does **not** claim Ads Design V2 or Implementation Planning are implemented in production
**Sources:** `../01_PRODUCT_VISION.md`–`../16_ADS_API_AND_INTEGRATIONS.md`, `../implementation/01_IMPLEMENTATION_ROADMAP.md`–`../implementation/06_RELEASE_PLAN.md`, early scaffolding notes `../ADS_PLATFORM_FOUNDATION_V1.md`, `../ADS_ADMIN_REVIEW_FOUNDATION_V1.md`

---

## 1. Executive Assessment

Ads documentation presents a coherent **ecosystem demand platform** (not feed-only), with a stable Campaign → Ad Group → Ad → Creative spine, Placement Registry, Review-before-Delivery, Billing Account ledgers, Attribution Bridge, and fail-closed serve path.

**Verdict (architecture design):** Strong and implementation-ready as a design package.
**Verdict (runtime production):** **Not ready** — most Design V2 capabilities remain planned; early foundation scaffolding must be reconciled (OD-15) and Delivery/Billing remain gated.

Overall architecture readiness for **starting Phase A engineering**: **Ready with known risks**.
Overall architecture readiness for **public launch**: **Not ready** until release phases and blocking Open Decisions close (see `05_OPEN_DECISIONS_REGISTER.md`, `06_PRODUCTION_CHECKLIST.md`).

---

## 2. Architecture Strengths

| Strength | Evidence |
|----------|----------|
| Clear management vs data vs analytics planes | `../02_SYSTEM_ARCHITECTURE.md`, `../implementation/03_BACKEND_SERVICES_PLAN.md` |
| Trust rails first-class (Review, IVT, audit, freezes) | `../08_SECURITY.md`, Release Phases 2–4 in `../implementation/06_RELEASE_PLAN.md` |
| Money path discipline (minor units, idempotent settle, append-only) | `../06_BUDGET_SYSTEM.md`, migrations plan E |
| Hot path isolation (no heavy reporting on serve) | Services F/G vs I in backend plan |
| Store/Live ownership boundaries explicit | Vision + Attribution Engine |
| Canonical Open Decisions registry OD-01…50 | `../implementation/01_IMPLEMENTATION_ROADMAP.md` §14 |
| Staged release with kill switches | `../implementation/06_RELEASE_PLAN.md` |
| Testing matrix maps to phases | `../implementation/05_TESTING_PLAN.md` |

---

## 3. Architectural Risks

| ID | Severity | Component | Evidence | Impact | Recommendation | Blocking? | Phase |
|----|----------|-----------|----------|--------|----------------|-----------|-------|
| AR-01 | **High** | Scaffolding vs Design V2 dual model | Foundation notes + OD-15 | Parallel schemas / naming drift | Inventory + shim before new slices | Non-blocking for docs; **blocking** messy Phase A without plan | A |
| AR-02 | **High** | Auction undefined | OD-01 | Wrong yield or delayed Delivery widen | Rules stub for sandbox; freeze formula before Rel-6 | Blocking scaled yield | C+ |
| AR-03 | **High** | Attribution paid vs organic | OD-02, `../13_ATTRIBUTION_ENGINE.md` | Double promises to advertisers/creators | Dual ledger; no single-credit UI | Blocking Store promo claims | E / Rel-5 |
| AR-04 | **High** | Budget overshoot SLA unset | OD-06 | Advertiser trust / finance incidents | Numeric SLA before settle-on | Blocking settle | D |
| AR-05 | **Medium** | Hot-path dependency fan-out | Eligibility reads many states | Timeout → empty OK, but fill collapse | Cache + fail-closed SLO (OD-43) | Blocking widen | Rel-3–6 |
| AR-06 | **Medium** | Event volume without partition plan | OD-47, migrations G | DB pressure | Defer partition; set retention early | Non-blocking MVP | G+ |
| AR-07 | **Medium** | Queue provider undecided | OD-20 | Settle/asset jobs fragile | Choose before prod workers | Blocking prod settle workers | C–D |
| AR-08 | **Low** | Monolith extraction timing | OD-19 | Premature microservices cost | Seams first | Non-blocking | C+ |
| AR-09 | **Medium** | Policy packs incomplete | OD-03/04/45 | Legal launch risk | Close before Rel-8 | Blocking public geo | Rel-8 |
| AR-10 | **Low** | Warehouse timing | OD-21 | Reporting scale | Postgres MVP | Non-blocking | E |

---

## 4. Service and Module Boundaries

Reviewed against backend services A–M (`../implementation/03_BACKEND_SERVICES_PLAN.md`).

| Assessment | Notes |
|------------|-------|
| **Clear** | Account, Campaign, Creative, Review, Budget, Eligibility, Serving, Ingest, Reporting, Attribution, Experiment, AI, Admin |
| **Good non-responsibilities** | Ads does not own Store orders / Live sessions |
| **Risk** | Server Actions must stay thin orchestrators (documented); privilege creep is an implementation risk, not a design gap |
| **Risk** | Eligibility + Serving must not call Reporting pipeline (called out; needs test guard `05` suite I) |

---

## 5. Scalability Review

| Area | Design posture | Gap |
|------|----------------|-----|
| Ad serve QPS | Region pools, degrade empty | Latency SLO numeric open (OD-43) |
| Events | Append + rollups; partition later | Retention jobs not specified as milestone detail |
| Multi-tenant advertisers | Org partition mindset | Agency multi-account deferred (OD-28) |
| Live peaks | Isolated companion inventory | Live pilot share unresolved (OD-07) |
| Reports | Eventual; warehouse optional | Freshness SLA open (OD-44) |

---

## 6. Hot-Path Review

Serve path (Placement BFF → Eligibility → Rank stub → Creative + token → async ingest) is correctly designed as **latency-sensitive and fail-closed**.

| Issue | Severity | Recommendation |
|-------|----------|----------------|
| Ranker/auction unknown | High for yield | Stub OK for sandbox |
| Token crypto/ops detail | Medium | Specify in Delivery milestone security work |
| Cache serving frozen ads | High if mishandled | Short TTL + invalidation on freeze (backend plan §13) |
| Consumer placement chrome | Out of Ads console scope | Product-owned per `../04_PLACEMENTS.md` — dependency contract needed |

---

## 7. Event and Reporting Pipeline Review

| Strength | Gap |
|----------|-----|
| Preliminary vs finalized | Numeric IVT/viewability thresholds open (OD-09) |
| Idempotent ingest | Worker/provider open (OD-20) |
| Attribution version pins | Windows open (OD-11) |
| No OLTP-heavy dashboards | Warehouse decision open (OD-21) |

---

## 8. Financial Integrity Review

Design is strong: minor units, append-only BillingEvent/CreditEvent, RPC-only ledger writes, freeze/auto-stop.

| Gap | Blocking for |
|-----|----------------|
| OD-05 prepaid vs postpaid | Real settle |
| OD-06 overshoot SLA | Settle-on |
| OD-17 verification bar | Settle beta |
| Payment adapter choice for Ads billing | Not in OD-01…50 — see **PROPOSED OD-55** in decisions register |

---

## 9. Security and Privacy Review

Design covers RLS fail-closed, platform admin gates, no self-approve, signed tokens, upload scanning, region packs, youth restrictions.

| Gap | Notes |
|-----|-------|
| Implementation proof | Checklist marks planned unless repo proves otherwise (`03_SECURITY_CHECKLIST.md`) |
| Scaffolding admin model vs Design roles | Reconcile Billing Manager / finer admin roles |
| “Why this ad” / user controls depth | Partially in Design; depth open — **PROPOSED OD-53** |

Full itemization: `03_SECURITY_CHECKLIST.md`.

---

## 10. Failure Isolation

Documented correctly: Ads outage → organic-only; emergency stop; org freeze; placement disable. Rollback prefers flags then forward-fix schema (`../implementation/06_RELEASE_PLAN.md`).

**Gap:** Chaos depth open (OD-40); drills required before Rel-3+.

---

## 11. Operational Readiness

| Present in plans | Missing for ops today |
|------------------|----------------------|
| RACI, runbooks phases, monitoring list | Named on-call rotation, pager rules, concrete dashboards |
| Support readiness by phase | Staffing numbers / hours |
| Reviewer SLA owner open | OD-18 |

---

## 12. Missing Architecture Decisions

Covered largely by OD-01…50. Newly proposed (non-canonical): see `05_OPEN_DECISIONS_REGISTER.md` OD-51+.

Notable missing/thin areas:

- Brand-safety **adjacent content** signal contract with Social (PROPOSED OD-54)
- Ads-specific payment provider adapter (PROPOSED OD-55)
- MetricDefinition ownership/process (PROPOSED OD-51)
- Soft vs hard budget recon cadence (PROPOSED OD-52)

---

## 13. Contradictions or Ambiguities

| Topic | Assessment |
|-------|------------|
| Ad Group vs ad_set | Documented as reconciliation (OD-15), not contradiction |
| AdvertiserOrg vs advertiser_accounts | Terminology bridge in registry — OK if shimmed |
| Design V2 “future” vs Implementation phases | Aligned via Release Plan mapping |
| Foundation claims “implemented” vs Design V2 “not started” | Explicitly acknowledged in roadmap §2.3 — engineers must not confuse scaffolding with Design V2 done |

No hard architectural contradiction found that blocks Phase A start, provided OD-15 approach is followed.

---

## 14. Recommendations (Priority Order)

1. **Execute Phase A with scaffolding inventory + OD-15 shim** — avoid dual Ads universes.
2. **Close OD-16** (first placement) before Delivery sandbox coding.
3. **Close OD-05/06/17** before any real settle.
4. **Close OD-02/11** before Store attribution claims.
5. **Close OD-03/04/45** before Public MVP geos.
6. **Implement kill-switch drills** in staging before Rel-3 exit.
7. **Add brand-safety content-signal contract** (PROPOSED OD-54) before Social widen.
8. **Keep AI/Experiments flagged off** until reporting honesty exists.

---

## 15. MVP versus Future Capability

| MVP (design intent) | Future |
|---------------------|--------|
| Org, hierarchy, review, sandbox Delivery, prepaid candidate, reporting honesty, limited placements | Warehouse, API GA, Live share, DSP, AI auto-optimize, agency vaults, full verticals |

Do not expand Public MVP scope silently into Enterprise/AI.

---

## 16. Final Architecture Readiness Verdict

| Question | Answer |
|----------|--------|
| Design package complete enough to engineer Phase A? | **Yes — PASS WITH RISKS** |
| Production public launch architecture closed? | **No** — blocking ODs + runtime proof required |
| Highest architecture risk | Scaffolding reconciliation + money/attribution undecideds |

**Architecture readiness score (design):** ~88% (docs coherent, seams clear, opens registered).
**Architecture readiness score (proven in prod):** ~15–25% (scaffolding only; Delivery off; no Design V2 settle).

---

## Related Documents

- `02_DEPENDENCY_MATRIX.md` · `03_SECURITY_CHECKLIST.md` · `04_IMPLEMENTATION_SEQUENCE.md` · `05_OPEN_DECISIONS_REGISTER.md` · `06_PRODUCTION_CHECKLIST.md`
- `../implementation/01_IMPLEMENTATION_ROADMAP.md` · `../implementation/03_BACKEND_SERVICES_PLAN.md` · `../implementation/06_RELEASE_PLAN.md`
- `../02_SYSTEM_ARCHITECTURE.md` · `../08_SECURITY.md` · `../13_ATTRIBUTION_ENGINE.md`
