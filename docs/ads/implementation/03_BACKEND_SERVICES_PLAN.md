# UMTUBA Ads — Backend Services Plan

**Document type:** Implementation planning — domain service / module boundaries
**Repository:** `umtuba-web`
**Branch context:** `office/ads-design-v2`
**Status:** Planning only — **does not claim** these services are implemented
**Constraint:** No executable code, SQL, or OpenAPI in this document

**Normative inputs:** `../02_SYSTEM_ARCHITECTURE.md`, `../06_BUDGET_SYSTEM.md`, `../07_REPORTING.md`, `../08_SECURITY.md`, `../11_AI_ADVERTISING_ENGINE.md`, `../13_ATTRIBUTION_ENGINE.md`, `../14_EXPERIMENT_PLATFORM.md`, `../16_ADS_API_AND_INTEGRATIONS.md`
**Program plans:** `01_IMPLEMENTATION_ROADMAP.md`, `02_DATABASE_MIGRATIONS_PLAN.md`

---

## 1. Executive Summary

This plan defines **logical backend services (or modular-monolith units)** that implement Ads Design V2 behind clear seams. Physical deployment may start as modules under a single Next.js + Postgres/Supabase process and later extract hot paths (Delivery, Event Ingestion)—timing is an **Open Decision**.

**Core idea:** separate **management plane** (advertisers, campaigns, creatives, review, budgets) from **data plane** (eligibility, serving, event ingest), and keep **money / review / freezes** on privileged RPC paths with audit and idempotency.

| Plane | Services (letters) | Latency mindset |
|-------|--------------------|-----------------|
| Management | A–E, K–M (partial) | Human-scale |
| Data / hot | F, G, H | Milliseconds–seconds |
| Analytics | I, J | Eventual / batch |
| Intelligence | L (+ K) | Async + human gates |

Aligns with roadmap phases: A/B → Account+Campaign+Creative+Review; C → Eligibility+Serving+Ingest; D → Billing settle; E → Reporting+Attribution; F → AI (+ Experiments later).

---

## 2. Scope

| In scope | Out of scope |
|----------|----------------|
| Service responsibilities and non-responsibilities | Writing `lib/` or `app/` code |
| Sync vs async contracts (conceptual) | Choosing queue/warehouse vendors |
| AuthZ boundaries, idempotency, audit, failures | OpenAPI schemas |
| Server Actions vs RPC orchestration rules | Exact auction coefficients |
| Jobs, caching, consistency, observability, rollout | Mutations to Store orders / Live sessions |
| MVP vs Future per service | Claiming runtime existence today |

---

## 3. Non-Goals

- Implementing microservices before seams prove necessary.
- Putting heavy rollups on the Ad Serving hot path.
- Letting Server Actions perform privileged ledger/review writes without RPC.
- Autonomous AI spend or auto-winner experiment promotion by default.
- External DSP integration.
- Closing Open Decisions silently inside service designs.

---

## 4. Backend Design Principles

1. **Seams first, extraction later** — Same boundaries whether monolith module or process.
2. **Fail-closed Delivery** — Errors omit ads; never break Watch/Discover/Store.
3. **DB is authority for money and review** — App orchestrates; RPCs mutate.
4. **Tenant isolation everywhere** — Org id from membership, not client trust.
5. **Idempotent side effects** — Settle, ingest, attribution, freeze.
6. **Append-only ledgers and decisions** — Corrections via new facts.
7. **Hot path stays thin** — No warehouse queries in Ad Serving.
8. **Policy packs by region** — Eligibility and targeting legality are data + rules, not hardcoding.
9. **Store/Live are upstream systems of record** — Ads reads conversion signals; does not write orders/sessions.
10. **Observability with privacy** — Correlate requests; never log PII/raw customer lists.
11. **Feature flags per capability** — Delivery, settle, AI assist, experiments.
12. **Reconcile early scaffolding** — Extend existing Ads modules rather than forking a second stack (`01` §2.3).

---

## 5. Service Boundaries

```text
Advertiser Console / Admin / Placement BFFs / (Future Public Ads API)
        │
        ▼
┌─────────────────── Management plane ───────────────────┐
│ A Account │ B Campaign │ C Creative │ D Review │ E Budget │
│ K Experiment │ L AI │ M Admin/Enforcement                 │
└───────────────────────────┬─────────────────────────────┘
                            │ eligibility reads / flags
┌─────────────────── Data plane ─────────────────────────┐
│ F Eligibility │ G Ad Serving │ H Event Ingestion         │
└───────────────────────────┬─────────────────────────────┘
                            │ events
┌─────────────────── Analytics plane ────────────────────┐
│ I Reporting Pipeline │ J Attribution                     │
└────────────────────────────────────────────────────────┘
```

**Ownership rule:** each aggregate has one writer service; others consume events or read models.

---

## 6. Internal Contracts

Conceptual contract families (not OpenAPI):

| Contract | Producer → Consumer | Nature |
|----------|---------------------|--------|
| `AdvertiserOrgStateChanged` | A → B,D,E,M | Event |
| `CampaignHierarchyChanged` | B → F,G,K,L | Event |
| `CreativeReady` / `CreativeReviewState` | C/D → F,G | Event |
| `BudgetPolicyChanged` / `BudgetFrozen` | E/M → F,G | Event + sync read |
| `ReviewDecisionMade` | D → B,C,F | Event |
| `AdServeRequest/Response` | Placement BFF ↔ G | Sync |
| `EligibilityQuery` | G → F | Sync (cached) |
| `DeliveryBeacon` | Client → H | Sync ingest |
| `BillableEventSettled` | E → I | Event |
| `ConversionObserved` | Store/Live bridge → J | Event |
| `AttributionResultReady` | J → I | Event |
| `AiProposalSubmitted` | L → B/C (after human approve) | Sync apply |
| `EmergencyStop` | M → F,G | Sync flag + event |

Version all event payloads with `schema_version`.

---

## 7. Request versus Event-driven Responsibilities

| Style | Use for |
|-------|---------|
| **Synchronous request** | CRUD drafts, serve ad, ingest beacon ack, admin freeze, eligibility check |
| **Asynchronous event / job** | Transcode, rollups, attribution, IVT credit, pacing refresh, notifications, export jobs |

**Rule:** user-visible mutations that change money, review, or freeze state must complete durable authority (RPC/commit) before returning success; fan-out notifications may be async.

---

## 8. Services / Modules (A–M)

Each subsection uses the same template. **None of these are claimed as currently shipped.**

---

### A. Advertiser Account Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Orgs, membership, roles, invitations, account state, ownership validation, membership audit events |
| **Non-responsibilities** | Campaign content, billing settle, serving, Store KYC systems of record (may mirror verification tier) |
| **Inputs** | Auth user, invite tokens, role change requests |
| **Outputs** | Org profiles, member lists, state; `AdvertiserOrgStateChanged` |
| **Data ownership** | AdvertiserOrg, Member, Invitation, Verification stub |
| **Synchronous APIs** | Create org, invite, accept, change role, submit for review |
| **Asynchronous events** | Org approved/suspended/frozen fan-out |
| **Authorization** | Owner/Admin for members; platform admin for force suspend via M |
| **Idempotency** | Accept-invite; create-org with Idempotency-Key |
| **Audit** | Role grants, ownership transfers, status submits |
| **Failure modes** | Duplicate invite, last-owner removal blocked |
| **Retry rules** | Safe retry on idempotent creates |
| **Timeouts** | Short human CRUD |
| **Observability** | Tenant create rate, invite convert rate |
| **MVP** | Org + roles + invite + status |
| **Future** | Agency multi-org, API keys (`16`) |

---

### B. Campaign Management Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Campaigns, Ad Groups, Ads, lifecycle, scheduling, validation, placement/targeting references, versioning, optimistic concurrency |
| **Non-responsibilities** | Serving rank, ledger settle, creative bytes, review decisions |
| **Inputs** | Hierarchy drafts, TargetingSpec, placement ids from Registry |
| **Outputs** | Hierarchy read models; `CampaignHierarchyChanged` |
| **Data ownership** | Campaign, AdGroup, Ad, DestinationRef, TargetingSpec versions |
| **Synchronous APIs** | CRUD draft, pause/resume (non-delivery), submit-for-review |
| **Asynchronous events** | Schedule activation/stop jobs consume status |
| **Authorization** | Campaign Manager+ write; Analyst read |
| **Idempotency** | Create with key; updates use `row_version` / etag |
| **Audit** | Material field changes, submits |
| **Failure modes** | Stale version conflict; invalid placement ref |
| **Retry rules** | Conflict → client reload; no blind overwrite |
| **Timeouts** | Human-scale |
| **Observability** | Conflict rate, submit volume |
| **MVP** | Commercial campaigns, basic targeting/placements |
| **Future** | Structured vertical payloads, experiments linkage |

---

### C. Creative and Asset Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Upload initiation, ownership, processing states, transcode/scan hooks, localization, moderation linkage, active-use delete protection |
| **Non-responsibilities** | Final Review approve (D), serving CDN edge config, AI generation (L may write variants via this service) |
| **Inputs** | Upload session requests, processing webhooks |
| **Outputs** | Asset/Creative ready states; `CreativeReady` |
| **Data ownership** | Asset, AssetVersion, Creative, links |
| **Synchronous APIs** | Start upload, attach creative, archive |
| **Asynchronous events** | Scan/transcode jobs; virus reject |
| **Authorization** | Org members by role; path scoped to org |
| **Idempotency** | Finalize processing by asset version id |
| **Audit** | Upload, state transitions, delete denials |
| **Failure modes** | Scan fail, orphan upload, delete blocked when Ad active |
| **Retry rules** | Transcode with backoff; poison → rejected |
| **Timeouts** | Upload URL short TTL |
| **Observability** | Time-to-ready, reject rates |
| **MVP** | Image/video + bind to Ad |
| **Future** | Full Asset Library, AI provenance |

---

### D. Review and Moderation Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Submit-for-review, queues, policy decisions, rejection reasons, appeals, escalations, reviewer RBAC, immutable decision history |
| **Non-responsibilities** | Writing campaign creative bytes, charging budgets, serving |
| **Inputs** | Submit requests; admin decision commands |
| **Outputs** | Decision facts; `ReviewDecisionMade` |
| **Data ownership** | ReviewCase, Decision, Appeal, PolicyCode usage |
| **Synchronous APIs** | Submit; admin approve/reject/suspend/restore |
| **Asynchronous events** | Notify advertiser; re-review triggers |
| **Authorization** | Advertiser cannot approve; platform admin / moderator roles only |
| **Idempotency** | Decision commands keyed by case+action+version |
| **Audit** | Mandatory same-transaction as status change |
| **Failure modes** | Double-approve, missing reason |
| **Retry rules** | Safe idempotent admin retry |
| **Timeouts** | Queue SLA monitored, not request-blocking |
| **Observability** | Queue age, decision mix, appeal rate |
| **MVP** | Account/campaign/creative review |
| **Future** | Continuous review automation assist |

---

### E. Budget and Billing Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Budget config, reservations/counters, pacing snapshots, spend ledger writes, prepaid balance and/or postpaid hooks, credits, reconciliation, adjustments, hard-stop/freeze; **no direct client ledger writes** |
| **Non-responsibilities** | Ranking ads, Store payment capture, creator payouts |
| **Inputs** | BudgetPolicy updates; billable candidates from H/E settle path; freeze from M |
| **Outputs** | Remaining budget reads; `BillableEventSettled`, `BudgetExhausted`, `BudgetFrozen` |
| **Data ownership** | BillingAccount, BudgetPolicy, BillingEvent, CreditEvent, counters |
| **Synchronous APIs** | Set budget; read remaining; freeze; settle (worker/service) |
| **Asynchronous events** | Reconciliation, low-balance alerts |
| **Authorization** | Billing Manager/Owner for funding; settle is service-only |
| **Idempotency** | Settle/credit by event id — P0 |
| **Audit** | All funding, settle, credit, freeze |
| **Failure modes** | Insufficient funds, overshoot race, double settle |
| **Retry rules** | Exactly-once via uniqueness; retry returns prior result |
| **Timeouts** | Settle path bounded; fail closed for charge |
| **Observability** | Settle lag, credit rate, freeze count |
| **MVP** | Shell budgets + soft checks; settle when Phase D opens |
| **Future** | Invoicing, dual-control credits |

**Open:** prepaid vs postpaid; overshoot tolerance (`06`).

---

### F. Delivery Eligibility Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Candidate eligibility: status, schedule, budget soft-check, policy, frequency, placement compatibility, country/legal packs; fail-closed |
| **Non-responsibilities** | Final rank/auction math ownership (interface to ranker), event ingest, rollups |
| **Inputs** | User/request context (coarse), placement_id, org inventory snapshots |
| **Outputs** | Eligible candidate set / denial reasons (internal) |
| **Data ownership** | Read models / caches fed by B,C,D,E,M; FrequencyCap counters shared carefully |
| **Synchronous APIs** | `EligibilityQuery` for G |
| **Asynchronous events** | Invalidate on hierarchy/review/budget/freeze |
| **Authorization** | Called by serving infrastructure, not advertisers |
| **Idempotency** | Pure query + counter increments must be race-safe |
| **Audit** | Sampled denial reasons; not every serve |
| **Failure modes** | Dependency timeout → **empty set** (fail-closed) |
| **Retry rules** | Serving should not deep-retry eligibility long |
| **Timeouts** | Hard low ms budget |
| **Observability** | Empty-rate, timeout-rate, freeze hits |
| **MVP** | Rules + flags; Discover/approve-only |
| **Future** | Richer policy packs, AI audience membership |

---

### G. Ad Serving Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Request contract, candidate selection via F, ranking **interface**, creative response, serving/tracking token, timeout/fallback, cache; **no heavy reporting queries** |
| **Non-responsibilities** | Ledger settle, review, campaign CRUD, warehouse |
| **Inputs** | Placement BFF request (auth context, device, locale, placement_id) |
| **Outputs** | Creative payload + tokens; async opportunity logs optional |
| **Data ownership** | None durable except token mint metadata as needed |
| **Synchronous APIs** | Serve |
| **Asynchronous events** | Opportunity/serve logs → H |
| **Authorization** | End-user session; rate limits; no advertiser data leakage beyond creative |
| **Idempotency** | Token mint unique per impression opportunity |
| **Audit** | Minimal; fraud sampled |
| **Failure modes** | Ranker down → rules fallback or empty; always degrade to organic |
| **Retry rules** | No multi-second retry on user request |
| **Timeouts** | Strict deadline; return empty |
| **Observability** | p95 serve latency, fill rate, error rate, fallback rate |
| **MVP** | Single/simple rank stub; 1–N slots |
| **Future** | Full auction (**Open** formula), multi-placement packs |

---

### H. Event Ingestion Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Impressions, views, clicks, conversions (bridge), delivery beacons; dedupe, validation, late events, retries, poison handling, replay, schema versioning |
| **Non-responsibilities** | Rollup SQL, attribution model choice UI, serving creatives |
| **Inputs** | Client beacons with signed tokens; server conversion facts |
| **Outputs** | Validated event stream; rejects; `DeliveryBeaconAccepted` |
| **Data ownership** | Raw event append tables / stream |
| **Synchronous APIs** | Ingest endpoints (ack quickly) |
| **Asynchronous events** | Forward to E settle, I rollup, J attribution |
| **Authorization** | Valid token + rate limit; service-role for conversion bridge |
| **Idempotency** | Dedupe keys mandatory |
| **Audit** | Poison queue samples |
| **Failure modes** | Invalid token, replay, clock skew, poison payload |
| **Retry rules** | At-least-once upstream → dedupe; DLQ after N |
| **Timeouts** | Fast ack; process async |
| **Observability** | Ingest QPS, dedupe hit, poison rate, lag |
| **MVP** | Impression + click (+ view if video) |
| **Future** | Rich conversion types, replay tooling |

---

### I. Reporting Pipeline

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Preliminary vs finalized metrics, rollups, IVT adjustments, freshness labels, warehouse boundary, correction jobs; **no OLTP-heavy dashboards** |
| **Non-responsibilities** | Live serving, mutating campaigns |
| **Inputs** | Events from H; settles/credits from E; attribution from J |
| **Outputs** | Rollup read models; export jobs; freshness metadata |
| **Data ownership** | Aggregate marts / export job records |
| **Synchronous APIs** | Query small ranges; enqueue large exports |
| **Asynchronous events/jobs** | Hourly/daily rollups; finalize after IVT window |
| **Authorization** | Org-scoped reads; analyst+; admin auditor |
| **Idempotency** | Rollup jobs by period key |
| **Audit** | Export access |
| **Failure modes** | Lag, recon break vs ledger |
| **Retry rules** | Recompute from events |
| **Timeouts** | Sync queries capped; else async |
| **Observability** | Freshness lag, recon delta |
| **MVP** | Spend/impr/click/CTR/CPC/CPM |
| **Future** | Enterprise cuts (`15`); warehouse (**Open**) |

---

### J. Attribution Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Touchpoints, conversion matching, models, refund/cancel adjustments, late corrections, paid vs organic **separation**, Store as purchase truth |
| **Non-responsibilities** | Charging ads, creator commission payout execution, editing Store orders |
| **Inputs** | Ads touches (H); Store/Live conversion facts (ids + amounts) |
| **Outputs** | AttributionResult; reversals; feeds I |
| **Data ownership** | Attribution results + model versions |
| **Synchronous APIs** | Limited debug; primarily async |
| **Asynchronous events** | `ConversionObserved` → apply; refund → reverse |
| **Authorization** | Service workers; advertisers see aggregates only |
| **Idempotency** | `(conversion_id, model_version)` |
| **Audit** | Model version changes; manual overrides (rare, dual control) |
| **Failure modes** | Missing click id; cross-device gap; late arrival |
| **Retry rules** | Replay within policy; watermark lag labeled |
| **Timeouts** | Batch-friendly |
| **Observability** | Match rate, reverse rate, lag |
| **MVP** | Last paid click foundation |
| **Future** | Multi-touch, data-driven (**Open** windows/conflict) |

---

### K. Experiment Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Registry, eligibility, stable bucketing, overlap prevention, results metadata; **no automatic winner promotion by default** |
| **Non-responsibilities** | Serving ranker training, AI copy generation |
| **Inputs** | Experiment definitions; unit ids for assign |
| **Outputs** | Arm assignment; locks to L/B |
| **Data ownership** | Experiment, Arm, Assignment, ResultMeta |
| **Synchronous APIs** | Create/start/pause; assign |
| **Asynchronous events** | SRM alerts; completion |
| **Authorization** | Campaign Manager+; platform experiments isolated |
| **Idempotency** | Sticky assignment per unit |
| **Audit** | Start/stop/apply-winner (explicit) |
| **Failure modes** | Overlap, SRM, arm creative rejected |
| **Retry rules** | Assign is deterministic retry-safe |
| **Timeouts** | Assign in serve path must be cheap or precomputed |
| **Observability** | SRM, sample size |
| **MVP** | Deferred until after Delivery honesty |
| **Future** | Bandits (**Open** stats framework) |

---

### L. AI Recommendation Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Campaign/creative suggestions, optimization recommendations, model/version audit, human approval, rollback; **no autonomous budget authority** |
| **Non-responsibilities** | Final Review approve, settle, serve |
| **Inputs** | Briefs, aggregates (I), asset library (C) |
| **Outputs** | Suggestions/Proposals; apply only after approval → B/C |
| **Data ownership** | AiSuggestion, AiProposal, ModelVersion refs |
| **Synchronous APIs** | Generate draft; approve/reject proposal |
| **Asynchronous events** | Fatigue alerts; batch diagnosis |
| **Authorization** | Org roles; cannot bypass D |
| **Idempotency** | Proposal ids; apply once |
| **Audit** | Prompt/model version, accept/reject |
| **Failure modes** | Model outage → manual builder; policy strip |
| **Retry rules** | Generation best-effort |
| **Timeouts** | Soft; UX fallback |
| **Observability** | Accept rate, block rate, kill-switch |
| **MVP** | Rules + assisted copy later |
| **Future** | Optimization proposals; auto-apply **Open** |

---

### M. Admin and Enforcement Service

| Dimension | Plan |
|-----------|------|
| **Responsibilities** | Freezes, suspensions, emergency stops, incidents, policy overrides, platform-admin-only ops, audit logging |
| **Non-responsibilities** | Day-to-day campaign editing for advertisers |
| **Inputs** | Admin commands; fraud signals |
| **Outputs** | Freeze/stop flags; `EmergencyStop`; incidents |
| **Data ownership** | Freeze, Incident, BreakGlass, GlobalAudit |
| **Synchronous APIs** | Freeze org/campaign; emergency stop Delivery |
| **Asynchronous events** | Notify billing/eligibility caches invalidate |
| **Authorization** | `require_platform_admin` (+ finer roles later) |
| **Idempotency** | Freeze commands keyed |
| **Audit** | Mandatory |
| **Failure modes** | Non-admin attempt; stop without recovery runbook |
| **Retry rules** | Idempotent enforce |
| **Timeouts** | Must be fast to halt drain |
| **Observability** | Active freezes, stop state |
| **MVP** | Freeze + emergency Delivery stop |
| **Future** | Incident workflows, dual-control credits with E |

---

## 9. Server Actions Strategy

For `umtuba-web` advertiser/admin UI (**when implemented**):

| May use Server Actions | Must not |
|------------------------|----------|
| Thin orchestration: auth session → validate → call domain/RPC | Embed service_role keys in client-reachable paths |
| Map domain errors to safe UI messages | Direct SQL to ledgers/review tables |
| Enforce CSRF/session patterns of the app | Bypass Review submit gates |
| Idempotency-Key forwarding on creates | Trust client-supplied `advertiser_org_id` without membership check |

**Validation:** zod/domain validators before RPC.
**Auth:** session user → membership/role → proceed.
**Errors:** validation/auth/policy/conflict distinguished; no internal stack traces to clients.
**Privilege:** Server Actions are **not** a substitute for SECURITY DEFINER RPC authority on money/review/freeze.

Public Ads API (`16`) later mirrors the same orchestration rules with scopes.

---

## 10. RPC Strategy

Matches `02_DATABASE_MIGRATIONS_PLAN.md` §10:

- RPC-only for review, settle, credit, freeze, emergency stop, ingest (or tightly gated service ingest), attribution apply, AI proposal apply.
- `REVOKE` broad writes; `GRANT EXECUTE` minimally.
- Pin `search_path`.
- Domain validation inside RPC.
- Audit in same transaction.
- Idempotency keys.
- No client-controlled ownership fields.
- `service_role` / worker only for settle/rollup/bridge—not browser.

---

## 11. Background Jobs and Queues

| Job | Producer trigger | Notes |
|-----|------------------|-------|
| Asset processing | C upload finalize | Retry → DLQ → rejected asset |
| Review notifications | D decision | At-least-once |
| Budget reconciliation | E periodic | Compare counters vs ledger |
| Pacing refresh | E/F | Soft eligibility signals |
| Reporting rollups | I | Idempotent period keys |
| Attribution recalc | J | On model version or late event |
| IVT adjustments | Fraud → E credit | Dual-control later |
| Schedule activate/stop | B timers | Respect Review+Budget |
| Export jobs | I | Large reports |

**Retry / DLQ:** exponential backoff; poison quarantine; replay tools for H/J.
**Provider choice:** **Open Decision** (in-process, queue product, etc.).

---

## 12. Realtime Strategy

| Realtime-friendly | Not realtime |
|-------------------|--------------|
| Review status to advertiser (low volume) | Raw impression firehose |
| Budget remaining coarse updates | Per-click advertiser push |
| Admin freeze acknowledgements | Rollup recompute streams |
| Optional dashboard “freshness” heartbeat | High-cardinality geo ticks |

**Transport boundaries:** **Open Decision** (Supabase realtime vs poll vs SSE). Prefer poll/short query for MVP dashboards.

---

## 13. Caching Strategy

| Cache | TTL mindset | Invalidation |
|-------|-------------|--------------|
| Placement Registry | Long | On registry change |
| Eligibility snapshots | Short | Review/budget/freeze/hierarchy events |
| Creative metadata | Medium | Creative version change |
| Budget remaining | Very short | Settle/freeze |
| AuthZ membership | Short | Role change |

**Rules:** never cache “is platform admin” without short TTL + DB recheck on privileged ops; stale eligibility may underserve (acceptable) but must not serve frozen/unapproved inventory (prefer fail-closed refresh).

---

## 14. Consistency Model

| Area | Consistency |
|------|--------------|
| Review decisions, freezes, ledger settle | **Strong** (single transaction) |
| Campaign draft edits | Strong per aggregate + optimistic concurrency |
| Eligibility/serve | Read-your-writes best effort via cache invalidation; may lag seconds |
| Reporting | **Eventual**; preliminary → finalized |
| Attribution | Eventual with watermarks |
| AI suggestions | Durable when stored; apply is strong on target aggregate |

Financial integrity > serve freshness.

---

## 15. Error Model

| Class | Client meaning |
|-------|----------------|
| Validation | Fix input |
| Authorization | Forbidden / not member |
| Policy | Region/vertical pack blocked |
| Budget | Exhausted / frozen / insufficient funds |
| Conflict / version | Reload and retry |
| Transient | Retry with backoff |
| System | Safe generic failure; empty serve on data plane |

User-facing messages omit internal hostnames, SQL, and token secrets. Internal logs keep `correlation_id` + error codes.

---

## 16. Observability

| Signal | Use |
|--------|------|
| Structured logs | service, org_id (not PII), action, outcome |
| Correlation IDs | Across Action → RPC → job |
| Metrics | Serve p95, fill, settle lag, queue age, ingest poison |
| Traces | Hot path G↔F |
| Audit logs | Security/money/review (separate retention) |
| Alerting | Emergency stop flips, settle failure spike, RLS/auth anomalies |
| SLO candidates | Serve availability (degrade empty ok), settle success, review RPC success |
| Privacy | No customer list payloads, no raw email in logs |

---

## 17. Security

- Tenant isolation on every management API.
- Least privilege roles (`08`).
- Service-to-service auth for workers (**Open** mechanism detail).
- Secrets in KMS/env—not in events.
- Replay protection via signed serving/tracking tokens + expiry.
- Rate limits on ingest, login, invite, export.
- Abuse: velocity IVT hooks feeding E/M.
- Admin: platform-admin RPC only; no self-promotion.
- AI: no raw PII to models (`11`).

---

## 18. Deployment and Rollout

| Tactic | Use |
|--------|-----|
| Feature flags | Delivery, settle, AI, experiments |
| Service-by-service | Ship A–D management before G |
| Shadow mode | Eligibility/rank compute not shown |
| Dark launch | Ingest+rollup without advertiser UI |
| Canary | Cohort advertisers / % traffic |
| Rollback | Flag off; forward-fix schema (`02`) |
| Schema compat | App tolerates additive columns |

Extraction of G/H to separate processes only when metrics demand (**Open** timing).

---

## 19. Risks

| Risk | Mitigation |
|------|------------|
| Monolith blur of seams | Enforce module boundaries + CODEOWNERS later |
| Serve path calling Reporting | Ban in review checklist |
| Server Actions privilege creep | RPC-only money/review |
| Cache serving frozen ads | Fail-closed invalidation + short TTL |
| Queue outage stalls settle | Durable outbox; alert; pause Delivery if needed |
| Attribution fighting creator commerce | Separate ledgers (`13`) |
| AI auto-apply accidents | Default human approval |
| Early scaffolding divergence | Reconcile per `01`/`02` |

---

## 20. Open Decisions

Canonical registry: `01_IMPLEMENTATION_ROADMAP.md` §14 (OD-01…OD-50).

**Backend / runtime focus:**

| ID | Question (short) | Options | Recommendation | Owner | Phase | Blocking? |
|----|------------------|---------|----------------|-------|-------|-----------|
| OD-01 | Auction/ranking model | See registry | Rules stub first | Eng + Product | C+ | Blocking scaled yield |
| OD-05 | Prepaid vs postpaid | See registry | Prepaid candidate | Finance + Product | D | Blocking settle |
| OD-06 | Overshoot tolerance | See registry | Numeric SLA | Finance + Eng | D | Blocking settle |
| OD-08 | External DSP | See registry | None through MVP | Product + Sec | Rel-9+ | Non-blocking MVP |
| OD-11 | Attribution windows | See registry | Pin at E | Product + Eng | E | Blocking CPA |
| OD-12 | AI auto-optimize authority | See registry | Human-only default | Product + Sec | F | Blocking if auto on |
| OD-19 | Monolith vs extract timing | See registry | Seams first | Eng | C+ | Non-blocking |
| OD-20 | Queue/provider | See registry | Before prod workers | Eng | C–D | Blocking settle workers |
| OD-21 | Warehouse/provider | See registry | Postgres MVP | Eng + Data | E | Non-blocking MVP |
| OD-22 | Realtime transport | See registry | Poll MVP | Eng + Frontend | Rel-1+ | Non-blocking |

---

## 21. Acceptance Criteria

This plan is accepted when:

- [x] Services A–M documented with responsibilities, non-responsibilities, IO, ownership, sync/async, authZ, idempotency, audit, failures, retries, timeouts, observability, MVP/Future
- [x] Cross-cutting Server Actions, RPC, jobs, realtime, cache, consistency, errors, observability, security, rollout covered
- [x] No code/SQL/OpenAPI; no claim of current runtime existence
- [x] Open Decisions explicit
- [x] Traceable to Design V2 + Implementation docs `01`/`02`
- [x] Convertible into independent implementation tasks per service letter

**Future implementation acceptance:** each service task cites this letter (A–M), ships behind flags where needed, and includes authZ + idempotency tests for privileged paths.

---

## Related Documents

- `01_IMPLEMENTATION_ROADMAP.md` — phase ordering
- `02_DATABASE_MIGRATIONS_PLAN.md` — schema slices matching these services
- `../02_SYSTEM_ARCHITECTURE.md` — logical architecture
- `../06_BUDGET_SYSTEM.md` · `../07_REPORTING.md` · `../08_SECURITY.md`
- `../11_AI_ADVERTISING_ENGINE.md` · `../13_ATTRIBUTION_ENGINE.md` · `../14_EXPERIMENT_PLATFORM.md`
- `../16_ADS_API_AND_INTEGRATIONS.md` — future public façade over these services

---

## Document Control

| Item | Value |
|------|-------|
| Planning version | Implementation Planning V1 — Backend Services |
| Authoring mode | Documentation only |
| Next siblings | Frontend/console plan, Delivery runtime plan, or per-service tasking docs |
