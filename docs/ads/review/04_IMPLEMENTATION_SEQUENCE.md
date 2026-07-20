# UMTUBA Ads — Implementation Sequence

**Document type:** Production readiness review — engineering milestones
**Status:** Planning sequence for execution — **not** a schedule commitment
**Complexity:** Relative S / M / L / XL only
**Aligns to:** Implementation Phases A–F (`../implementation/01_IMPLEMENTATION_ROADMAP.md`) and Release Phases (`../implementation/06_RELEASE_PLAN.md`)

---

## Milestone Catalog

### M01 — Scaffolding Inventory & Terminology Shim

| Field | Content |
|-------|---------|
| **Objective** | Map existing Ads foundation objects to Design V2 terms (OD-15/48) |
| **Scope** | Inventory docs/code/migrations; decide shim strategy; no user-facing Delivery |
| **Excluded** | New public features; settle; serve |
| **Dependencies** | Access to repo foundation notes |
| **DB** | Read-only inventory; optional additive alias columns later |
| **Backend** | Mapping notes in domain modules |
| **Frontend** | None or label-only |
| **Security** | Confirm RLS still fail-closed during shim |
| **Tests** | Contract tests that document mapping |
| **Observability** | None |
| **Rollout** | Internal eng only |
| **Complexity** | M |
| **Risks** | Dual-write mistakes |
| **Entry** | Review package accepted |
| **Exit** | Written mapping + OD-15 approach agreed |
| **Rollback** | N/A (docs/eng) |

---

### M02 — Advertiser / Account Foundation

| Field | Content |
|-------|---------|
| **Objective** | Org, membership, roles, invites, account status |
| **Scope** | Service A; migrations slice A |
| **Excluded** | Billing settle; Delivery |
| **Dependencies** | M01; Identity |
| **DB** | Org/member/invite/BillingAccount shell |
| **Backend** | RPCs create/invite/role |
| **Frontend** | Onboarding + settings (internal) |
| **Security** | Isolation S-02–S-05 |
| **Tests** | Suites A/C Phase A |
| **Observability** | Org create metrics |
| **Rollout** | Internal alpha flag |
| **Complexity** | L |
| **Risks** | Tenant leaks |
| **Entry** | M01 exit |
| **Exit** | Cross-tenant tests green; console create org |
| **Rollback** | Flag off console |

---

### M03 — Campaign Core

| Field | Content |
|-------|---------|
| **Objective** | Campaign → Ad Group → Ad lifecycle, schedule, targeting/placement refs |
| **Scope** | Service B; migration B |
| **Excluded** | Serving; vertical structured payloads |
| **Dependencies** | M02; Placement Registry stub |
| **DB** | Hierarchy + TargetingSpec |
| **Backend** | CRUD + optimistic concurrency |
| **Frontend** | List + wizard skeleton |
| **Security** | Role write gates |
| **Tests** | Transitions, validation |
| **Observability** | Conflict rate |
| **Rollout** | Internal |
| **Complexity** | L |
| **Risks** | Status machine bugs |
| **Entry** | M02 |
| **Exit** | Draft hierarchy stable |
| **Rollback** | Forward-fix statuses |

---

### M04 — Creative & Asset Basics

| Field | Content |
|-------|---------|
| **Objective** | Upload, scan/process hooks, bind Creative, signed URLs |
| **Scope** | Service C; migration C (MVP library) |
| **Excluded** | Full Brand kits; AI provenance UI |
| **Dependencies** | M02; media pipeline |
| **DB** | Asset/Creative |
| **Backend** | Upload session RPCs |
| **Frontend** | Upload + preview |
| **Security** | S-13–S-15 |
| **Tests** | MIME/path; active-use delete |
| **Observability** | Time-to-ready |
| **Rollout** | Internal |
| **Complexity** | L |
| **Risks** | Malware miss |
| **Entry** | M02 |
| **Exit** | Ready assets attachable |
| **Rollback** | Reject pipeline; keep rows |

---

### M05 — Review & Moderation + Admin Foundation

| Field | Content |
|-------|---------|
| **Objective** | Submit/approve/reject/suspend with audit; admin queues |
| **Scope** | Services D+M (subset); migration D+J admin |
| **Excluded** | Appeals full product; AI moderation |
| **Dependencies** | M02–M04 |
| **DB** | Review cases/decisions; platform admin |
| **Backend** | admin_* RPCs |
| **Frontend** | Advertiser timeline + `/admin` queues |
| **Security** | S-07–S-09, S-23 |
| **Tests** | Self-approve deny; audit atomicity |
| **Observability** | Queue age |
| **Rollout** | Internal alpha Rel-2 |
| **Complexity** | L |
| **Risks** | Bypass; reviewer capacity (OD-18) |
| **Entry** | M03–M04 |
| **Exit** | No eligibility without approve path |
| **Rollback** | Disable submit/approve flags |

---

### M06 — Budget Shell & Ledger Foundations

| Field | Content |
|-------|---------|
| **Objective** | BudgetPolicy + counters shell; ledger tables without public settle |
| **Scope** | Service E shell; migration E 5a |
| **Excluded** | Real charges (until M10) |
| **Dependencies** | M02 |
| **DB** | Budget + BillingAccount shell |
| **Backend** | set_budget RPC |
| **Frontend** | Budget fields (planning copy) |
| **Security** | No client ledger writes |
| **Tests** | Validation minor units |
| **Observability** | — |
| **Rollout** | Internal |
| **Complexity** | M |
| **Risks** | Confusing “fake money” UX — label clearly |
| **Entry** | M02 |
| **Exit** | Budgets stored; settle flag off |
| **Rollback** | Flag |

---

### M07 — Delivery Sandbox (Eligibility + Serve + Tokens)

| Field | Content |
|-------|---------|
| **Objective** | Fail-closed serve on one placement (OD-16) for synthetic campaigns |
| **Scope** | Services F/G; migration F; internal inventory |
| **Excluded** | External advertisers; real money; multi-placement expand |
| **Dependencies** | M05; OD-16 closed; Placement BFF contract |
| **DB** | Placement registry; token metadata; events tables |
| **Backend** | Eligibility + serve stub ranker |
| **Frontend** | None required beyond flags; product BFF wiring |
| **Security** | S-18 tokens; emergency stop |
| **Tests** | Suite I hot-path; fail-closed timeout |
| **Observability** | Serve p95, empty rate, stop state |
| **Rollout** | Dark/internal Rel-3 |
| **Complexity** | XL |
| **Risks** | Consumer regression |
| **Entry** | M05 exit; kill-switch drill planned |
| **Exit** | Sandbox serve trusted; stop proven |
| **Rollback** | Delivery flag off |

---

### M08 — Event Ingestion MVP

| Field | Content |
|-------|---------|
| **Objective** | Impression/click(/view) ingest with dedupe |
| **Scope** | Service H |
| **Excluded** | Full conversion bridge |
| **Dependencies** | M07 |
| **DB** | Event append + unique keys |
| **Backend** | Ingest RPC/edge |
| **Frontend** | Client beacons in placement |
| **Security** | Replay reject; rate limit |
| **Tests** | Dedupe; poison |
| **Observability** | Ingest QPS, poison rate |
| **Rollout** | With M07 |
| **Complexity** | L |
| **Risks** | Beacon storms |
| **Entry** | M07 serve tokens |
| **Exit** | Events durable + deduped |
| **Rollback** | Disable beacon endpoints |

---

### M09 — Reporting MVP (Honesty)

| Field | Content |
|-------|---------|
| **Objective** | Rollups for impr/click/spend shell; preliminary labels |
| **Scope** | Service I; migration G subset |
| **Excluded** | Full enterprise dims; warehouse |
| **Dependencies** | M08; M06 |
| **DB** | Daily aggregates; MetricDefinition |
| **Backend** | Rollup jobs (provider OD-20) |
| **Frontend** | Read-only reports internal |
| **Security** | Org-scoped reads |
| **Tests** | Suite K subset |
| **Observability** | Freshness lag |
| **Rollout** | Internal → beta read-only |
| **Complexity** | L |
| **Risks** | Misleading metrics without finalize |
| **Entry** | M08 |
| **Exit** | Labeled dashboards match events directionally |
| **Rollback** | Hide reports flag |

---

### M10 — Billing Settle (Prepaid Candidate)

| Field | Content |
|-------|---------|
| **Objective** | Real settle from billable events; auto-stop; recon |
| **Scope** | Service E settle; OD-05/06/17 must be closed |
| **Excluded** | Postpaid unless approved |
| **Dependencies** | M08–M09; payment adapter (PROPOSED OD-55); OD-20 |
| **DB** | BillingEvent/CreditEvent live |
| **Backend** | settle/credit/freeze RPCs |
| **Frontend** | Balance + stop reasons |
| **Security** | S-20–S-22 |
| **Tests** | Suite J financial |
| **Observability** | Settle lag; ledger mismatch alert |
| **Rollout** | Closed beta Rel-4 allowlist |
| **Complexity** | XL |
| **Risks** | Overspend; double charge |
| **Entry** | OD-05/06/17 closed; M07–M09 stable |
| **Exit** | Daily recon OK; Sev-1 overspend = 0 in pilot |
| **Rollback** | Settle flag off; Delivery optional freeze |

---

### M11 — Attribution + Store Promotions

| Field | Content |
|-------|---------|
| **Objective** | Last-paid-click foundation + Store destination eligibility; refund reverse |
| **Scope** | Service J; Rel-5; OD-02/11 |
| **Excluded** | Multi-touch UI; creator payout changes |
| **Dependencies** | Store conversion contract; M10 optional for ROAS |
| **DB** | Attribution results |
| **Backend** | ingest conversion; apply/reverse |
| **Frontend** | Store destination + attributed metrics |
| **Security** | S-31–S-33 |
| **Tests** | Attribution suite K |
| **Observability** | Match rate |
| **Rollout** | Trusted sellers |
| **Complexity** | L |
| **Risks** | Credit conflict with creators |
| **Entry** | OD-02/11; Store events |
| **Exit** | Dual-ledger behavior documented + tested |
| **Rollback** | Disable conversion credit flag |

---

### M12 — Social Placement Expansion

| Field | Content |
|-------|---------|
| **Objective** | Widen Discover/Watch per OD-46; frequency; IVT monitoring; hide/report |
| **Scope** | Rel-6 |
| **Excluded** | Notifications push; Search unless ready |
| **Dependencies** | M07–M10; OD-43 draft |
| **DB** | Frequency caps; IVT marks |
| **Backend** | Caps + feedback hooks |
| **Frontend** | Diagnostics |
| **Security** | S-17, S-30 |
| **Tests** | Perf smoke; trust metrics |
| **Observability** | Hide rate; IVT spike |
| **Rollout** | Canary % |
| **Complexity** | L |
| **Risks** | Trust regressions |
| **Entry** | M07 exit; monitoring live |
| **Exit** | Trust KPIs stable |
| **Rollback** | Shrink placements |

---

### M13 — Live Ads Pilot

| Field | Content |
|-------|---------|
| **Objective** | Limited Live inventory; emergency stop; no share UI (OD-07) |
| **Scope** | Rel-7 |
| **Excluded** | Revenue-share productization |
| **Dependencies** | Live session contract; M12 monitoring maturity |
| **DB** | Live destination eligibility |
| **Backend** | Placement + policy |
| **Frontend** | Live destination type |
| **Security** | Fake LIVE ban |
| **Tests** | Never block pins |
| **Observability** | Joint Live+Ads on-call |
| **Rollout** | Invite-only |
| **Complexity** | M |
| **Risks** | Live availability Sev |
| **Entry** | Live eng agreement |
| **Exit** | Pilot learnings; share still open |
| **Rollback** | Live ads flag off |

---

### M14 — Public Advertiser MVP

| Field | Content |
|-------|---------|
| **Objective** | Self-serve in OD-45 geos; selected formats/objectives/placements |
| **Scope** | Rel-8 |
| **Excluded** | API GA; AI optimize; political ads |
| **Dependencies** | M10–M12; OD-03/04/45/44 |
| **DB** | Hardening; retention |
| **Backend** | Rate limits; support hooks |
| **Frontend** | Onboarding public |
| **Security** | Region packs |
| **Tests** | Full blockers green |
| **Observability** | Full alert set |
| **Rollout** | Progressive geos |
| **Complexity** | XL |
| **Risks** | Support overload; legal |
| **Entry** | Go/No-Go Rel-8 |
| **Exit** | Public MVP declared + limitations published |
| **Rollback** | Geo/cohort flags |

---

### M15 — Enterprise / API

| Field | Content |
|-------|---------|
| **Objective** | Certified API; exports; agency later |
| **Scope** | Rel-9; OD-14/49 |
| **Excluded** | Uncertified partners |
| **Dependencies** | M14 stable |
| **DB** | ApiClient; export jobs |
| **Backend** | Public API façade |
| **Frontend** | Partner portal minimal |
| **Security** | S-34–S-36 |
| **Tests** | Contract; no bypass |
| **Observability** | API error budgets |
| **Rollout** | Cert cohort |
| **Complexity** | L |
| **Risks** | Abuse |
| **Entry** | Partner legal |
| **Exit** | API GA certified tier |
| **Rollback** | Revoke keys; API flag |

---

### M16 — Experiments

| Field | Content |
|-------|---------|
| **Objective** | Creative/headline tests; no auto-winner |
| **Scope** | Service K; OD-13 |
| **Excluded** | Bandits default |
| **Dependencies** | M09 honesty |
| **DB** | Experiment registry |
| **Backend** | Assign sticky |
| **Frontend** | Experiment UX |
| **Security** | No assignment export |
| **Tests** | Suite L |
| **Observability** | SRM hooks |
| **Rollout** | Flag |
| **Complexity** | M |
| **Risks** | Peeking misuse |
| **Entry** | Reporting stable |
| **Exit** | Flagged GA internal |
| **Rollback** | Flag off |

---

### M17 — AI-Assisted Optimization

| Field | Content |
|-------|---------|
| **Objective** | Assisted suggestions + human approval; OD-12 human-only |
| **Scope** | Service L; Rel-10 |
| **Excluded** | Autonomous budget authority |
| **Dependencies** | M09; M04 assets; M16 if concurrent |
| **DB** | AI audit tables |
| **Backend** | Suggestion/proposal RPCs |
| **Frontend** | Assist panel |
| **Security** | S-40 |
| **Tests** | Suite M |
| **Observability** | Kill switch; accept rate |
| **Rollout** | Flag |
| **Complexity** | L |
| **Risks** | Trust / policy leak |
| **Entry** | Safety tests green |
| **Exit** | Assisted AI under policy |
| **Rollback** | AI flag off |

---

## Sequence Diagram (Logical)

```text
M01 → M02 → M03 → M04 → M05 → M06
                ↘________↗
M05 → M07 → M08 → M09 → M10 → M11 → M12 → M13 → M14 → M15
                                      ↘ M16 → M17
```

---

## Related Documents

- `../implementation/01_IMPLEMENTATION_ROADMAP.md` · `../implementation/06_RELEASE_PLAN.md`
- `01_ARCHITECTURE_REVIEW.md` · `05_OPEN_DECISIONS_REGISTER.md` · `06_PRODUCTION_CHECKLIST.md`
