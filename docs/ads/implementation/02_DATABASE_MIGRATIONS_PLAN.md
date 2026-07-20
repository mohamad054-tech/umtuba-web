# UMTUBA Ads — Database Migrations Plan

**Document type:** Implementation planning — schema rollout sequence
**Repository:** `umtuba-web`
**Branch context:** `office/ads-design-v2`
**Status:** Planning only — **does not create or authorize** migration files
**Constraint:** No executable SQL in this document; no claims that Design V2 tables are already live as specified here

**Normative design inputs:** `../09_DATABASE_BLUEPRINT.md`, `../08_SECURITY.md`, `../06_BUDGET_SYSTEM.md`, `../13_ATTRIBUTION_ENGINE.md`
**Program plan:** `01_IMPLEMENTATION_ROADMAP.md` (Phases A–F)

---

## 1. Executive Summary

This plan turns Ads Design V2’s conceptual model into a **migration-by-migration** delivery sequence for Postgres/Supabase-style environments used by `umtuba-web`.

**Intent**

- Ship schema in **additive, fail-closed** slices that match Implementation Phases A→F.
- Prefer **SECURITY DEFINER RPCs** for status transitions, ledgers, review, freezes, and settlement.
- Keep **append-only** financial and audit facts; correct via adjustment rows, not rewrites.
- Align naming with Design V2 (**Campaign / Ad Group / Ad / Creative / Placement Registry / Billing Account**) while **reconciling** any earlier foundation scaffolding already present in-repo (see §4.3)—without restating or modifying those files here.

**MVP vs future**

| Horizon | Schema focus |
|---------|----------------|
| **MVP** | Advertiser tenancy, campaign hierarchy, creatives, review, placement registry, event contracts, budget shells, basic rollups |
| **Near future** | Real billing settlement, attribution results, IVT credits, pacing state |
| **Later** | AI audit, experiments, warehouse-oriented exports, partitioning at justified scale |

Open product decisions (auction formula, prepaid vs postpaid, attribution windows, warehouse vs Postgres-only reporting, etc.) remain **explicitly open**—migrations must not silently freeze them as irreversible product law.

---

## 2. Scope

| In scope | Out of scope for this doc |
|----------|---------------------------|
| Logical migration packages A–J | Writing `.sql` migration files |
| Entity introduction order | Application code in `app/` / `lib/` |
| RLS / grants / RPC **direction** | Executable DDL/DML samples |
| Index / constraint / idempotency strategy | Choosing final auction coefficients |
| Verification, rollout, risks | Creating Store/Live/order tables |
| Compatibility with future advertisers | Force-closing Open Decisions |

---

## 3. Non-Goals

- Authoring or editing anything under `supabase/migrations/`.
- Claiming Design V2 entities already exist in production as named here.
- Embedding OpenAPI, ORM mappings, or vendor-specific warehouse DDL.
- Perfect cross-device identity schema.
- External DSP inventory tables.
- Creator payout ledgers owned by Ads (commission stays Store/creator systems).
- Using client `UPDATE` to mutate ownership, spend, or review decisions.

---

## 4. Migration Design Principles

1. **Additive first** — Prefer new tables/columns/functions over destructive renames; use compatibility views/shims when reconciling naming.
2. **Fail-closed RLS** — Enable + FORCE RLS; default deny; explicit policies only.
3. **Money and review are RPC-only** — No direct `INSERT/UPDATE` grants on ledgers, review decisions, freezes, or settlement.
4. **Integer minor units + ISO currency** — Never float money.
5. **UTC storage** — Advertiser timezone is a field for daily budget boundaries, not a reason to store local wall times as truth.
6. **Append-only facts** — Billing, credits, audit, IVT marks, attribution corrections.
7. **Idempotency keys** — Unique constraints on business event ids.
8. **`search_path = public`** (or pinned) on SECURITY DEFINER functions.
9. **Revoke from `anon` / `public`** aggressively; grant `authenticated` only what membership allows.
10. **No client-controlled ownership** — `advertiser_org_id` / account id comes from membership checks inside RPC, not request body trust.
11. **Feature flags in app config**, not “half-open” tables without RLS.
12. **Forward-fix preferred** — Expand then contract; avoid rollbacks that delete ledger history.

### 4.1 Repo migration naming pattern *(guidance only)*

Observed style in `supabase/migrations/`: `YYYYMMDD_<domain>_<feature>_vN.sql` (e.g. dated `ads_*_foundation_v1` files).

**Proposed Ads series prefix:** `YYYYMMDD_ads_<slice>_v1.sql` with monotonic dates after the latest Ads-related migration when implementation begins.

### 4.2 Reconciliation note *(not a claim of completeness)*

Early Ads foundation and admin-review migrations may already exist for scaffolding. Future Design V2–aligned migrations must:

- Inventory live objects.
- Map **Ad Group** ↔ any historical “ad set” naming.
- Extend or shim rather than fork a second Ads universe.
- Keep Delivery and real charges behind flags until Phases C–D.

This plan describes the **target sequence** as if building toward Design V2; implementers treat greenfield vs alter-existing as an inventory step before writing files.

---

## 5. Naming and Versioning Strategy

| Concern | Rule |
|---------|------|
| **Tables** | Stable plural/snake names grouped by domain (`ads_*` or clear advertiser_* prefixes—pick one family and stick to it in implementation) |
| **Design terms in docs** | Campaign, Ad Group, Ad, Creative, Placement, Billing Account |
| **Status enums** | Text + CHECK (or enum type) with documented transitions; widen via additive migration |
| **RPC names** | Verb-led: `submit_*`, `approve_*`, `settle_*`, `freeze_*`; admin variants `admin_*` |
| **Metric / attribution models** | Version columns (`definition_version`, `model_version`) never overwrite history |
| **Migration files** | One logical slice per file when possible; avoid mega-migrations that mix billing + AI |

---

## 6. Required Extensions or Capabilities *(non-final)*

| Capability | Why considered | Decision status |
|------------|----------------|-----------------|
| UUID generation | Opaque ids | Likely already available in stack |
| `pgcrypto` / hashing helpers | API key hashes, token digests | Optional; Open until implement |
| `pg_partman` or native partitioning | Event scale | **Open** — only when justified (§13) |
| `btree_gist` / exclusion | Scheduling overlaps | Optional future |
| Separate warehouse | Enterprise reporting | **Open Decision** — Postgres rollups may suffice for MVP |

Do **not** adopt extensions without ops approval; list them in the implementing migration’s header comment when chosen.

---

## 7. Migration Sequence Overview

Aligns with `01_IMPLEMENTATION_ROADMAP.md`:

| Slice | Code | Maps to phase | Risk |
|-------|------|---------------|------|
| A | Advertiser & Org Foundation | A | Medium |
| B | Campaign Core | A | Medium |
| C | Creative & Asset Foundation | A | Medium |
| D | Review & Moderation | B | High (trust) |
| E | Budget & Billing Foundation | A shell → D real settle | High (money) |
| F | Delivery & Placement | C | High (hot path) |
| G | Reporting & Events | E | Medium |
| H | Attribution | E+ | Medium–High |
| I | AI & Experiments | F / later | Medium |
| J | Admin & Audit (cross-cutting boosts) | A–F | High (break-glass) |

**Deploy order:** A → B → C → D → E(shell) → F → G → E(settle expansion) → H → I → J increments as needed.
Admin identity primitives may land early (with A/D) if not already present; J deepens freezes/incidents.

---

## 8. Logical Migrations (Detail)

For each slice: purpose, entities, dependencies, indexes, constraints, RLS direction, RPC needs, grants/revokes, rollback/forward-fix, verification, backfill, risk, deploy order.

> **Note:** Entity names are **logical**. Physical table names are chosen at implementation time. This is not a claim that tables exist today.

---

### Migration A — Advertiser and Organization Foundation

| Field | Plan |
|-------|------|
| **Purpose** | Tenant root for all Ads data; membership; invitations; account status; ownership boundaries |
| **Entities introduced** | AdvertiserOrg (or AdvertiserAccount), AdvertiserMember, MemberInvitation, AdvertiserVerification (stub), BillingAccount **shell** (currency, status; no charge rows yet), ApiClient metadata *(optional MVP defer)* |
| **Dependencies** | `auth.users`; platform admin primitive if reviews will reference it |
| **Indexes** | Member `(user_id)`, `(org_id)`; unique `(org_id, user_id)`; status; invitation token hash unique |
| **Constraints** | Role CHECK; status CHECK; currency ISO; one BillingAccount per org (MVP) |
| **RLS direction** | Members SELECT/UPDATE only orgs they belong to; INSERT org via RPC; invitations visible to admins/owners; anon none |
| **SECURITY DEFINER RPC needs** | `create_advertiser_org`, `accept_invitation`, `change_member_role`, `submit_advertiser_for_review` |
| **Grants/revokes** | Revoke ALL from anon/public; authenticated execute on allowlisted RPCs only; no direct write on verification |
| **Rollback / forward-fix** | Forward-fix: soft-disable RPCs; do not drop orgs with campaigns |
| **Verification checks** | Cannot read other tenants; owner bootstrap membership exists; invitation single-use |
| **Data backfill** | None for true greenfield; if scaffolding exists, map rows → Design terms via additive columns/views |
| **Risk level** | Medium |
| **Deploy order** | **1** (first Ads Design V2–aligned slice) |

**MVP:** Org + members + roles + status. **Future:** Agency multi-org grants, Billing Manager role split, verification KYC packs.

---

### Migration B — Campaign Core

| Field | Plan |
|-------|------|
| **Purpose** | Campaign → Ad Group → Ad spine; lifecycle; schedule; objectives; placement & targeting **references** |
| **Entities introduced** | Campaign, AdGroup, Ad, DestinationRef (typed), TargetingSpec (versioned document or normalized children), AdGroupPlacement (FK to Placement—Placement table may stub or land in F), Schedule fields on Campaign/AdGroup |
| **Dependencies** | A |
| **Indexes** | `(advertiser_org_id, status)`, `(campaign_id)`, `(ad_group_id)`, schedule window `(start_at, end_at)` for eligibility jobs |
| **Constraints** | Status CHECK; end_at > start_at; objective/class CHECK; FK cascade rules documented (prefer restrict delete when ads exist) |
| **RLS direction** | Access via membership on parent org; analysts read-only; campaign managers write drafts |
| **SECURITY DEFINER RPC needs** | `create/update_campaign`, `submit_campaign_for_review`, pause/resume (non-delivery), status transitions with validation |
| **Grants/revokes** | No direct status flip to `approved`/`active` from clients |
| **Rollback / forward-fix** | Additive columns for new objectives; deprecate via CHECK widen |
| **Verification checks** | Cross-tenant campaign read fails; illegal status transition rejected |
| **Data backfill** | Map historical ad_set → Ad Group if reconciling |
| **Risk level** | Medium |
| **Deploy order** | **2** |

**MVP:** Commercial class, Website (+ Store destination stub). **Future:** Structured payloads (Jobs/RE/Vehicles), Government/Charity class.

---

### Migration C — Creative and Asset Foundation

| Field | Plan |
|-------|------|
| **Purpose** | Creatives and reusable assets; processing states; localization; ownership; moderation linkage |
| **Entities introduced** | Asset (library), AssetVersion, Creative, CreativeAssetLink, localization fields / text assets, processing_state, moderation_status, license stub |
| **Dependencies** | A; private storage bucket contract (app-side); B for binding Creative→Ad |
| **Indexes** | `(org_id, state)`, checksum unique per org (dedupe), `(creative_id)` |
| **Constraints** | State machine CHECK; MIME allowlist enforced in RPC/validation; approved creative immutability (new version/draft instead) |
| **RLS direction** | Org-scoped; signed URL reads only; no public bucket listing |
| **SECURITY DEFINER RPC needs** | `register_asset_upload`, `finalize_asset_ready`, `attach_creative`, `submit_creative_for_review` |
| **Grants/revokes** | Revoke raw storage policy abuse; path must include org id |
| **Rollback / forward-fix** | Keep rejected assets; soft archive |
| **Verification checks** | Cannot attach foreign-org asset; cannot delete asset referenced by active Ad (app + DB guard) |
| **Data backfill** | Promote existing creative rows into AssetVersion if reconciling |
| **Risk level** | Medium |
| **Deploy order** | **3** |

**MVP:** Image/video upload + creative bind. **Future:** Full Asset Library, AI provenance columns, brand kits (`../12_CREATIVE_ASSET_LIBRARY.md`).

---

### Migration D — Review and Moderation

| Field | Plan |
|-------|------|
| **Purpose** | Review cases/decisions, policy codes, rejection reasons, appeals, assignment, escalation, audit trail |
| **Entities introduced** | ReviewSubmission / ReviewCase, ReviewDecision, PolicyCode catalog, Appeal, ReviewerAssignment, escalation fields; append-only ReviewEvent/Audit |
| **Dependencies** | A–C; platform admin identity |
| **Indexes** | Queue `(status, created_at)`, `(entity_type, entity_id)`, reviewer_id |
| **Constraints** | Reason required on reject; one open case per entity (unique partial); append-only triggers blocking UPDATE/DELETE on audit |
| **RLS direction** | Advertisers read own case outcomes; cannot write decisions; admins via RPC only |
| **SECURITY DEFINER RPC needs** | `admin_approve_*`, `admin_reject_*`, `admin_suspend_*`, `admin_restore_*`, `submit_appeal` — all set `reviewer_id = auth.uid()` after `require_platform_admin()` |
| **Grants/revokes** | Revoke INSERT on decision/audit tables from authenticated; execute admin RPCs only for admins |
| **Rollback / forward-fix** | Never delete audit; fix via compensating decision rows |
| **Verification checks** | Self-approve impossible; double-approve rejected; audit row in same transaction as status change |
| **Data backfill** | None / map prior review_events |
| **Risk level** | **High** |
| **Deploy order** | **4** (hard gate before Delivery) |

Aligns with Phase B success criteria in `01_IMPLEMENTATION_ROADMAP.md` and trust rules in `../08_SECURITY.md`.

---

### Migration E — Budget and Billing Foundation

| Field | Plan |
|-------|------|
| **Purpose** | BudgetPolicy, reservations/counters, spend ledger, credits, Billing Account, prepaid balance **and/or** postpaid hooks, payment method refs, reconciliation boundaries |
| **Entities introduced** | BudgetPolicy, SpendCounter / BudgetLedger snapshots, BillingAccount (expand shell), FundingTransaction, BillingEvent, CreditEvent, Invoice *(if postpaid)*, PaymentMethodRef, BudgetFreeze |
| **Dependencies** | A; Delivery billable events (F) before **settlement** RPCs go live |
| **Indexes** | `(billing_account_id, created_at)`, unique idempotency on BillingEvent, counters by `(scope_id, day_key)` |
| **Constraints** | Minor units ≥ 0 where required; lifetime ≥ daily when both set; currency immutable after first funding (**design default**) |
| **RLS direction** | Advertisers read own ledger; **no** direct insert/update; Billing Manager role read funding |
| **SECURITY DEFINER RPC needs** | `set_budget_policy`, `funding_top_up` (adapter), `settle_billable_event`, `issue_credit` (dual-control future), `freeze_budget` |
| **Grants/revokes** | Revoke ALL writes on ledger tables from authenticated |
| **Rollback / forward-fix** | Corrections = CreditEvent / adjustment; never UPDATE settled amount in place |
| **Verification checks** | Double settle same idempotency key is no-op; freeze blocks settle; overshoot only within **Open** tolerance |
| **Data backfill** | Zero for MVP; counters rebuild from events if needed |
| **Risk level** | **High** |
| **Deploy order** | **5a** shell with A/B; **5b** settlement after F event contracts |

**Open:** prepaid vs postpaid MVP; numeric overshoot SLA (`../06_BUDGET_SYSTEM.md`).

---

### Migration F — Delivery and Placement

| Field | Plan |
|-------|------|
| **Purpose** | Placement Registry, eligibility bits, delivery snapshots, frequency caps, pacing state, serving tokens, impression/click **contracts** |
| **Entities introduced** | Placement, FormatPlacementPolicy, FrequencyCap, PacingState *(optional MVP)*, TrackingToken metadata, ImpressionEvent, ClickEvent, ViewEvent *(optional)*, DeliverySnapshot (compact targeting match) |
| **Dependencies** | B–D (approved inventory only); E counters for soft eligibility |
| **Indexes** | Hot: `(placement_id, active)`, event `(occurred_at)`, unique dedupe `(idempotency_key)` / `(impression_id, event_type)` |
| **Constraints** | Token expiry; placement_id allowlist; IVT flag nullable until G/H |
| **RLS direction** | Clients **cannot** insert impressions freely without validated RPC/edge ingest; advertisers read aggregates later (G), not raw user-level dumps |
| **SECURITY DEFINER RPC needs** | `ingest_impression`, `ingest_click` (or service_role edge → RPC); eligibility read models may be security invoker views scoped carefully |
| **Grants/revokes** | No anon write; service path tightly gated |
| **Rollback / forward-fix** | Feature flag Delivery off leaves tables idle |
| **Verification checks** | Unsigned/expired token rejected; unapproved Ad never eligible |
| **Data backfill** | None |
| **Risk level** | **High** (performance + fraud) |
| **Deploy order** | **6** |

**MVP:** Discover and/or Watch placements only. **Future:** Live/Search/Learning; auction weight tables (**Open** formula).

---

### Migration G — Reporting and Events

| Field | Plan |
|-------|------|
| **Purpose** | Immutable ingest contracts (if not fully in F), aggregation tables, daily/hourly rollups, IVT adjustments, preliminary vs finalized markers |
| **Entities introduced** | MetricDefinition, ReportAggregateDaily, ReportAggregateHourly, Reach sketch store *(logical)*, IvtMark / adjustment facts, ExportJob |
| **Dependencies** | F events; E ledger for spend metrics |
| **Indexes** | Rollup keys `(org_id, day, campaign_id, placement_id, …)` unique; export job status |
| **Constraints** | definition_version NOT NULL on aggregates; preliminary/finalized flag |
| **RLS direction** | Org members read own rollups; no raw event PII; admin auditor read via RPC |
| **SECURITY DEFINER RPC needs** | Rollup workers as service_role jobs; `request_report_export` |
| **Grants/revokes** | Authenticated cannot write aggregates |
| **Rollback / forward-fix** | Recompute rollups from events; pin MetricDefinition versions |
| **Verification checks** | Finalized spend ≈ settled BillingEvent sum within SLO |
| **Data backfill** | Rebuild rollups from events after deploy |
| **Risk level** | Medium |
| **Deploy order** | **7** |

**Open:** reporting remains on Postgres only vs later warehouse (`../15_ENTERPRISE_REPORTING.md`).

---

### Migration H — Attribution

| Field | Plan |
|-------|------|
| **Purpose** | Touchpoints, conversion events, attribution results, dedupe, refund/cancel adjustments, late corrections |
| **Entities introduced** | TouchFact (or reuse Delivery events + organic touch bridge), ConversionEvent, AttributionResult, AttributionModel version, CorrectionFact |
| **Dependencies** | F/G; Store/Live **read contracts** for purchase/join ids (no FK into order mutation) |
| **Indexes** | `(conversion_id, model_version)` unique; `(click_id)`; time window queries |
| **Constraints** | Idempotent conversion ingest; Store order id unique per model version |
| **RLS direction** | Advertisers see attributed aggregates; never user email/phone; no order rewrite grants |
| **SECURITY DEFINER RPC needs** | `ingest_conversion_fact`, `apply_attribution`, `apply_conversion_reversal` |
| **Grants/revokes** | No authenticated write on AttributionResult |
| **Rollback / forward-fix** | New model_version; supersede via correction rows |
| **Verification checks** | Same order not double-counted; refund emits reverse; Ads cannot UPDATE Store orders |
| **Data backfill** | Optional replay within windows |
| **Risk level** | Medium–High |
| **Deploy order** | **8** |

**Open:** default click/view windows; paid vs organic credit conflict (`../13_ATTRIBUTION_ENGINE.md`).

---

### Migration I — AI and Experiments

| Field | Plan |
|-------|------|
| **Purpose** | AI recommendation audit, model/version metadata, experiment registry, variants, assignments, results metadata, human approval requirements |
| **Entities introduced** | AiModelVersion, AiSuggestion, AiProposal, AiApproval, Experiment, ExperimentArm, ExperimentAssignment, ExperimentResultMeta |
| **Dependencies** | A–C minimum; G for metrics; Experiment locks vs AI (`../11_AI_ADVERTISING_ENGINE.md`, `../14_EXPERIMENT_PLATFORM.md`) |
| **Indexes** | `(org_id, created_at)`, `(experiment_id, unit_hash)` unique assignment, model_version |
| **Constraints** | Proposal cannot auto-apply without approval flag (**default false** — Open Decision on authority) |
| **RLS direction** | Org read own suggestions; no user-level assignment export |
| **SECURITY DEFINER RPC needs** | `record_ai_suggestion`, `submit_ai_proposal`, `approve_ai_proposal`, `start_experiment`, `assign_experiment_unit` |
| **Grants/revokes** | Revoke direct assignment inserts from clients |
| **Rollback / forward-fix** | Kill switch disables model_version; proposals remain auditable |
| **Verification checks** | Running experiment blocks AI mutate RPCs; approval required |
| **Data backfill** | None |
| **Risk level** | Medium |
| **Deploy order** | **9** (after honesty metrics exist) |

---

### Migration J — Admin and Audit (Platform Controls)

| Field | Plan |
|-------|------|
| **Purpose** | Platform admin controls, global audit log, security incidents, freezes, suspensions, emergency stops |
| **Entities introduced** | PlatformAdmin (if not earlier), GlobalAuditLog, SecurityIncident, AccountFreeze, EmergencyStop flag store, BreakGlassSession |
| **Dependencies** | Cross-cutting; deploy increments alongside D/E/F |
| **Indexes** | Audit `(occurred_at)`, `(actor_id)`, freeze `(org_id, active)` |
| **Constraints** | Append-only audit; break-glass TTL |
| **RLS direction** | Admins read via RPC; advertisers never see break-glass detail |
| **SECURITY DEFINER RPC needs** | `admin_freeze_org`, `admin_emergency_stop_delivery`, `admin_open_incident` |
| **Grants/revokes** | No authenticated INSERT into platform_admins (prevent self-promotion) |
| **Rollback / forward-fix** | Clear freeze via compensating RPC + audit |
| **Verification checks** | Non-admin cannot freeze; emergency stop flips Delivery eligibility globally |
| **Data backfill** | None |
| **Risk level** | **High** |
| **Deploy order** | **Parallel boosters** — minimum admin identity before D; full incident/freeze before D settlement & C Delivery |

---

## 9. RLS Strategy

| Actor | Direction |
|-------|-----------|
| **Advertiser isolation** | Every tenant row carries org/account id; policies join membership |
| **Agency/member access** | Role-gated policies or RPC checks (owner/admin/campaign_manager/analyst/billing_manager) |
| **Admin access** | `require_platform_admin()` inside SECURITY DEFINER; optional SELECT-own on admin membership table |
| **Service-role** | Workers/settle/ingest only; never exposed to browser |
| **anon / public** | No Ads table privileges |
| **No client-controlled ownership** | Ignore client-supplied owner ids; derive from `auth.uid()` + membership |
| **Fail-closed** | ENABLE + FORCE RLS; missing policy = deny |
| **Ledgers / audit / review decisions** | No broad UPDATE/DELETE policies for authenticated |

---

## 10. RPC Strategy

| Write class | Why RPC-only |
|-------------|--------------|
| Review approve/reject/suspend | Atomic status + audit |
| Budget settle / credit / freeze | Idempotent money |
| Invitation accept / role change | Privilege safety |
| Impression/click ingest | Token validation + dedupe |
| Attribution apply / reverse | Exactly-once business keys |
| AI proposal apply | Human approval gate |
| Emergency stop / org freeze | Break-glass |

**Cross-cutting RPC rules**

- Idempotency keys on settle/ingest.
- Audit row in **same transaction** as mutation.
- `SET search_path` pinned.
- `REVOKE ALL` then grant EXECUTE to the minimal roles.
- Domain validation inside RPC (status, currency, HTTPS destination, policy packs).
- **No direct ledger mutation** from clients or broad `UPDATE` grants.

---

## 11. Event and Ledger Strategy

| Principle | Application |
|-----------|-------------|
| Append-only | BillingEvent, CreditEvent, ReviewEvent, AuditLog, IvtMark, Attribution Correction |
| Dedupe keys | Unique on `(event_id)` or `(impression_id, event_type)` |
| Immutable financial records | Settled amounts never edited in place |
| Corrections | CreditEvent / reversal ConversionFact / superseding AttributionResult |
| Exactly-once business semantics | DB uniqueness + idempotent RPC return of existing row |
| Soft vs hard budget | Soft counters at serve; hard settle in ledger (tolerance **Open**) |

---

## 12. Indexing Strategy

| Class | Examples | Guidance |
|-------|----------|----------|
| **Hot path** | Placement active, token lookup, membership `(user_id)` | Create with F/A |
| **Reporting** | Daily rollup composite unique | Create with G |
| **Partial indexes** | `WHERE status = 'pending_review'` queues | Prefer over indexing all statuses |
| **Unique dedupe** | Event idempotency, assignment `(experiment_id, unit)` | Mandatory for integrity |
| **Avoid premature** | Low-cardinality flags alone; speculative multi-column until query plans exist | Wait for evidence |

---

## 13. Data Retention and Partitioning

| Data | Direction |
|------|-----------|
| Raw delivery/events | Hot short retention → cold archive; sampling optional |
| Rollups | Medium–long |
| Billing/audit/review | Long (finance/legal) |
| Audience membership | Policy-limited |
| **Partitioning** | Consider by time when event volume justifies — **Open threshold** |
| **Regional retention packs** | Policy-driven; residency topology **Open** |

Do not partition MVP tables “just in case.”

---

## 14. Backfill and Compatibility

| Scenario | Plan |
|----------|------|
| **No-data MVP** | Empty tables; seed **no** demo advertisers in prod migrations |
| **Existing scaffolding advertisers** | Compatibility migration: map columns, add Design V2 fields, optional views for Ad Group naming |
| **Schema version compatibility** | App feature flags read new columns defensively |
| **Dual-read / dual-write** | Only if renaming hot tables mid-flight; prefer expand–migrate–contract |
| **Metric/attribution versions** | New versions coexist; old reports pin old versions |

---

## 15. Migration Verification Plan

| Check | Intent |
|-------|--------|
| Schema checks | Tables/columns/constraints/enums present |
| Privilege checks | anon has nothing; authenticated lacks ledger writes |
| RLS tests | Cross-tenant denied; role matrix cases |
| Idempotency tests | Double settle/ingest |
| Ledger integrity | Σ charges − Σ credits = account balance model |
| Review atomicity | Decision without audit impossible |
| Rollback rehearsals | Forward-fix scripts on staging |
| Production read-only verification | Counts, policy presence, `relforcerowsecurity` style checks — **read-only** |

Automated DB tests should live with implementation (not invented here as SQL).

---

## 16. Rollout Strategy

| Stage | Actions |
|-------|---------|
| **Local** | Apply slice; run RLS/RPC tests |
| **CI** | Migration lint + policy tests on ephemeral DB |
| **Staging** | Full A→G path with Delivery flag off, then on |
| **Production** | Slice-by-slice; maintenance window for High risk (D/E/F) |
| **Canary / flags** | `ADS_DELIVERY_ENABLED`, billing settle enabled, AI assist enabled |
| **Post-deploy monitoring** | Error rates on RPCs, RLS denials, settle lag, freeze events |

Never couple Ads schema rollout to unrelated Store branch deploys.

---

## 17. Risks

| Risk | Mitigation |
|------|------------|
| Parallel Ads schemas (foundation vs Design V2) | Inventory + shim; single tenant root |
| Enabling F before D | Hard eligibility requires approved Review |
| Ledger grants leaked to authenticated | Revoke tests in CI |
| Event table blow-up | Retention + delayed partitioning decision |
| Silent Open Decision closure in CHECKs | Keep configurable policy tables / flags |
| Attribution writing Store orders | No FK cascades to orders; read-only ids |
| Self-promotion to platform admin | No INSERT policy on admin table |
| Migration ordering mistakes | Strict deploy order in §7–8 |

---

## 18. Open Decisions

Canonical registry: `01_IMPLEMENTATION_ROADMAP.md` §14 (OD-01…OD-50).

**Schema / data-plane focus (must not diverge from registry):**

| ID | Question (short) | Options | Recommendation | Owner | Phase | Blocking? |
|----|------------------|---------|----------------|-------|-------|-----------|
| OD-05 | Prepaid vs postpaid | See registry | Prepaid candidate | Finance + Product | D | Blocking settle |
| OD-06 | Overshoot tolerance | See registry | Numeric SLA before settle | Finance + Eng | D | Blocking settle |
| OD-10 | Data residency | See registry | Before multi-region public | Eng + Legal | Rel-8 | Blocking sensitive geos |
| OD-11 | Attribution windows | See registry | Pin at attribution slice | Product + Eng | H/E | Blocking CPA honesty |
| OD-15 | Ad Group vs ad_set shim | See registry | UX terms + DB shim | Eng | A | Non-blocking |
| OD-21 | Warehouse vs Postgres | See registry | Postgres MVP | Eng + Data | G/E | Non-blocking MVP |
| OD-47 | Partitioning threshold | See registry | Defer | Eng | G+ | Non-blocking |
| OD-48 | Physical naming family | See registry | Pick at first Design-aligned migration | Eng | A | Non-blocking |

Also tracked in registry (not re-litigated here): OD-01 auction, OD-07 creator share, OD-08 DSP, OD-12 AI authority.

---

## 19. Acceptance Criteria

This planning document is complete when:

- [x] Sequence A–J defined with purpose, entities, deps, indexes, constraints, RLS, RPC, grants, rollback, verification, backfill, risk, deploy order
- [x] RLS / RPC / ledger / indexing / retention / verification / rollout sections present
- [x] MVP vs future called out
- [x] Open Decisions referenced to canonical registry (`01` §14) without forced closure
- [x] No executable SQL and no migration files authored by this task
- [x] Relative links to Design V2 and Implementation Roadmap
- [x] Does not claim Design V2 tables already exist

**Implementation acceptance (future, per slice):** each real migration PR must cite this doc’s slice letter, include RLS/RPC tests, and refuse silent Open Decision freezes.

---

## Related Documents

- `01_IMPLEMENTATION_ROADMAP.md` — phase gates A–F
- `../09_DATABASE_BLUEPRINT.md` — conceptual entities (non-SQL)
- `../08_SECURITY.md` — RBAC, fraud, audit
- `../06_BUDGET_SYSTEM.md` — spend controls
- `../13_ATTRIBUTION_ENGINE.md` — conversion credit rules
- `../07_REPORTING.md` / `../15_ENTERPRISE_REPORTING.md` — metrics honesty
- `../11_AI_ADVERTISING_ENGINE.md` / `../14_EXPERIMENT_PLATFORM.md` — AI/experiments constraints
- `../ADS_PLATFORM_FOUNDATION_V1.md` / `../ADS_ADMIN_REVIEW_FOUNDATION_V1.md` — early scaffolding notes to reconcile

---

## Document Control

| Item | Value |
|------|-------|
| Planning version | Implementation Planning V1 — Migrations Plan |
| Authoring mode | Documentation only |
| Next expected sibling docs | Per-slice implementation notes when SQL is actually written |
