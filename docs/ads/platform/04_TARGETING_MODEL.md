# 04 — Targeting Model & Privacy-First Design

## 1. Principles

Targeting is **privacy-first by construction**:

- Only **coarse, consented, non-PII** signals are usable.
- **No individual-user targeting** — never by user id, email, phone, device id,
  or any 1:1 identifier, in include **or** exclude lists.
- **No sensitive-attribute targeting** — no political, religious, health,
  racial/ethnic, or sexual-orientation targeting.
- **No private data** — no message content, contacts, or conversation-derived
  signals ever inform targeting.
- **Minor-safety is structural**, not advisory (see §5).
- A minimum audience-size **contract** prevents micro-targeting (see §6).

Targeting specs are **database-validated**: the allowed dimension set,
allowlists, and minor-safety constraints are enforced at persistence and
re-checked at review, not only in the UI.

## 2. Supported targeting dimensions

The architecture supports the following dimensions. Each is coarse and
policy-bounded. The **Layer 0** column marks what the shipped foundation
(`20260807_ads_platform_foundation_v1.sql`) already models today versus
dimensions that are **planned** (forward-looking architecture, enabled in later
phases behind policy/flags).

| Dimension | Layer 0 | Model | Notes / policy |
| --- | --- | --- | --- |
| Country | ✓ | ISO country set | Baseline geo |
| Region | ✓ | Region/state set | Within selected countries |
| City | ✓ | City set | **Restricted for audiences including minors** |
| Radius | planned | Center + radius (coarse) | Coarse only; no precise/stored user location; privacy-gated |
| Language | ✓ | Locale set | Content/UI language |
| Age | ✓ | age_min / age_max | **Floor 13** (Layer 0 range 13–65); ranges only, never exact DOB |
| Gender | ✓ | all / policy-dependent value | Default `all`; **disabled when audience includes 13–17** |
| Interests | ✓ | Allowlist labels | Curated taxonomy only; no free text |
| Categories | ✓ | Allowlist labels | Content/commerce categories |
| Behavior / segments | ✓ (user_segments) | Coarse, consented signals | Aggregate/segment level; no per-event user profile |
| Device | ✓ | Device class | e.g. mobile/tablet/desktop/TV |
| OS | planned | OS family | e.g. iOS/Android/web |
| Connection | planned | Connection class | e.g. wifi/cellular; coarse |
| Time | planned | Dayparting / schedule | Hours/days in campaign timezone |
| Account type | planned | Consumer / business | Platform account classification |
| Creator status | planned | Creator / non-creator | Non-PII status flag |
| Merchant status | planned | Merchant / non-merchant | Non-PII status flag |
| UM Points | planned | Coarse tier/band | Bands only; never exact balance; policy-bounded |
| Custom audiences | planned | (future) | Privacy-reviewed, consented, min-size gated |
| Lookalike audiences | planned | (future) | Modeled from consented seeds; min-size gated |

"planned" dimensions do not change the campaign object model; each is an
additive, policy-gated field on the same targeting spec. Where this table and
the shipped migration differ, the migration is the current source of truth.

### Dimension semantics

- **Include / exclude:** each dimension supports include and exclude sets,
  except individual identifiers which are prohibited in both.
- **Combination:** dimensions combine as AND across dimension groups, OR within
  a set (e.g. country ∈ {A,B} AND language ∈ {en} AND interest ∈ {sports,music}).
- **Coarseness:** high-cardinality dimensions (interests/categories) are
  allowlist set-membership predicates — index-friendly and auditable.

## 3. Targeting specification (shape)

A targeting spec is a validated, versioned document attached to an ad set:

```
TargetingSpec {
  geo:        { countries[], regions[], cities[], radius? }   // radius policy-gated
  language:   { locales[] }
  age:        { min>=13, max }
  gender:     "all" | <policy value>                          // constrained by age
  interests:  { include[], exclude[] }                        // allowlist
  categories: { include[], exclude[] }                        // allowlist
  behavior:   { segments[] }                                  // coarse, consented
  device:     { classes[] }
  os:         { families[] }
  connection: { classes[] }
  time:       { dayparts[], timezone }
  account:    { types[], creator?, merchant? }
  umPoints:   { tiers[] }                                     // bands only
  audiences:  { customIds[]?, lookalikeIds[]? }               // future, gated
}
```

Validation guarantees (DB-authoritative):

- No prohibited dimension or identifier present.
- Age floor and minor-safety constraints satisfied.
- Interests/categories ⊆ current allowlist.
- Geo granularity allowed for the audience's age composition.
- Estimated audience ≥ minimum (when estimation is enabled; contract otherwise).

## 4. Audience estimation

- **Contract in the foundation** (`MIN_ESTIMATED_AUDIENCE`, e.g. 1000) — the
  spec must be *capable* of meeting a minimum size; the number is not computed
  yet.
- **Future:** an estimation service computes coarse audience-size ranges from
  aggregate, privacy-safe counts — never by enumerating users. Estimation is
  flag-gated (`ADS_AUDIENCE_ESTIMATION_ENABLED`).

## 5. Minor safety (structural constraints)

For any audience that **includes ages 13–17**:

- **Gender targeting** must be `all` (no gender narrowing).
- **City-level geo** and **radius** targeting are disallowed (coarser geo only).
- **Behavioral segments** and **UM Points** narrowing are disallowed.
- Creative/format policy applies stricter content gates (see doc 06).

For ages **below 13**: no targeting and no delivery — ever.

These are enforced at spec validation and re-verified at review; they cannot be
bypassed from the UI.

## 6. Anti-micro-targeting

- Minimum audience-size contract prevents narrowing to identifiable groups.
- Exclusion lists cannot be used to reconstruct a 1:1 audience.
- Combinations that would collapse below the minimum are rejected (when
  estimation is enabled) or blocked by dimension-granularity rules (foundation).

## 7. Privacy-first data handling

- Targeting signals are **derived and coarse**: tiers, bands, classes, segments,
  allowlist labels — not raw events or identities.
- No targeting signal is sourced from private messages, contacts, or precise/
  continuous location.
- Consent and regional privacy rules govern which signals are available in which
  markets; unavailable signals are simply absent from the allowed dimension set
  for that context.
- The platform stores the **targeting intent**, not a per-user profile of who
  matched. Matching happens at request time against coarse context.

### 7.1 Retention, deletion & DSAR (targeting data)

- Targeting specs store **intent only** (allowlist labels, ranges, bands,
  classes) — there is no per-user targeting profile to export or delete.
- Because delivery/measurement use **non-identifying** handles and coarse
  context (doc 05), there is no cross-product user profile tied to a person.
- Data-subject requests (access/deletion) are satisfied at the platform-Auth /
  product layer that owns identity; Ads holds no PII to return or erase.
- Retention periods, deletion workflows, and regional legal-policy objects for
  Ads data are defined centrally in doc 09.

## 8. Future audiences (custom & lookalike)

- **Custom audiences:** advertiser- or platform-provided seeds must pass privacy
  review, be consented, hashed/aggregated, and always subject to the minimum
  size gate. No raw PII is ingested or stored by Ads.
- **Lookalike audiences:** modeled expansion from consented seeds using
  aggregate signals; delivered only above the minimum-size gate and behind
  `ADS_AI_OPTIMIZATION_ENABLED` where modeling is involved.
- Both are additive dimensions on the same spec; they do not change the campaign
  object model.
