# UMTUBA Ads — Release Plan

**Document type:** Implementation planning — staged release, flags, gates, and Go/No-Go
**Repository:** `umtuba-web`
**Branch context:** `office/ads-design-v2`
**Status:** Planning only — **does not claim** any release phase is executed or live
**Constraint:** No executable code or SQL in this document

**Normative inputs:** `../10_FUTURE_ROADMAP.md`, `../08_SECURITY.md`, `../15_ENTERPRISE_REPORTING.md`, `../16_ADS_API_AND_INTEGRATIONS.md`
**Program plans:** `01_IMPLEMENTATION_ROADMAP.md` … `05_TESTING_PLAN.md`

**Horizon labels used below**

| Label | Meaning |
|-------|---------|
| **Internal alpha** | Employees / synthetic only |
| **Closed beta** | Invited advertisers / sellers |
| **Public MVP** | Self-serve in selected countries |
| **Future** | Post-MVP expansion |

---

## 1. Executive Summary

This Release Plan is the **operational companion** to Ads Design V2 and Implementation Planning V1. It defines how capabilities move from documentation → internal foundation → review alpha → delivery sandbox → closed betas → public MVP → enterprise/API → AI—without skipping trust, budget, or rollback controls.

**Release thesis:** expose Ads **narrowly and reversibly**. Prefer feature flags and allowlists over big-bang launches. Money, Review, and Delivery each earn their own go-live. Open product decisions (countries, placements, prepaid vs postpaid, attribution windows, SLOs, AI authority, etc.) stay **explicitly open** until governance closes them.

**Maps to build phases** (`01`): Release Phases 1–2 ≈ Implementation A–B; 3–4 ≈ C–D; 5–6 ≈ E + commerce/social expand; 7 Live pilot; 8 Public MVP; 9 API/enterprise; 10 AI (`01` F).

---

## 2. Scope

| In scope | Out of scope |
|----------|----------------|
| Environments, phases 0–10, flags, cohorts, gates | Implementing flags/code in this task |
| Billing/Delivery/Reporting/AI rollout order | Declaring launch countries or SLOs as final |
| Incident, support, compliance, RACI | Executing production deploys |
| Go/No-Go and rollback playbooks | Merging Store/Live feature branches |

---

## 3. Non-Goals

- Claiming Phase 0–10 completion.
- Force-closing Open Decisions.
- Broad political ads or sensitive targeting at launch.
- External DSP at MVP.
- Autonomous AI spend.
- Destructive schema rollback as the default recovery.
- Coupling Ads launch to unrelated marketplace releases.

---

## 4. Release Principles

1. **Trust before yield** — Review and isolation before fill rate.
2. **Flags before exposure** — Schema may land dark; UX/serve stay off.
3. **Fail-closed Delivery** — Errors omit ads; core apps stay up.
4. **Money is a separate launch** — Budgets can exist as planning before settle.
5. **Server-enforced allowlists** — UI hiding is not security.
6. **Expand/contract schema** — Forward-fix preferred (`02`).
7. **Cohort auditability** — Who had access when.
8. **Kill switches ready** — Delivery, billing settle, AI, global emergency.
9. **Evidence over optimism** — Testing (`05`) and monitoring gates.
10. **Region packs** — Countries enable via policy, not global default.
11. **Store owns orders** — Attribution reads; Ads never mutates checkout.
12. **Communicate limitations** — Beta users see honest “what’s off.”

---

## 5. Release Governance

| Role | Responsibility |
|------|----------------|
| **Ads Product Owner** | Scope, cohort, Go/No-Go call |
| **Engineering Lead** | Deploy, flags, technical rollback |
| **Security** | Isolation, RPC/RLS, threat gates |
| **Trust & Safety / Review Lead** | Policy packs, reviewer capacity |
| **Finance** | Billing model approval, recon sign-off |
| **Support Lead** | Runbooks, advertiser comms |
| **Incident Commander** | Sev handling (on-call rotation) |
| **Legal/Compliance** *(as needed)* | Region, political, minors, residency |

No production cohort expansion without Product + Eng + Security (and Finance if billing on).

---

## 6. Environments

| Environment | Purpose |
|-------------|---------|
| **Local** | Dev; Delivery default off |
| **CI** | Required checks (`05`) |
| **Preview** | PR previews; no prod data; flags off or internal-only |
| **Staging** | Soak, drills, synthetic advertisers, full flag matrix |
| **Production** | Canary → progressive enablement |
| **Isolated sandbox** *(Future)* | Partner/API test tenants; fake Delivery (`16`) |

---

## 7–8. Release Phases (0–10)

For each phase: objective, scope, users, enabled/disabled, dependencies, data/migration prereqs, testing/security/ops gates, success metrics, rollback triggers, exit criteria.

> **None of these phases are asserted as done.**

---

### Phase 0 — Documentation and Readiness

| Field | Plan |
|-------|------|
| **Objective** | Freeze design + implementation plans; register opens; assign owners |
| **Scope** | Design V2 `01`–`16`; Implementation `01`–`06`; security review scope |
| **Users** | Internal stakeholders only |
| **Enabled** | Documentation, planning, spike timeboxing |
| **Disabled** | All consumer Delivery; public self-serve; real charges |
| **Dependencies** | Stakeholder availability |
| **Data/migration** | Inventory existing scaffolding; no Design V2 claim of completeness |
| **Testing gates** | N/A product; doc review |
| **Security gates** | Threat model outline for Ads |
| **Operational gates** | RACI draft; on-call stub |
| **Success metrics** | Plans accepted; Open Decisions list owned |
| **Rollback triggers** | N/A |
| **Exit criteria** | This doc set approved as Ready for Implementation (§34) |

**Horizon:** pre-alpha readiness.

---

### Phase 1 — Internal Foundation

| Field | Plan |
|-------|------|
| **Objective** | Advertiser/account + campaign CRUD + creative basics + admin visibility |
| **Scope** | Implementation A; migrations A–C shells; console internal |
| **Users** | Employees / internal test accounts |
| **Enabled** | Org, members, drafts, uploads, admin read |
| **Disabled** | Public Delivery, billing settle, external advertisers, AI, API |
| **Dependencies** | Auth; private media |
| **Data/migration** | Org/campaign/creative slices; RLS on |
| **Testing gates** | `05` Phase A matrix (isolation, transitions) |
| **Security gates** | Tenant isolation; no anon grants |
| **Operational gates** | Internal runbook stub |
| **Success metrics** | Zero cross-tenant defects in staging; drafts stable |
| **Rollback triggers** | Isolation failure → flag off console |
| **Exit criteria** | Internal users create hierarchy safely; Delivery still off |

**Horizon:** internal alpha (management only).

---

### Phase 2 — Review and Moderation Alpha

| Field | Plan |
|-------|------|
| **Objective** | Submit/review/reject/approve with audit; no billing |
| **Scope** | Implementation B; migration D; admin queues |
| **Users** | Internal advertisers + platform moderators |
| **Enabled** | Review RPCs, policy codes, audit trail, appeals **placeholder** |
| **Disabled** | Delivery, settle, self-approve, political/sensitive classes |
| **Dependencies** | Phase 1; platform admin identity |
| **Data/migration** | Review cases/decisions append-only |
| **Testing gates** | Review non-bypass; admin gate; audit atomicity |
| **Security gates** | Advertiser cannot approve; self-promotion to admin impossible |
| **Operational gates** | Reviewer training; queue SLA target draft |
| **Success metrics** | 100% decisions audited; zero self-approve |
| **Rollback triggers** | Audit gap or bypass → disable submit/approve flags |
| **Exit criteria** | Nothing becomes “eligible” without approval path |

**Horizon:** internal alpha (trust).

---

### Phase 3 — Delivery Sandbox

| Field | Plan |
|-------|------|
| **Objective** | Prove serve path with synthetic campaigns on internal inventory |
| **Scope** | Implementation C; migrations F (+ event contracts); tokens |
| **Users** | Internal only; no external advertisers |
| **Enabled** | Eligibility, serve stub/rank interface, impression/click validation, fail-closed |
| **Disabled** | External cohorts, real money, broad placements, Live, public API |
| **Dependencies** | Phase 2 approved inventory only |
| **Data/migration** | Placement registry MVP entries (**exact placements Open**) |
| **Testing gates** | Hot-path fail-closed; token integrity; no reporting in serve |
| **Security gates** | Token sign/verify; rate limits on ingest |
| **Operational gates** | Latency dashboards; emergency stop drill |
| **Success metrics** | Empty-on-timeout works; no Sev impact on Watch/Discover |
| **Rollback triggers** | Error budget burn; consumer regression → Delivery flag off |
| **Exit criteria** | Sandbox serve trusted; kill switch proven |

**Horizon:** internal alpha (data plane).

---

### Phase 4 — Closed Advertiser Beta

| Field | Plan |
|-------|------|
| **Objective** | Limited approved advertisers; hard caps; strict review; daily recon |
| **Scope** | Closed beta; **prepaid-only candidate** (final prepaid vs postpaid still **Open** until Finance closes) |
| **Users** | Allowlisted advertisers; manual support |
| **Enabled** | Limited placements; hard budgets; settle if Finance approves prepaid beta; daily recon |
| **Disabled** | Self-serve onboarding; broad countries; AI auto; DSP; postpaid unless approved |
| **Dependencies** | Phases 2–3; support staffing |
| **Data/migration** | Billing shell→settle (`02` E) if charging |
| **Testing gates** | Financial integrity if settle on; E2E exhaustion stop |
| **Security gates** | Freeze path; IVT v0 |
| **Operational gates** | Daily recon checklist; support hours |
| **Success metrics** | Overspend incidents = 0 Sev-1; review SLA met; advertiser NPS qualitative |
| **Rollback triggers** | Ledger mismatch; fraud spike → settle/Delivery freeze |
| **Exit criteria** | Stable closed cohort; runbooks battle-tested |

**Horizon:** closed beta.

---

### Phase 5 — Store Promotion Beta

| Field | Plan |
|-------|------|
| **Objective** | Promoted products + Store attribution foundations; seller eligibility |
| **Scope** | Store destinations; refund/cancel attribution corrections; no broad API |
| **Users** | Trusted sellers / invited advertisers |
| **Enabled** | Store Ads subset; attribution join; refund reverse hooks |
| **Disabled** | Broad external API; creator revenue-share claims (**Open**/unresolved) |
| **Dependencies** | Store conversion contracts; Phase 4 honesty |
| **Data/migration** | Attribution slice H |
| **Testing gates** | Store-as-truth; no order mutation; paid vs organic separation hooks |
| **Security gates** | Seller eligibility checks |
| **Operational gates** | Finance+Store liaison for GMV attribution disputes |
| **Success metrics** | Attributed PDP/purchase visibility; recon within policy |
| **Rollback triggers** | Attribution double-count → disable conversion credit flag |
| **Exit criteria** | Store promo beta trusted for expand decision |

**Horizon:** closed beta (commerce).

---

### Phase 6 — Social / Watch / Discover Expansion

| Field | Plan |
|-------|------|
| **Objective** | Selected social inventory expansion with frequency, reporting, pacing, IVT, user feedback |
| **Scope** | Broader Discover/Watch (exact set **Open**); reporting MVP deepen |
| **Users** | Expanded invite list / selected regions (**countries Open**) |
| **Enabled** | Frequency caps, pacing hooks, IVT monitoring, hide/report ads feedback |
| **Disabled** | Notifications push ads; unvetted verticals; DSP |
| **Dependencies** | Phase 4–5; reviewer capacity scale |
| **Data/migration** | Reporting rollups G; IVT marks |
| **Testing gates** | Perf smoke; privacy thresholds in reports |
| **Security gates** | Abuse/hide-rate anomaly alerts |
| **Operational gates** | Placement-level disable switches |
| **Success metrics** | Hide/report stable; serve p95 within **Open** SLO draft; freshness labeled |
| **Rollback triggers** | Trust metrics breach → shrink placements/cohort |
| **Exit criteria** | Ready to plan Public MVP geography |

**Horizon:** closed beta → pre-MVP.

---

### Phase 7 — Live Ads Pilot

| Field | Plan |
|-------|------|
| **Objective** | Limited Live inventory pilot with safety and emergency stop |
| **Scope** | Lobby/pre-join or companion only as policy allows; regional limits |
| **Users** | Invite-only hosts/advertisers |
| **Enabled** | Limited Live placements; emergency stop; host policy checks |
| **Disabled** | Broad Live monetization; **creator/Live revenue-share** unresolved (**Open**) |
| **Dependencies** | Live session contracts; Phase 6 monitoring maturity |
| **Data/migration** | Live destination eligibility; attribution joins optional |
| **Testing gates** | Never block Live pins; fail-omit ads |
| **Security gates** | Fake LIVE badge policy enforcement |
| **Operational gates** | Live ops + Ads joint on-call |
| **Success metrics** | No Live availability Sev from Ads; stop drill OK |
| **Rollback triggers** | Any Live safety incident involving Ads UI → Live ads flag off |
| **Exit criteria** | Pilot learnings documented; share model still Open |

**Horizon:** closed pilot.

---

### Phase 8 — Public MVP

| Field | Plan |
|-------|------|
| **Objective** | Self-serve onboarding in **selected countries** with selected objectives/formats; prepaid billing; reporting MVP; support/IR |
| **Scope** | Public MVP capability set—not full Design V2 |
| **Users** | Eligible self-serve advertisers in launch geos (**Open**) |
| **Enabled** | Onboarding, review, limited placements/formats/objectives, prepaid (**if approved**), reporting MVP, support |
| **Disabled** | Postpaid (unless approved), political ads default off, sensitive targeting default restricted, DSP, full AI optimize, full API |
| **Dependencies** | Phases 4–6 evidence; Finance+Legal region approval |
| **Data/migration** | Production hardening; retention packs |
| **Testing gates** | Full `05` blockers for MVP flags green on staging |
| **Security gates** | Region policy packs live; minors rules |
| **Operational gates** | 24×7 or defined support windows; status page notes |
| **Success metrics** | Paying retention; IVT within pilot threshold; overspend Sev-1 = 0; review SLA |
| **Rollback triggers** | S0/S1 security/money → global Delivery/settle stop |
| **Exit criteria** | Public MVP declared; known limitations published |

**Horizon:** public MVP.
**Mobile parity at launch:** **Open**.

---

### Phase 9 — Enterprise and API Expansion

| Field | Plan |
|-------|------|
| **Objective** | Agency accounts, API access, scheduled reports, advanced exports; invoicing/postpaid **only if approved**; partner certification |
| **Scope** | `16` façade; enterprise reporting slices (`15`) |
| **Users** | Certified partners, agencies, enterprises |
| **Enabled** | API scopes, exports, agency multi-account (**UX Open** timing), postpaid **conditional** |
| **Disabled** | Uncertified partners; unrestricted scopes |
| **Dependencies** | Public MVP stability; partner legal |
| **Data/migration** | ApiClient, export jobs, invoice objects if approved |
| **Testing gates** | Contract tests; no moderation bypass; rate limits |
| **Security gates** | Partner cert; secret rotation; webhook sigs |
| **Operational gates** | Partner support tier |
| **Success metrics** | API error budgets; zero bypass incidents |
| **Rollback triggers** | Abuse → revoke partner keys; disable API flag |
| **Exit criteria** | API GA for certified tier |

**Horizon:** future / enterprise.
**Partner eligibility:** **Open**.

---

### Phase 10 — AI and Optimization

| Field | Plan |
|-------|------|
| **Objective** | Assisted recommendations + experiments with human approval; no unrestricted autonomous spend |
| **Scope** | Implementation F; AI safety tests (`05` M) |
| **Users** | Flagged advertisers |
| **Enabled** | Assisted drafts, explainability, proposal approve, experiments without auto-winner |
| **Disabled** | Autonomous budget authority **by default** (**Open** if ever loosened) |
| **Dependencies** | Honest reporting; Asset Library maturity |
| **Data/migration** | AI audit + experiment registry |
| **Testing gates** | Sensitive refusal; approval required; kill switch |
| **Security gates** | No raw PII to models |
| **Operational gates** | Model version change control |
| **Success metrics** | Accept rate; zero silent spend changes |
| **Rollback triggers** | Policy leak or spend incident → AI flag off |
| **Exit criteria** | Assisted AI generally available under policy |

**Horizon:** future.

---

## 9. Feature Flag Strategy

| Flag class | Examples |
|------------|----------|
| Route / console | Advertiser console visible |
| Advertiser eligibility | Allowlist/blocklist server-side |
| Placement | Per `placement_id` |
| Country / region | Policy pack enable |
| Objective / format | Vertical unlocks |
| Billing | Settle enabled; top-up enabled |
| AI | Assist; optimize proposals |
| Experiments | Registry on |
| Admin kill | Org freeze; placement disable |
| Emergency global | Delivery hard off; settle hard off |

**Rule:** flags enforced in eligibility/RPC, not only UI (`03`, `04`).

---

## 10. Rollout Cohorts

| Cohort | Typical phase |
|--------|----------------|
| Employees / internal | 1–3 |
| Test advertisers | 3–4 |
| Trusted sellers | 5 |
| Invited advertisers | 4–6 |
| Selected regions | 6–8 |
| Percentage serve rollout | 6–8 canary |
| Allowlists / blocklists | All external phases |
| Cohort audit log | Who/when/why |

---

## 11. Migration and Schema Rollout

- Expand → flag → contract later (`02`).
- Backward compatible app reads.
- Forward-fix preference.
- Feature flags before user exposure.
- Production read-only verification after migrate.
- Backfills explicit and replay-safe.
- No destructive drops without staged empty + soak.

---

## 12. Deployment Strategy

| Step | Action |
|------|--------|
| Preview | Validate PR; Ads flags off |
| Staging soak | Phase checklist + drills |
| Production canary | Tiny cohort or % |
| Progressive enablement | Widen allowlist/placements |
| Dark launch | Schema/jobs without UI |
| Shadow mode | Eligibility/rank compute not shown |
| Rollback | Flags first; artifact rollback second |
| Roll-forward | Prefer fix-forward for additive schema |

---

## 13. Data and Event Rollout

- Event `schema_version` required.
- Validate + dedupe at ingest.
- Preliminary metrics before finalize watermark.
- Late events + correction jobs.
- Warehouse boundary **Open** timing (`15`).

---

## 14. Billing Rollout

1. Billing disabled (planning budgets only).
2. Test balances internal.
3. Prepaid beta candidate (Phase 4)—**model still Open** until Finance signs.
4. Daily transaction recon.
5. Payment failure → auto-stop Delivery eligibility.
6. Refunds/credits via adjustment entries; dual-control later.
7. Postpaid/invoicing deferred unless approved (Phase 9).

---

## 15. Review and Policy Rollout

- Manual review first; automation assist later.
- Reviewer training before external beta.
- Policy packs by region; escalation paths.
- Appeals placeholder → real appeals.
- Audit completeness gated.
- Political/sensitive categories **disabled by default**.

---

## 16. Delivery Rollout

Synthetic → internal inventory → low-risk placements → limited audience → hard budget + frequency caps → fail-closed + fallback empty → latency monitoring → widen.

Exact MVP placements: **Open**.

---

## 17. Reporting Rollout

Internal dashboards → read-only beta → preliminary labels → freshness labels → finalized → export limits → privacy thresholds → ledger recon.

Freshness SLA numeric: **Open**.

---

## 18. AI Rollout

Offline/rules tips → read-only suggestions → advertiser approval apply → limited optimization proposals → rollback + version audit → **no autonomous budget authority by default**.

---

## 19. Incident Management

| Sev | Examples | Response |
|-----|----------|----------|
| S0 | Tenant leak; ledger corruption | IC; global stop; preserve evidence |
| S1 | Double charge; stop broken; token forge | Freeze settle/Delivery; patch |
| S2 | Placement anomaly; recon break | Shrink cohort; fix-forward |
| S3/S4 | UX/policy polish | Ticket |

**Actions:** emergency Delivery stop; advertiser freeze; placement disable; billing freeze; advertiser/status comms; postmortem; evidence retention.

---

## 20. Monitoring and Alerting

Must-wire before Phase 3+:

Serving latency & error rate · budget overshoot · ledger mismatch · event drop/dup · IVT spike · review backlog · reporting delay · asset processing failures · security/authZ anomalies · emergency stop state.

Numeric latency/freshness/overshoot SLOs: **Open**.

---

## 21. Support Readiness

| Track | Ready before |
|-------|--------------|
| Internal runbooks | Phase 1 exit |
| Advertiser support macros | Phase 4 |
| Admin/moderator playbooks | Phase 2 |
| Finance recon playbook | Phase 4 if settle |
| Policy escalation | Phase 2 |
| Incident escalation | Phase 3 |
| Status/known limitations page | Phase 8 |

---

## 22. Compliance and Regional Rollout

- Country policy packs; consent; residency (**Open** topology).
- Retention; minors; sensitive categories restricted.
- Political advertising policy **Open**—default off.
- Local billing/tax hooks before public geo.
- **Launch approval per region** (Product+Legal+Finance).

---

## 23. Security Release Gates

Before each external-facing phase:

RLS verification · grants/revokes · RPC review · tenant isolation tests · admin authorization · secret handling · token signing · rate limits · abuse controls · upload scanning · audit completeness (`05`, `08`).

---

## 24. Quality Gates

Typecheck · unit/integration/E2E per `05` phase matrix · migration checks · RLS tests · performance smoke · accessibility · localization · rollback rehearsal · staging validation.

---

## 25. Go/No-Go Checklist

Use before widening any cohort or enabling settle/Delivery/AI/API:

- [ ] Phase exit criteria met
- [ ] Open Decisions either closed formally or explicitly accepted as residual risk
- [ ] Security gates signed
- [ ] Testing gates green on staging
- [ ] Monitoring & kill switches verified
- [ ] Support/runbooks ready for the cohort size
- [ ] Finance sign-off if money moves
- [ ] Legal/region sign-off if public geo
- [ ] Rollback drill within last N days (define N operationally)
- [ ] Comms to cohort prepared
- [ ] No open S0/S1 Ads defects

---

## 26. Rollback Plan

**Order of operations**

1. Emergency Delivery stop and/or settle freeze.
2. Disable placement/country/cohort flags.
3. Org freezes for affected advertisers.
4. App artifact rollback if flag-off insufficient.
5. Preserve ledgers/audit—**do not** delete money facts to “undo.”
6. Credits/adjustments via controlled finance path.
7. Postmortem before re-enable.

Schema: roll-forward; avoid destructive down-migrations in prod.

---

## 27. Post-Release Validation

Within T+1h / T+24h / T+7d (tune operationally):

- Serve empty-rate and latency
- Settle/idempotency errors
- Isolation canary probes
- Review queue age
- Report vs ledger delta
- User hide/report rates
- Support ticket themes
- Flag state inventory snapshot

---

## 28. Metrics and KPIs

| Category | Examples |
|----------|----------|
| Trust | IVT %, hide/report, review SLA |
| Money | Overspend incidents, recon break rate |
| Reliability | Serve availability (empty OK), p95 (**SLO Open**) |
| Product | Advertiser retention, draft→submit conversion |
| Commerce | Store-attributed outcomes (Phase 5+) |
| Ops | Time-to-mitigate Sev, freeze MTTA |

---

## 29. Communication Plan

| Audience | Channels |
|----------|----------|
| Internal | Release notes, war-room |
| Beta advertisers | Email/in-console banners; known limits |
| Public MVP | Help center; status |
| Incidents | Status + direct outreach for freezes |
| Exec | KPI digest post-phase |

Never promise ROAS or closed Open Decisions as facts.

---

## 30. Ownership and RACI-style Responsibilities

| Workstream | A | R | C | I |
|------------|---|---|---|---|
| Phase scope / Go-No-Go | Product | Eng Lead | Sec, Finance, T&S | Support |
| Flags & deploy | Eng Lead | Eng | Product | Support |
| Review policy | T&S | T&S | Legal, Product | Eng |
| Billing settle on | Finance | Eng | Product, Sec | Support |
| Delivery on | Product | Eng | Sec, T&S | Support |
| Incident | IC | Eng+Sec | Product | All |
| API partners | Product | Eng | Sec, Legal | Finance |

(A=Accountable, R=Responsible, C=Consulted, I=Informed)

---

## 31. Risks

| Risk | Mitigation |
|------|------------|
| Skipping sandbox into public | Phase gates enforced |
| Billing before recon muscle | Phase 4 daily recon mandatory |
| Live share promises early | Keep Open; no UI claims |
| Flag only in UI | Server eligibility checks |
| Region launch without legal | Per-country approval |
| AI trust damage | Human approve default |
| Schema coupling to Store release | Independent flags |
| Unowned Open Decisions | Named owners in Phase 0 |

---

## 32. Open Decisions

Canonical registry: `01_IMPLEMENTATION_ROADMAP.md` §14 (OD-01…OD-50). Owners must be assigned by Phase 0 exit (§34).

**Release / go-live focus:**

| ID | Question (short) | Options | Recommendation | Owner | Phase | Blocking? |
|----|------------------|---------|----------------|-------|-------|-----------|
| OD-03 | Sensitive targeting packs | See registry | Restrictive packs | Legal + T&S + Product | A+ | Blocking public geo |
| OD-04 | Political ads policy | See registry | Default off | Legal + T&S | Rel-8 | Blocking if enabling |
| OD-05 | Prepaid vs postpaid | See registry | Prepaid candidate | Finance + Product | Rel-4 | Blocking settle |
| OD-06 | Overshoot SLA | See registry | Numeric before settle | Finance + Eng | Rel-4 | Blocking settle |
| OD-07 | Creator/Live revenue share | See registry | Defer; no UI promises | Product + Live + Finance | Rel-7 | Non-blocking if UI off |
| OD-08 | External DSP | See registry | None through MVP | Product + Sec | Rel-9+ | Non-blocking MVP |
| OD-11 | Attribution windows | See registry | Pin at E | Product + Eng | Rel-5–8 | Blocking conversion claims |
| OD-12 | AI optimization authority | See registry | Human-only default | Product + Sec | Rel-10 | Blocking if auto on |
| OD-14 | API partner eligibility | See registry | Cert before GA | Product + Legal + Sec | Rel-9 | Blocking API GA |
| OD-16 | First Delivery placement | See registry | One sandbox placement first | Product + Eng | Rel-3 | Blocking sandbox |
| OD-21 | Warehouse timing | See registry | Postgres MVP | Eng + Data | Rel-8 | Non-blocking MVP |
| OD-27 | Mobile parity at launch | See registry | Usable mobile / strong desktop | Product + Frontend | Rel-8 | Non-blocking if disclosed |
| OD-43 | Serving latency SLO | See registry | Before Rel-6 widen | Eng | Rel-3–6 | Blocking widen |
| OD-44 | Reporting freshness SLA | See registry | Before Rel-8 | Eng + Product | Rel-8 | Blocking Public MVP claims |
| OD-45 | Launch countries | See registry | Per-geo Legal+Product approval | Product + Legal | Rel-8 | Blocking Public MVP |
| OD-46 | Exact MVP placement set | See registry | Close with OD-16 then expand | Product | Rel-3–8 | Blocking each widen |

---

## 33. Acceptance Criteria

This Release Plan is complete when:

- [x] Phases 0–10 specified with objective/scope/users/enabled/disabled/deps/migrations/testing/security/ops/success/rollback/exit
- [x] Flags, cohorts, schema/deploy/events/billing/review/delivery/reporting/AI rollouts covered
- [x] Incident, monitoring, support, compliance, security/quality gates, Go/No-Go, rollback, post-release, KPIs, comms, RACI included
- [x] Open Decisions explicit; no phase claimed executed
- [x] Usable as a live Go/No-Go reference
- [x] Linked to Design + Implementation `01`–`05`

---

## 34. Final Definition of Ready for Implementation

Ads Design V2 + Implementation Planning V1 are **Ready for Implementation** when:

1. Design docs `../01_PRODUCT_VISION.md` through `../16_ADS_API_AND_INTEGRATIONS.md` accepted as normative product/architecture identity.
2. Implementation plans `01`–`06` accepted (roadmap, migrations, backend, frontend, testing, **release**).
3. Open Decisions list has named owners and is not silently closable in code review.
4. Existing scaffolding reconciliation approach agreed (`01` §2.3 / `02`).
5. Security threat scope for Phases 1–4 outlined.
6. RACI and environment strategy acknowledged by Eng/Product/Sec/(Finance as needed).
7. No requirement to modify unrelated dirty local files (e.g., Discover UI) to proceed.
8. First build slice identified as **Phase 1 Internal Foundation** behind flags, Delivery off.

Meeting §34 authorizes **starting implementation work** under normal PR/CI discipline—it does **not** authorize production Delivery, settle, or public self-serve without Phase gates above.

---

## Related Documents

- `01_IMPLEMENTATION_ROADMAP.md` — build phases A–F
- `02_DATABASE_MIGRATIONS_PLAN.md` — schema expand/contract
- `03_BACKEND_SERVICES_PLAN.md` — kill switches & services
- `04_FRONTEND_PLAN.md` — console exposure flags
- `05_TESTING_PLAN.md` — gates & severities
- `../10_FUTURE_ROADMAP.md` — product horizon
- `../08_SECURITY.md` · `../15_ENTERPRISE_REPORTING.md` · `../16_ADS_API_AND_INTEGRATIONS.md`

---

## Document Control

| Item | Value |
|------|-------|
| Planning version | Implementation Planning V1 — Release (final doc in set) |
| Authoring mode | Documentation only |
| Series complete | `01` … `06` under `docs/ads/implementation/` |
