# 03 — Campaign Lifecycle, Entities, Creatives, Placements & Ad Types

## 1. Object model

The platform uses one campaign object model for every product and format.
**Creative is a reusable, shared asset**, not a child of a single Ad; an **Ad**
is the binding that makes a Creative servable inside an Ad Set:

```
Advertiser Account
  ├── Creative Library        (reusable, versioned assets + format descriptors)
  │
  └── Campaign                (objective, lifetime/daily budget, schedule, status)
        └── Ad Set            (targeting + placements + budget/pacing/capping)
              └── Ad          (binding: Ad Set × Creative — the deliverable unit)
                    └── (references one Creative from the Creative Library)
```

- **Campaign** = the advertiser's goal and money envelope.
- **Ad Set** = the targeting + placement + pacing unit. Where "who/where/how
  fast" is decided.
- **Ad** = the servable binding of one Creative into one Ad Set. The unit
  Delivery selects and Measurement counts. An Ad **references** a Creative; it
  does not own it.
- **Creative** = a reusable, versioned asset (format-typed descriptor) that can
  be referenced by many Ads across Ad Sets/Campaigns. Immutable once approved.

This mirrors the shipped foundation (`ad_campaigns`, `ad_sets`, `ad_creatives`,
`ads`, where `ads` binds a creative to an ad set) and generalizes it across all
future products and formats.

## 2. Campaign entities

### 2.1 Campaign

| Field group | Contents |
| --- | --- |
| Identity | id, advertiser_account_id, name |
| Objective | one of the platform objectives (see §5) |
| Budget | currency_code, daily_budget_minor, lifetime_budget_minor (integer minor units) |
| Schedule | start_at, end_at (`end_at > start_at`) |
| Status | draft, pending_review, approved, active, paused, completed, rejected, suspended, archived |
| Money link | UEOS billing account **reference** (no balances stored) |

### 2.2 Ad Set

| Field group | Contents |
| --- | --- |
| Identity | id, campaign_id, name |
| Targeting | targeting spec (see doc 04) — geo, language, age, interests, etc. |
| Placements | selected placement contracts (subset of §6) |
| Budget | optional ad-set daily cap (integer minor units) within the campaign envelope |
| Pacing | pacing mode (even / accelerated) |
| Capping | frequency cap per window (non-identifying handle) |
| Bid (future) | bid strategy + amount (auction phase; see doc 07) |
| Status | draft, pending_review, approved, active, paused, completed, rejected, suspended, archived |

### 2.3 Ad

| Field group | Contents |
| --- | --- |
| Identity | id, ad_set_id, creative_id (**reference** to shared Creative) |
| Status | draft, pending_review, approved, active, paused, completed, rejected, suspended, archived |
| Delivery | not served until delivery + placement flags enabled |

### 2.4 Creative

See §7. Versioned, format-typed, immutable once approved.

### 2.5 Supporting entities

- **Review events** — audit trail for every submit/approve/reject/suspend.
- **Event tables** — impressions/clicks/views/conversions (doc 05).
- **Daily/rollup metrics** — aggregation targets (doc 05).
- **Policy records** — versioned eligibility/creative/targeting/placement rules
  (doc 06).

## 3. Status model

The platform uses **one status vocabulary**, aligned with Layer 0
(`20260807_ads_platform_foundation_v1.sql`). Not every state applies to every
entity; the matrix below is authoritative.

### 3.1 Canonical status vocabulary

`draft`, `pending_review`, `approved`, `active`, `paused`, `completed`,
`rejected`, `suspended`, `archived`.

### 3.2 Status applicability per entity (aligned with Layer 0)

| Status | Advertiser Account | Campaign | Ad Set | Ad | Creative |
| --- | --- | --- | --- | --- | --- |
| draft | ✓ | ✓ | ✓ | ✓ | ✓ |
| pending_review | ✓ | ✓ | ✓ | ✓ | ✓ |
| approved | ✓ | ✓ | ✓ | ✓ | ✓ |
| active | — | ✓ | ✓ | ✓ | — |
| paused | — | ✓ | ✓ | ✓ | — |
| completed | — | ✓ | ✓ | ✓ | — |
| rejected | ✓ | ✓ | ✓ | ✓ | ✓ |
| suspended | ✓ | ✓ | ✓ | ✓ | ✓ |
| archived | — | ✓ | ✓ | ✓ | — |

Deliverable entities (Campaign / Ad Set / Ad) carry the full delivery lifecycle
(`active` / `paused` / `completed` / `archived`). Advertiser Account and
Creative use the review-only subset (`draft` → `pending_review` → `approved` /
`rejected` / `suspended`); a Creative is retired by superseding it with a new
version, not by an `archived` state.

### 3.3 Lifecycle transitions

```
draft ──submit──▶ pending_review ──approve──▶ approved
   ▲                   │                          │
   │                   ├──reject──▶ rejected ─────┤ (resubmit → pending_review)
 (revise)              │                          │
                       │                     ──activate──▶ active
                       │                          │  ▲  │
                       │                 pause ◀───┘  │  └──▶ paused ──resume──▶ active
                       │                              │
                       │        schedule end / budget exhausted ──▶ completed
                       │
        (operator) ────┴──▶ suspended ──restore──▶ approved | paused
```

- **archived** is a terminal, advertiser-initiated retirement reachable from
  `draft`, `approved`, `paused`, `rejected`, or `completed` (matches Layer 0
  campaign guard). Archiving preserves history and metrics; archived objects do
  not serve and are not editable in place.
- **completed** is reached when the schedule ends or the (lifetime) budget is
  exhausted; delivery stops but history/metrics are retained.

### 3.4 Rules

- Transitions are **database-authoritative** and role-gated at the DB.
- `approve` / `reject` / `suspend` / `restore` are **Platform Admin operator**
  actions performed through `SECURITY DEFINER` RPCs gated by
  `require_platform_admin()` — never advertiser actions, and never dependent on
  the app holding a `service_role` key (see doc 06 §1 and the shipped
  `ADS_ADMIN_REVIEW_FOUNDATION_V1.md`).
- Approving an entity does **not** activate delivery; activation is a separate
  gated step.
- Approved creatives are **immutable**; changes require a new draft version
  (old version retained).
- An Ad is servable only when the whole chain is valid: advertiser approved →
  campaign approved & active & in-schedule & has budget → ad set approved &
  active → ad approved → references ≥1 approved creative → placement + delivery
  flags on.

## 4. Campaign lifecycle (end to end)

1. **Onboard advertiser** — create account (draft) → submit → operator review →
   approved. UEOS billing reference established (planning-only until billing
   enabled).
2. **Create campaign** — objective, budget (minor units), schedule. Starts
   draft.
3. **Define ad set(s)** — targeting, placements, pacing, capping.
4. **Attach creative(s)** — upload/select assets; bind as ads.
5. **Submit for review** — campaign/ad set/ad/creative enter pending_review;
   moderation queue picks them up.
6. **Operator review** — approve/reject with audit; policy checks applied.
7. **Activation** — on approval + valid budget/schedule + flags on, ads become
   eligible deliverables.
8. **Delivery** — (flag-gated) Delivery decisioning serves eligible ads;
   Measurement records events; Billing Adapter posts spend to UEOS.
9. **Optimize** — advertiser adjusts budget/targeting/creatives; changes to
   approved items create new revisions and re-enter review.
10. **Pause / complete / archive** — manual `pause` stops delivery reversibly;
    schedule end or lifetime-budget exhaustion moves the object to `completed`;
    `archived` is terminal advertiser-initiated retirement. All preserve history
    and metrics.

## 4a. Budget & pacing model

The platform separates budget authority into a clear precedence so limits never
conflict:

| Concept | Level | Meaning |
| --- | --- | --- |
| Lifetime budget | Campaign | Hard ceiling of total spend for the campaign (integer minor units). Exhaustion → `completed`. |
| Campaign daily budget | Campaign | Optional per-day ceiling across all the campaign's ad sets. |
| Ad Set daily cap | Ad Set | Optional per-day ceiling for one ad set; must fit within the campaign daily budget. |
| Pacing | Ad Set | `even` (smooth across the day/schedule) or `accelerated` (spend as fast as eligible), always within the caps above. |
| Frequency cap | Ad Set | Max impressions per non-identifying handle per time window (a **delivery** limit, not a money limit). |

**Precedence (most restrictive wins):**

```
lifetime budget (campaign)
  ≥ campaign daily budget
    ≥ Σ ad set daily caps effective that day
      → pacing distributes within the ad set cap
        → frequency cap bounds per-user exposure independently
```

- A serve is allowed only if **every** applicable ceiling has remaining
  headroom; the tightest binding limit stops delivery first.
- Frequency capping is orthogonal to budget: it limits exposure, not spend, and
  is enforced even when budget remains.
- All monetary ceilings are non-authoritative planning integers until billing is
  enabled; actual spend is always derived from UEOS (see doc 07).

## 5. Objectives

Objectives frame optimization and available formats/placements. Foundation set:

| Objective | Intent | Typical formats |
| --- | --- | --- |
| Brand Awareness | Reach / views | Video, Image, Story, Live |
| Traffic / Engagement | Clicks, watch-through, follows | Video, Carousel, Search |
| App Install | Installs | Video, Image, App Install unit |
| Store Sales | Product discovery/purchase | Sponsored Products, Carousel |
| Creator Growth | Follows / content reach | Sponsored Creators, Video |
| Learning Enrollment | Course/skill promotion | Learning Promotions |
| Live Growth | Live viewership | Sponsored Live, Live Ads |
| Local / Nearby | Place/city discovery | World Ads, Nearby Ads (geo policy) |

Objectives are policy-linked: each defines allowed formats, placements, and
measurement outcomes. Future auction/AI phases optimize toward the objective's
outcome.

## 6. Placements

A **placement** is a contract between the platform and a product surface. It
declares where an ad can render, the render constraints, required labeling, and
the allowed formats. Placements are the *only* integration point for serving.

### Foundation placement contracts (design)

| Placement id | Product | Notes |
| --- | --- | --- |
| `watch_feed` | Watch | In-feed video; must respect Living Video / exact-context rules |
| `discover_feed` | Discover | In-feed image/video/carousel |
| `stories` | Stories/Discover | Full-screen story unit |
| `live_lobby` | Live | Pre/lobby promotions |
| `live_in_stream` | Live | Policy-gated in-stream promotion |
| `search_results` | Search | Sponsored results, clearly labeled |
| `store_catalog` | Store | Sponsored products in catalog/search |
| `store_product` | Store | Related sponsored products on PDP |
| `world_nearby` | World | Nearby/place promotion (coarse geo, policy-gated) |
| `world_city` | World | City-level promotion (policy-gated) |
| `profile_feed` | Creator | Sponsored creator / boost surfaces |
| `games_promo` | Games | Promotional/rewarded units (minor-safe, policy-gated) |
| `learning_promo` | UM Learning | Course/skill promotions |
| `messages_promo` | Messages | **Future**, strict policy; no message-content targeting |

Every placement:

- Declares allowed **ad types** and render descriptor shape.
- Declares required **labeling** ("Sponsored"/"Ad") and disclosure.
- Is independently **flag-gated** (`ADS_PLACEMENT_<id>_ENABLED`).
- Enforces product-specific rules (e.g. Watch must not violate exact-context or
  interrupt playback; World must use coarse, consented geo only).

Products opt in per placement. No placement serves until both delivery and its
placement flag are enabled.

## 7. Creative management

### 7.1 Lifecycle

```
upload/select → validate (format, size, MIME, destination URL)
             → draft creative (versioned)
             → submit → moderation review → approved (immutable)
             → bind into ad(s) → eligible for delivery (flag-gated)
revision: edit approved → new draft version (old version retained for history)
```

### 7.2 Storage & security

- Private object storage bucket for creative assets; **no public URLs**.
- Reads via short-lived **signed URLs** only.
- Path scoped by advertiser account + user + asset id; access gated by
  membership and path ownership.
- MIME allowlist and max-size enforced at intake (images: JPEG/PNG/WebP; video:
  MP4/WebM/MOV in the foundation; extended per format later).

### 7.3 Destination URLs

- **https only.** No `http`, `javascript:`, `data:`, embedded credentials, or
  localhost/private hosts.
- Validated at intake and re-checked at review.

### 7.4 Format descriptors

Each ad type has a typed creative descriptor so products can render safely
without knowing ad internals:

| Ad type | Descriptor essentials |
| --- | --- |
| Video Ad | video asset ref, duration, aspect, caption/label, CTA, destination |
| Image Ad | image asset ref, aspect, headline, CTA, destination |
| Carousel | ordered cards (image/video + headline + destination), labeling |
| Story | full-screen asset, safe-area rules, CTA, dismissal |
| Live Ad | promo asset, live entity ref, placement window, labeling |
| Search Ad | headline, description, destination, sponsored label |
| Nearby Ad | promo asset, place ref, coarse-geo constraints, labeling |
| World Ad | promo asset, place/city ref, coarse-geo constraints, labeling |
| Store Sponsored Product | product ref, catalog render rules, sponsored label |
| Sponsored Creator | creator ref, boost surface rules, disclosure |
| Sponsored Live | live entity ref, promotion window, disclosure |
| Learning Promotion | course/skill ref, promo copy, destination |
| Game Promotion | promo asset, minor-safety + rewarded rules, labeling |
| App Install | store link/deep link, platform rules, labeling |
| Brand Awareness | reach-oriented video/image, frequency rules, labeling |

## 8. Ad types (catalog)

The platform is designed to support this catalog over its lifetime; each is
gated and only enabled per placement/policy when ready:

- **Video Ads** — in-feed video across Watch/Discover/World/Live.
- **Image Ads** — static units in feeds and results.
- **Carousel** — multi-card image/video with per-card destinations.
- **Story** — full-screen ephemeral units.
- **Live Ads** — promotions in/around live sessions.
- **Search Ads** — sponsored, clearly labeled search results.
- **Nearby Ads** — coarse-geo local promotion (privacy-gated).
- **World Ads** — place/city promotion within World (privacy-gated).
- **Store Sponsored Products** — promoted catalog items.
- **Sponsored Creators** — creator promotion/boosts.
- **Sponsored Live** — promoted live sessions.
- **Learning Promotions** — course/skill promotion in UM Learning.
- **Game Promotions** — minor-safe promotional/rewarded units in Games.
- **App Install** — install-objective units.
- **Brand Awareness** — reach/frequency-oriented units.

Each ad type declares: allowed placements, allowed objectives, creative
descriptor, labeling/disclosure requirements, and any minor-safety or geo
policy constraints. Adding a new ad type is a policy + descriptor + placement
declaration — not a change to the campaign object model.
