# UMTUBA Ads — Testing Plan

**Document type:** Implementation planning — quality, security, and integrity verification
**Repository:** `umtuba-web`
**Branch context:** `office/ads-design-v2`
**Status:** Planning only — **does not create or claim** the full Ads Design V2 test suite
**Constraint:** No executable tests, code, or SQL in this document

**Normative inputs:** `../08_SECURITY.md`, `../13_ATTRIBUTION_ENGINE.md`, `../14_EXPERIMENT_PLATFORM.md`, `../15_ENTERPRISE_REPORTING.md`, `../16_ADS_API_AND_INTEGRATIONS.md`
**Program plans:** `01_IMPLEMENTATION_ROADMAP.md` … `04_FRONTEND_PLAN.md`

**Repo guidance (observe only):** `umtuba-web` already uses fast **Vitest** domain/contract tests in places (including Ads foundation-style suites) and lists **Playwright** among tooling. This plan **builds on that culture** (unit/contract-first, migration text contracts where useful) without treating current coverage as Design V2 complete.

---

## 1. Executive Summary

Ads quality is not “green CI alone.” The Ads domain fails catastrophically via **cross-tenant leaks, ledger double-charges, review bypass, hot-path outages, and dishonest reporting**. This plan defines a layered verification program mapped to Implementation Phases A–F and backend/frontend seams (`03`, `04`).

**Priorities (descending)**

1. Authorization / tenant isolation / admin gates
2. Financial ledger integrity + idempotency
3. Review/moderation non-bypass
4. Delivery fail-closed + token integrity
5. Attribution honesty (Store as order truth)
6. Reporting preliminary/final + IVT
7. Functional UX + a11y/i18n
8. Performance / resilience

Exact coverage %, E2E framework lock-in, load tools, and latency SLOs remain **Open Decisions**.

---

## 2. Scope

| In scope | Out of scope |
|----------|----------------|
| Test strategy for Ads management, delivery, billing, reporting, attribution, AI, experiments, admin | Authoring test files in this task |
| Environments, fixtures, CI/PR gates, staging/canary/prod read-only checks | Closing product Open Decisions via tests |
| MVP vs Future depth per layer | Chaos-testing production without approval |
| Mapping suites → phases A–F | Claiming Design V2 suites already exist |

---

## 3. Non-Goals

- Writing Vitest/Playwright/k6 scripts here.
- Guaranteeing statistical significance frameworks for experiments.
- Perfect AI creative quality scoring as a release gate on day one.
- Load-testing production without canary controls.
- Using real PII or production customer lists in fixtures.
- Testing Store checkout internals (only Ads↔Store **contracts**).

---

## 4. Testing Principles

1. **Fail closed is correct** — empty ad serve on error beats wrong ad.
2. **Security tests are not optional** — IDOR/cross-tenant are release-blocking.
3. **Money paths need idempotency proofs** — double settle must be safe.
4. **DB is the authority** — RLS/RPC tests outweigh UI-only checks.
5. **Deterministic fixtures** — fixed clocks/UUIDs where time windows matter.
6. **Contract tests for migrations/RPCs** — assert presence of grants/revokes/search_path patterns where the repo already does for foundations.
7. **No moderation bypass** — API and UI paths.
8. **Privacy-safe telemetry** in test analytics assertions.
9. **Flakes are defects** — quarantine with owner and expiry.
10. **Phase-gated depth** — don’t require full Attribution E2E before Phase A UI.
11. **MVP vs Future** — mark advanced suites so CI stays green while flags are off.
12. **Reconcile scaffolding tests** — extend existing Ads foundation tests toward Design V2 terms rather than ignoring them.

---

## 5. Test Pyramid

```text
            / E2E (few, critical journeys) \
           /  Integration API+DB+UI thin   \
          /   Component + contract suites    \
         /    Domain unit (large, fast)       \
```

| Layer | Volume | Speed | Owner mindset |
|-------|--------|-------|---------------|
| Domain unit | High | Fast | Pure rules |
| DB/RLS/RPC | Medium | Medium | Migrations + policies |
| Backend integration | Medium | Medium | Service orchestration |
| API/contract | Medium | Fast–med | Public/internal façades |
| Frontend component | Medium | Fast | States/a11y |
| Frontend integration | Lower | Slower | Wizard flows |
| E2E | Lowest | Slowest | Money + trust paths |
| Perf/resilience | Scheduled | Variable | Budgets & degradation |

---

## 6. Test Environments

| Env | Purpose |
|-----|---------|
| **Local** | Unit + selected integration against local/ephemeral DB |
| **CI** | PR required checks; no secrets in logs |
| **Ephemeral PR DB** *(Future ideal)* | Migration + RLS apply per PR |
| **Staging** | Full flags matrix; synthetic advertisers |
| **Canary** | Small % Delivery/Billing with heightened metrics |
| **Production** | Read-only verification queries + synthetic checks (**Open** depth) |

Warehouse-specific env is **Open** if reporting leaves Postgres.

---

## 7. Test Data Strategy

| Principle | Direction |
|-----------|-----------|
| Synthetic orgs | `test-advertiser-*` fixtures; never prod clones with PII |
| Multi-tenant pairs | Org A / Org B always in isolation suites |
| Role matrix | Owner, Campaign Manager, Analyst, Billing Manager, non-member, platform admin, anon |
| Money | Minor units; multiple currencies only when feature exists |
| Creatives | Tiny safe fixtures; malware samples only in isolated scanner tests |
| Time | Frozen clocks for budgets/attribution windows |
| Cleanup | Transaction rollback or dedicated truncate helpers in test DB |

**Staging data volume:** **Open Decision**.

---

## 8. Fixtures and Factories

Conceptual factories (names illustrative):

| Factory | Builds |
|---------|--------|
| `makeAdvertiserOrg` | Org + owner membership |
| `makeMember` | Role variants |
| `makeCampaignHierarchy` | Campaign → Ad Group → Ad → Creative |
| `makeApprovedInventory` | Review-approved eligible set |
| `makeBudgetPolicy` | Daily/lifetime |
| `makeImpressionClick` | Signed token + events |
| `makeStoreConversionStub` | External order id fact (no Store mutation) |
| `makeExperiment` | Control/variant arms |
| `makeAiProposal` | Pending human approval |

Factories must set **idempotency keys** and **version** fields explicitly.

---

## 9. Determinism and Reproducibility

- Pin `model_version` / `definition_version` in attribution/reporting asserts.
- Avoid `now()` drift: inject clock.
- Stable UUID seeds for bucketing tests.
- Sort assertions on unordered sets.
- Record schema_version on API contract tests.
- Recompute rollups from events in integrity tests rather than relying on wall-clock jobs alone.

---

## 10. Coverage Strategy

| Area | Direction |
|------|-----------|
| Domain rules | High intent coverage on transitions, targeting, budget math |
| RLS/RPC | Critical path 100% of privilege cases (not line %) |
| UI | States matrix from `04` more important than snapshot spam |
| E2E | Breadth limited to release-blocking journeys |
| Thresholds | Exact % **Open Decision** — prefer risk-based gates |

---

## 11. Suites A–R

None of the following suites are claimed as fully implemented for Design V2.

---

### A. Domain Unit Tests

| Focus | Examples |
|-------|----------|
| Membership / roles | canManage vs canApprove vs canMutateSpend |
| Campaign lifecycle | Legal transitions; activate gates |
| Scheduling | end after start; timezone boundary awareness |
| Targeting validation | Prohibited attributes; age floors; pack gates |
| Placement compatibility | Type × placement matrix |
| Creative states | Approved immutability → revision |
| Review decisions | Self-approve denied |
| Budget calculations | Daily/lifetime constraints; minor units |
| Ledger rules | No in-place mutate; credit adjusts |
| Attribution rules | Window eligibility; dedupe |
| Experiment assignment | Stable hash bucketing |
| AI guardrails | Sensitive expand refused; no budget authority |

**MVP:** transitions, targeting, budget, permissions, review self-approve.
**Future:** full attribution models, experiment SRM math helpers.

---

### B. Database and Migration Tests

| Focus | Direction |
|-------|-----------|
| Schema verification | Expected tables/columns exist after slice apply |
| Constraints / indexes | Uniques for dedupe; CHECKs on status |
| Enum/state | Illegal transition rejected at DB or RPC |
| RLS + FORCE | Cross-tenant deny |
| Grants/revokes | anon/public lack ledger writes |
| SECURITY DEFINER | `search_path` pinned; reviewer_id = auth.uid() |
| Idempotency / append-only | Second settle no double charge; audit UPDATE blocked |
| Ordering / forward-fix | Slice A→J order; expand-only rehearsals |

Align with `02_DATABASE_MIGRATIONS_PLAN.md`. Prefer CI apply on ephemeral DB when available.

---

### C. Authorization and Tenant-Isolation Tests

| Attack / case | Expect |
|---------------|--------|
| Cross-tenant read/write | Deny |
| Client-supplied foreign org id | Ignore / forbid |
| Suspended account mutate | Deny |
| Analyst pause campaign | Deny |
| Non-admin `/admin` | Deny |
| service_role not in browser paths | Architectural/contract assert |
| anon Ads APIs | Deny |
| Privilege escalation via role field | Deny |
| Agency access *(Future)* | Only granted orgs |

**Release-blocking** for any Ads management phase that exposes multi-tenant data.

---

### D. Backend Integration Tests

Orchestrate services (`03`) against test DB:

- Campaign create → submit review → approve/reject
- Budget reserve/soft check → settle path
- Event ingest → rollup
- Attribution recalc on conversion stub
- Experiment assign sticky
- AI proposal requires approval before apply
- Admin freeze stops eligibility

**MVP:** create/submit/approve + isolation.
**Future:** full settle + attribution + AI.

---

### E. API and Contract Tests

When public/internal Ads API exists (`16`):

- Validation, error model, pagination, filter/sort
- Idempotency-Key semantics
- Versioning / deprecation headers
- Rate limit behavior (staging)
- Webhook signatures + retry (**Future**)
- Partner scopes; **no moderation bypass**
- Billing read-only; no ledger POST for clients

**MVP:** internal Server Action contracts may substitute until public API ships.

---

### F. Frontend Component Tests

Per `04` states:

- Forms/validation, loading/empty/error/restricted
- Badges, tables, filters, dialogs/drawers
- Charts (a11y data table fallback)
- RTL/LTR smoke
- Accessibility unit checks where feasible

No claim that Ads console components exist yet.

---

### G. Frontend Integration Tests

- Onboarding, wizard draft/resume, upload, reject→resubmit
- Budget setup, reporting filters
- AI accept/reject *(flag)*
- Experiment create *(flag)*
- Admin review decision flow

Use MSW or test DB—**choice Open** with E2E framework.

---

### H. End-to-End Tests

**Release-blocking candidates (phased):**

| Journey | Phase gate |
|---------|------------|
| Signup/onboard → draft campaign | A/B |
| Submit → approval | B |
| Approved → delivery eligibility | C |
| Impression/click/(conversion stub) | C→E |
| Spend vs report recon | D→E |
| Reject → edit → resubmit | B |
| Budget exhaustion hard stop | D |
| Account freeze | M |
| Refund attribution correction | H/E |
| Admin emergency stop | C+M |
| Multi-role (manager vs analyst) | A+ |

Keep E2E count small; stabilize before expanding.

---

### I. Delivery and Hot-Path Tests

- Eligibility correctness (unapproved/frozen/out-of-schedule excluded)
- Timeout → empty (fail-closed)
- Serving token sign/verify/expiry/replay
- Candidate boundaries; frequency caps
- Cache staleness must not serve frozen
- Schedule activate/stop
- Guard: serve path does not call reporting warehouse
- Concurrency on counters; duplicate beacons

**Latency SLO numeric target:** **Open**.

---

### J. Financial Integrity Tests

- Immutable ledger; adjustments via credits
- Reservations vs settlement
- Refunds/credits idempotent
- No direct client mutation
- Rounding/minor units; multi-currency isolation
- Overshoot within **Open** tolerance only; beyond fails closed
- Reconciliation: Σ charges − credits = model balance

**Release-blocking** before Billing settle flag on.

---

### K. Reporting and Attribution Tests

- Preliminary vs finalized labels
- Late/corrected events; IVT adjustments
- Dedupe; timezone day boundaries
- Attribution windows (**defaults Open**)
- Model selection pins
- Paid vs organic ledger separation
- Store order id is truth; Ads cannot update orders
- Refund/cancel reverse
- Reproducibility with pinned versions (`15`)

---

### L. Experiment Tests

- Stable bucketing; allocation sums; eligibility
- Overlap prevention
- SRM detection hooks
- Inconclusive outcome path
- No automatic winner promotion
- AI optimization blocked on running arms (`14`, `11`)

**MVP:** deferred with feature flag.
**Future:** formal stats framework (**Open**).

---

### M. AI Safety and Quality Tests

- Suggestion boundaries; sensitive targeting refusal
- Budget authority denial
- Model/version audit fields present
- Explainability required on accept UI/API
- Rollback of applied draft
- Fallback when model down
- No raw PII in outbound prompts (red-team fixtures)
- Human approval required

**Quality benchmarks methodology:** **Open**.

---

### N. Security Tests

| Class | Examples |
|-------|----------|
| Injection | Targeting JSON, copy fields, RPC params |
| Broken authZ / IDOR | Swap ids across tenants |
| Replay / token forgery | Mutated tracking tokens |
| Upload attacks | MIME spoof, path escape, oversize |
| Malicious creatives | Script-in-SVG policy, etc. |
| Webhook spoofing | Bad HMAC |
| Rate-limit bypass | Multi-ip patterns (staging) |
| Admin confirmations | Emergency stop requires confirm path |
| Secret leakage | Responses/logs must not include service keys |
| Audit completeness | Decision without audit fails |

---

### O. Performance and Load Tests

| Scenario | Watch |
|----------|-------|
| Campaign lists large accounts | p95 list |
| Reporting queries | Timeout/export fallback |
| Event ingestion | Sustained QPS, lag |
| Ad serving | Latency + empty-on-slowness |
| Budget contention | Parallel settles |
| High-volume impressions | Dedupe correctness under load |
| Export jobs | Queue backlog behavior |
| Degradation | Flag off Delivery |

**Tooling:** **Open Decision**.

---

### P. Resilience and Failure Tests

- Queue down; partial outage; stale cache
- DB timeout on serve → empty
- Duplicate jobs; poison events → DLQ
- Delayed reporting; failed asset processing
- Failed billing recon → alert + freeze path
- Rollback/recovery runbooks exercised in staging

**Chaos depth:** **Open**.

---

### Q. Accessibility Tests

- Keyboard, focus traps, screen reader labels
- Contrast; status not color-only
- Reduced motion
- Form error summaries
- Charts/tables alternatives
- RTL smoke (`04`)

Automate where possible; manual checklist for wizard/admin.

---

### R. Localization Tests

- Arabic/English strings present for flagged UI
- RTL/LTR layout
- Dates/currency/numbers
- Long strings (rejection reasons)
- Region policy copy
- Missing translation detection in CI for released namespaces

---

## 12. Test Matrix by Phase A–F

| Phase | Must-pass suites (minimum) |
|-------|----------------------------|
| **A Foundation** | A (subset), B (org/campaign slices), C, F/G onboarding+list, H onboard→draft |
| **B Review** | A review, B review RPC/RLS, C admin gates, D approve/reject, G/H reject→resubmit, N authZ |
| **C Delivery** | I hot-path, H eligibility journey, N tokens, P timeout fail-closed |
| **D Billing** | J financial, D settle integration, H exhaustion stop, N no client ledger write |
| **E Reporting** | K reporting/attribution, D rollups, E API read contracts, G filters |
| **F AI** | M AI safety, L isolation if experiments on, G accept/reject |

Experiments (L) enable under their own flag after C/E honesty.

---

## 13. CI Strategy

| Pipeline stage | Content |
|----------------|---------|
| Fast PR | Lint/typecheck + Ads domain unit + permission/transition tests |
| PR DB *(when available)* | Migration apply + RLS/RPC contract tests |
| PR UI | Component tests for touched Ads UI |
| Protected main/staging | Broader integration + selected E2E |
| Nightly | Perf smoke, full E2E, localization pack, security fuzz subset |

Keep Ads jobs selectable so unrelated PRs aren’t blocked by flagged-off suites—but **never skip** isolation tests if Ads code changes.

---

## 14. Required Checks per Pull Request

**Always when Ads files change:**

1. Domain unit / permissions / transitions
2. No secret scan hits
3. Tenant isolation tests if touching queries/RPC/actions
4. Migration contract tests if touching SQL migrations
5. Typecheck/lint

**Conditionally:**

- UI tests if `app/**/advertise**` or admin ads UI touched (exact paths evolve)
- Hot-path tests if Delivery/eligibility touched
- Ledger tests if billing touched

Exact coverage threshold: **Open**.

---

## 15. Nightly / Scheduled Tests

- Full E2E pack
- Load smoke on staging
- Attribution late-event simulation
- IVT credit path
- Emergency stop drill (staging)
- A11y crawl of console critical paths
- Flaky quarantine report

---

## 16. Staging Validation

Checklist before promoting a phase flag:

- [ ] Synthetic Org A/B isolation spot-check
- [ ] Review approve cannot be done as advertiser
- [ ] Delivery flag off → no consumer ads
- [ ] Delivery flag on → labeled inventory only on allowlisted placements
- [ ] Budget freeze stops eligibility
- [ ] Report freshness labels visible
- [ ] Admin emergency stop

**Staging data volume:** **Open**.

---

## 17. Production Read-Only Verification

- Policy/RLS enabled flags (read-only catalog queries)
- Emergency stop / Delivery flag state
- Settle error rate dashboards
- No interactive destructive tests in prod without break-glass

**Synthetic production checks:** **Open**.

---

## 18. Canary Validation

- Cohort advertisers or % serve traffic
- Watch p95 serve, empty rate, settle lag, IVT spike
- Auto rollback flag if burn alerts fire
- Compare preliminary spend vs ledger within tolerance (**Open** numeric)

---

## 19. Test Data Privacy

- No production PII in fixtures or CI logs
- Hash/redact emails in snapshots
- Customer list uploads: only synthetic hashes
- Restrict staging access; scrub periodically
- AI tests use fake briefs without real user dossiers

---

## 20. Flaky Test Policy

1. Quarantine with ticket + owner within 24h of detection.
2. No silent retry loops hiding races.
3. Fix or delete within agreed SLA; flaky E2E cannot stay required.
4. Prefer determinism (clocks, seeds) over sleeps.

---

## 21. Defect Severity Model

| Sev | Examples | Release impact |
|-----|----------|----------------|
| **S0** | Cross-tenant data leak; arbitrary ledger credit; review bypass to Delivery | Block / rollback |
| **S1** | Double charge; emergency stop broken; token forgery accept | Block Billing/Delivery flags |
| **S2** | Wrong eligibility edge; report recon break beyond SLO | Block phase expand |
| **S3** | UX validation gap; chart a11y | Fix soon; may ship with flag |
| **S4** | Copy/i18n polish | Backlog |

---

## 22. Release Blocking Criteria

Block phase launch when:

- Any open S0/S1 in Ads scope
- Isolation suite failing
- Ledger idempotency failing (if Billing on)
- Serve path not fail-closed on dependency timeout (if Delivery on)
- Admin gate bypassable
- Required PR checks red

Do **not** block on Future-flag suites when flags are off—unless code paths are reachable.

---

## 23. Observability Validation

Tests/staging must verify:

- Correlation ids on Action→RPC
- Audit row exists for review/settle/freeze
- Metrics: serve p95, settle lag, queue age exported
- Alerts wired for emergency stop & settle fail spikes
- Logs free of tokens/secrets/PII

---

## 24. Security Review Gates

| Gate | When |
|------|------|
| Threat model delta | Before Delivery & Billing flags |
| Dependency scan | Every release |
| Manual IDOR pass | Staging before multi-tenant beta |
| Upload/malware path review | Before creative self-serve widen |
| Partner API review | Before public Ads API (`16`) |

---

## 25. Performance Budgets

Directional budgets (numbers **Open** for exact SLO):

| Surface | Budget mindset |
|---------|----------------|
| Ad serve | Tight ms; timeout → empty |
| Eligibility | Sub-serve budget |
| Campaign list | Interactive p95 |
| Report sync query | Cap then force async export |
| Ingest ack | Fast; processing async |

Document measured baselines in phase exit notes when implementing.

---

## 26. Rollback Test Plan

Staging drills:

1. Turn off Delivery flag → inventory disappears; app healthy.
2. Freeze org → eligibility empty.
3. Emergency stop → global empty serve.
4. Revert app to previous artifact with newer additive schema → app still boots (forward-fix).
5. Settle worker pause → no double charge on resume (idempotency).

---

## 27. Risks

| Risk | Mitigation |
|------|------------|
| Testing only happy UI | Mandate C/N/J suites |
| Flaky E2E blocks all merges | Pyramid + quarantine policy |
| Prod data in staging | Synthetic-only policy |
| Scaffolding tests diverge from Design V2 | Explicit reconcile tasks |
| Perf tested too late | Nightly smoke from Phase C |
| AI tests too subjective | Safety/guardrail gates first; quality methodology Open |

---

## 28. Open Decisions

Canonical registry: `01_IMPLEMENTATION_ROADMAP.md` §14 (OD-01…OD-50).

**Testing / QA focus:**

| ID | Question (short) | Options | Recommendation | Owner | Phase | Blocking? |
|----|------------------|---------|----------------|-------|-------|-----------|
| OD-13 | Experiment stats framework | See registry | Defer; no auto-winner | Product + Eng | F+ | Non-blocking until flag |
| OD-34 | Coverage % thresholds | See registry | Risk-based gates | Eng + QA | All | Non-blocking |
| OD-35 | E2E framework depth | See registry | Prefer Playwright ecosystem | Eng + QA | Rel-3+ | Non-blocking |
| OD-36 | Load-testing tool | See registry | Pick before Rel-6 widen | Eng | Rel-3+ | Non-blocking sandbox |
| OD-37 | Browser/device matrix | See registry | Before Rel-8 | QA | Rel-8 | Non-blocking alpha |
| OD-38 | Synthetic production checks | See registry | Read-only + careful synthetic | Eng + Sec | Rel-8 | Non-blocking |
| OD-39 | Staging data volume | See registry | Medium synthetic | Eng | Rel-4 | Non-blocking |
| OD-40 | Chaos-testing depth | See registry | Staging drills first | Eng | Rel-3+ | Non-blocking |
| OD-41 | Warehouse test env | See registry | With OD-21 | Data Eng | E+ | Non-blocking |
| OD-42 | AI quality benchmarks | See registry | After safety gates | Product + Eng | F | Non-blocking |
| OD-43 | Serving latency SLO | See registry | Set before Rel-6 | Eng | Rel-3–6 | Blocking widen |
| OD-44 | Reporting freshness SLA | See registry | Set before Rel-8 | Eng + Product | E–8 | Blocking Public MVP claims |

---

## 29. Acceptance Criteria

This plan is accepted when:

- [x] Suites A–R defined with MVP/Future sense
- [x] Pyramid, envs, fixtures, determinism, coverage approach stated
- [x] Phase A–F matrix + CI/PR/nightly/staging/canary/prod read-only covered
- [x] Privacy, flakes, severity, release blockers, observability, security gates, perf budgets, rollback drills included
- [x] Open Decisions explicit
- [x] No executable tests authored by this task; no claim Design V2 suite is complete
- [x] Convertible into test files and CI jobs later
- [x] Linked to `01`–`04` and security/attribution/reporting/API design docs

**Future implementation acceptance:** each Ads phase exit cites this matrix row and attaches evidence (CI links) for must-pass suites.

---

## Related Documents

- `01_IMPLEMENTATION_ROADMAP.md` — phase gates
- `02_DATABASE_MIGRATIONS_PLAN.md` — RLS/RPC/ledger verification
- `03_BACKEND_SERVICES_PLAN.md` — service failure modes to test
- `04_FRONTEND_PLAN.md` — UI state matrix & a11y
- `../08_SECURITY.md` · `../13_ATTRIBUTION_ENGINE.md` · `../14_EXPERIMENT_PLATFORM.md`
- `../15_ENTERPRISE_REPORTING.md` · `../16_ADS_API_AND_INTEGRATIONS.md`

---

## Document Control

| Item | Value |
|------|-------|
| Planning version | Implementation Planning V1 — Testing |
| Authoring mode | Documentation only |
| Next siblings | Per-phase test task checklists; CI workflow specs |
