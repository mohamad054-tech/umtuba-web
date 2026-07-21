# 09 — Platform Readiness: Orgs, Sandbox, Experiments, Rollout, Ops & Data Lifecycle

This addendum collects cross-cutting platform concerns raised in the V1 audit.
All items are **architecture readiness only** — design intent and contracts, no
implementation, no code, no migrations. Each capability is flag-gated and off by
default.

## 1. Advertiser organizations & agency readiness

The shipped foundation models a single advertiser account with member roles
(owner / admin / campaign_manager / analyst / viewer). The platform is designed
to grow into a multi-organization / agency model without changing the campaign
object model:

- **Advertiser org** = the account that owns campaigns, creatives, and a UEOS
  billing reference.
- **Agency (planned)** = an org that can be granted **delegated access** to one
  or more client advertiser orgs, with its own members and scoped roles.
- **Delegation contract (planned):** an agency↔advertiser link grants a bounded
  role (e.g. campaign_manager) on the client org; it does **not** merge billing
  — each advertiser keeps its own UEOS billing reference and spend.
- **Isolation:** RLS scopes remain per advertiser org; agency access is an
  explicit, auditable grant, revocable at any time.
- **Audit:** all agency actions are attributed to the acting user and the client
  org they acted on.

Roles & permissions (target matrix, additive to Layer 0):

| Capability | owner | admin | campaign_manager | analyst | viewer | platform_admin |
| --- | --- | --- | --- | --- | --- | --- |
| Manage org + members | ✓ | ✓ | — | — | — | — |
| Manage campaigns/ad sets/creatives | ✓ | ✓ | ✓ | — | — | — |
| Submit for review | ✓ | ✓ | ✓ | — | — | — |
| Read reporting | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve / reject / suspend | — | — | — | — | — | ✓ |
| Manage billing (future) | ✓ | ✓ | — | — | — | — |

`platform_admin` is **not** an advertiser role (see doc 06 §1).

## 2. Sandbox / test-advertiser mode

- **Sandbox advertiser (planned):** an advertiser org flagged `sandbox` can
  build campaigns/ad sets/creatives and exercise the full management + review +
  (simulated) delivery/measurement loop **without** real serving or real spend.
- **Isolation:** sandbox data is partitioned from production delivery; sandbox
  events never enter billable counts and never post to UEOS.
- **Purpose:** advertiser onboarding, QA, integration tests for consuming
  products, and demoing the review workflow — with **no fake numbers leaking**
  into production reporting.
- **Flag:** `ADS_SANDBOX_ENABLED`; sandbox orgs are clearly labeled in all UIs.

## 3. Experiment / A-B testing readiness

- **Creative rotation & experiments (planned):** an ad set may hold multiple ads
  (creatives) with a defined split; the **selection** stage (doc 02 §4.2) chooses
  a variant per request using a non-identifying handle for stable assignment.
- **Holdouts:** a policy-defined holdout fraction can receive no ad, enabling
  lift measurement, without per-user tracking.
- **Measurement tie-in:** experiment/variant ids are dimensions on events
  (doc 05), so reporting can break down by variant.
- **Guardrails:** experiments never bypass policy, minor-safety, capping, or
  budget; assignment is coarse and privacy-safe.
- **Flag:** `ADS_EXPERIMENTS_ENABLED`. Not part of the foundation delivery loop.

## 4. Feature-flag rollout strategy

Every capability (doc 02 §6) is independently flag-gated and defaults **off**.
Rollout discipline:

- **Default-off + explicit enable:** nothing serves, bills, or auctions until a
  flag is explicitly turned on.
- **Scoped rollout:** flags can be scoped (per placement, per market, per
  advertiser cohort, per sandbox) for staged/canary rollout.
- **Kill switch:** every serving/billing capability has an immediate global
  disable; a disabled capability degrades to "absent" (empty results,
  planning-only figures), never a partial/unsafe state.
- **Reversibility:** enabling a flag is always reversible without data loss;
  disabling stops new effects and leaves history intact.
- **Ordering:** flags respect roadmap dependencies (e.g. billing requires the
  minimal IVT gate; auctions require delivery + measurement + billing).

## 5. Latency, availability & observability

(Targets summarized in doc 02 §8; operational detail here.)

- **Delivery latency budget:** the decision path must stay within a small
  server-side budget; exceeding it returns empty (no ad) rather than delaying the
  product. Ads is always non-blocking for product UX.
- **Availability:** platform degradation never blocks product playback,
  checkout, or navigation; products render their own content on any Ads failure.
- **Metrics:** per-stage delivery funnel (candidates → filtered → served →
  empty), decision latency, empty-rate, ingestion throughput, aggregation lag,
  review queue depth/throughput — all non-PII, per placement/coarse-geo.
- **Tracing & correlation:** correlation ids on management mutations, delivery
  decisions, event ingestion, and UEOS postings for end-to-end debugging and
  audit correlation.
- **Alerting:** on error/empty-rate spikes, ingestion/aggregation lag, review
  backlog, and anomaly signals (doc 06 §7).
- **Dashboards:** advertiser (delivery/spend/pacing) and operator (health,
  latency, review, traffic-quality) reporting are read-only projections
  (doc 05 §6).

## 6. Data lifecycle: retention, deletion & DSAR

- **Data classes:**
  - *Management data* (orgs, campaigns, ad sets, ads, creatives, policy, audit) —
    retained for the advertiser relationship + legal/audit needs.
  - *Raw events* — retained for a bounded window for audit, recompute, and
    fraud analysis, then aged out.
  - *Aggregates* — retained longer as **non-identifying** counts.
  - *Creatives* — private storage, signed-URL access only (doc 03 §7).
- **No PII / no user profiles:** targeting stores intent only; delivery and
  measurement use non-identifying handles and coarse context — there is no
  per-user Ads profile.
- **Deletion & DSAR:** because Ads holds no PII, data-subject access/erasure is
  satisfied at the identity-owning layer (platform Auth / product). Ads exposes
  no personal data to export or erase; any handles are non-identifying and
  time-bounded.
- **Advertiser data deletion:** on advertiser offboarding, management data is
  archived/retained per legal policy; creatives are removed from delivery;
  financial history remains in UEOS (owned by UEOS), referenced not copied.
- **Regional legal policy (planned):** retention windows, restricted ad
  categories, and available targeting signals are expressed as
  market/region-scoped policy objects (doc 06 §2), so compliance differences are
  configuration, not code forks.

## 7. Schema & contract evolution

- **Event schema evolution:** versioned, additive-first, backward-compatible
  reads, deprecation with overlap (doc 05 §9).
- **Placement/render contract evolution:** placement contracts are versioned;
  new fields are optional; products negotiate a supported version. Breaking
  changes ship a new contract version behind a flag, never a silent redefinition.
- **Policy versioning:** eligibility/creative/targeting/placement policies are
  versioned with effective windows (doc 06 §2), so historical decisions and
  metrics stay reproducible.

## 8. Disaster recovery (design intent)

- **Raw events** are append-only and the recompute source of truth; aggregates
  can be rebuilt from raw events.
- **Creatives** live in durable private storage with access only via signed
  URLs; backups follow platform storage DR policy.
- **Financial truth** is never in Ads — UEOS owns its own durability/DR for
  journals and balances; Ads only holds references.
- **Recovery posture:** rebuild aggregates from raw events; re-derive spend
  reconciliation from UEOS journal references; management data restored from
  standard database backups. No monetary state is reconstructed inside Ads.

All of the above are readiness/design statements. Implementation is sequenced by
the roadmap (doc 08) and gated by flags; nothing here authorizes code,
migrations, or serving.
