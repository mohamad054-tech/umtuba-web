# UMTUBA Ads — Placements

**Document type:** Inventory and placement blueprint  
**Scope:** Where ads can appear across the UMTUBA ecosystem  
**Principle:** Products declare placements; Ads fills them under policy and UX caps

---

## 1. Placement Principles

1. **Labeled inventory only** — Users must recognize paid units.  
2. **Product-owned UX** — Each product defines slot size, frequency, and chrome.  
3. **Hard caps beat yield** — Especially Notifications and Profiles.  
4. **Organic integrity** — Ads never silently reorder organic relevance without a sponsored lane.  
5. **Eligibility is typed** — Placement × ad type × campaign class matrix.  
6. **Degrade gracefully** — Empty slot collapses; no error placeholders.  
7. **Future-proof registry** — New products register placements without Ads core redesign.

---

## 2. Placement Registry Model

Each placement declares:

| Field | Meaning |
|-------|---------|
| `placement_id` | Stable identifier (e.g., `discover.feed.in_stream`) |
| `product` | Discover, Watch, Live, Search, Store, … |
| `slot_shape` | Video, image, carousel, native card, notification |
| `eligible_ad_types` | From `03_AD_TYPES.md` |
| `max_ads_per_session / per_view` | Frequency at placement level |
| `viewability standard` | When an impression counts |
| `tracking mode` | Client SDK events required |
| `brand_safety floor` | Minimum creative/policy tier |
| `region_flags` | Enable/disable by country |

---

## 3. Discover

**Product intent:** Serendipitous social discovery (posts, short video cards, creator suggestions).

| Placement | Description | Typical formats |
|-----------|-------------|-----------------|
| `discover.feed.sponsored_unit` | In-stream sponsored card between organic items | Image, video, carousel, Store, Live, Jobs, etc. |
| `discover.feed.video_takeover` | Full-bleed short video ad unit | Video |
| `discover.suggestions.sponsored` | Sponsored suggested accounts/stores (strict label) | Image + profile/store destination |

### UX rules

- Minimum organic gap between ads (configurable, e.g., N organic items).  
- No infinite consecutive ads.  
- Hide-ad feedback reduces that advertiser for a cool-down window.

---

## 4. Watch

**Product intent:** Immersive short/long video consumption.

| Placement | Description | Typical formats |
|-----------|-------------|-----------------|
| `watch.feed.between_videos` | Ad between organic videos | Video (primary), image fallback rare |
| `watch.overlay.end_card` | End-of-video sponsored card | Image/video CTA |
| `watch.overlay.product_shelf` | Sponsored product shelf (distinct from organic tags) | Store carousel |

### UX rules

- Prefer skippable mid-roll style between videos over interrupting mid-play in V1 design.  
- Sound and autoplay follow Watch norms; ads must be safe muted-first.  
- Creator revenue share hooks reserved for inventory sourced from creator content (roadmap).

---

## 5. Live

**Product intent:** Real-time sessions and Live Shopping.

| Placement | Description | Typical formats |
|-----------|-------------|-----------------|
| `live.lobby.sponsored` | Sponsored Live in lobby/discover Live rail | Live Ads |
| `live.pre_join.interstitial` | Before join (skippable, capped) | Video/image → Live or Store |
| `live.in_stream.companion` | Non-blocking companion card | Store / Website / App |
| `live.ended.recap_sponsor` | After stream sponsored next-step | Image/video |

### UX rules

- Never cover critical Live Shopping pin UI with ads.  
- Fake live indicators prohibited.  
- Host-sold inventory vs platform inventory must be distinguishable in billing (future).

---

## 6. Search

**Product intent:** Intentful query across people, videos, products, jobs, courses.

| Placement | Description | Typical formats |
|-----------|-------------|-----------------|
| `search.results.sponsored_block` | Labeled sponsored block above/within results | Image, Store, Jobs, Real Estate, Vehicles, Courses, Website |
| `search.results.inline_item` | Single sponsored result row | Structured vertical ads |
| `search.suggestions.sponsored` | Sponsored suggestion chips (rare, strict) | Text + destination |

### UX rules

- Sponsored results must not mimic organic ranking chrome.  
- Query relevance floor: ads below relevance threshold are not shown (preserve trust).  
- Vertical search tabs (Jobs, Store) may have dedicated sponsored lanes.

---

## 7. Store

**Product intent:** Commerce browse, PDP, storefronts (see Store docs).

| Placement | Description | Typical formats |
|-----------|-------------|-----------------|
| `store.home.banner` | Store home hero/mid banner | Image, carousel, Store Ads |
| `store.category.sponsored` | Category rail sponsored products | Store Ads |
| `store.search.sponsored` | Sponsored products in store search | Store Ads |
| `store.pdp.related_sponsored` | Sponsored related on PDP | Store carousel |
| `store.storefront.external_promo` | Cross-seller promo only if policy allows | Limited |

### Boundary with Store promotions

- **Organic merchandising / coupons** = Store Pricing & Promotions.  
- **Paid Store Ads** = Ads billing + auction.  
- Same SKU may appear in both; labeling and reporting must distinguish.

---

## 8. Profiles

**Product intent:** User/creator/seller profile visits.

| Placement | Description | Typical formats |
|-----------|-------------|-----------------|
| `profile.timeline.sponsored` | Occasional sponsored unit in profile content | Image/video (low frequency) |
| `profile.spotlight.banner` | Profile owner-purchased spotlight (optional product) | Image |
| `profile.visitor.suggested_ad` | Visitor-side suggestion (very capped) | Follow/Store/App |

### UX rules

- Profile owner spotlight ≠ visitor targeting without consent/policy.  
- Lower density than Discover/Watch.

---

## 9. Notifications (Limited)

**Product intent:** Timely personal alerts—ads are exceptional.

| Placement | Description | Typical formats |
|-----------|-------------|-----------------|
| `notifications.tray.sponsored` | Rare sponsored notification | Image thumbnail + text |
| `notifications.push.sponsored` | Push sponsored (default off; region opt-in) | Text + deep link |

### Hard constraints

| Rule | Design default |
|------|----------------|
| Max sponsored notifications / user / week | Low hard cap (platform-configured) |
| Quiet hours | Honored |
| User opt-out | Must exist |
| Government / emergency | May use distinct civic channel—not commercial ads |
| Creative | No fake system alerts (“Your account…”) |

---

## 10. UM Learning

**Product intent:** Course discovery and learning sessions.

| Placement | Description | Typical formats |
|-----------|-------------|-----------------|
| `learning.catalog.sponsored` | Sponsored courses in catalog | Courses Ads, video trailer |
| `learning.search.sponsored` | Sponsored in Learning search | Courses, Website (edu) |
| `learning.player.between_lessons` | Between lessons (skippable, capped) | Video / Courses |
| `learning.home.rail` | Home sponsored rail | Courses, Government edu campaigns |

### UX rules

- Do not interrupt active quiz/exam flows.  
- Education policy pack: no predatory finance claims adjacent to minors’ content, etc.

---

## 11. Games (and App surfaces)

| Placement | Description | Typical formats |
|-----------|-------------|-----------------|
| `games.catalog.sponsored` | Sponsored games/apps | App Ads |
| `games.interstitial.between_sessions` | Between play sessions | Video/playable (future) |
| `games.rewarded` *(future)* | User-opted rewarded | Video |

---

## 12. Future Products

Placement registry supports unknown products via:

```text
product.register_placement(placement_manifest)
  → Ads validates schema
  → Feature flag per region
  → Client SDK renders using declared slot_shape
```

Examples: Audio, Maps, Dating-safe social extensions, Enterprise hubs, Civic portals.

---

## 13. Frequency & Session Caps (Cross-Placement)

| Cap type | Scope |
|----------|-------|
| Per placement | Max ads per feed page / session |
| Per product | Max ads per Watch session |
| Cross-product | User-level frequency cap (see Targeting) |
| Advertiser | Max impressions per user per day |
| Creative | Dedup creative across nearby slots |

Caps are enforced in Delivery with budget/fraud services cooperating.

---

## 14. Viewability & Impression Standards (Design)

| Placement family | Impression foundation |
|------------------|----------------------|
| Feed cards | % pixels in view for T ms |
| Video | Viewability + optional quartile for “view” metric |
| Search | Rendered in viewport (not merely returned) |
| Notification | Open/render of notification content |
| Live companion | Visible duration threshold |

Exact numeric thresholds are implementation config; definitions must be versioned for reporting honesty.

---

## 15. Inventory Forecasting (Design Hook)

Placement Registry exposes estimated available impressions for Advertiser Console planning (future). V1 design requires the **data contract**, not the full forecaster.

---

## Related Documents

- `03_AD_TYPES.md` — eligibility matrix  
- `05_TARGETING.md` — frequency and scheduling  
- `07_REPORTING.md` — placement breakdowns  
- `02_SYSTEM_ARCHITECTURE.md` — delivery path  
