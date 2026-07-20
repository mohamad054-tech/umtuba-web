# UMTUBA Ads — Ad Types

**Document type:** Ad format and vertical product blueprint  
**Scope:** Creative shapes + destination/vertical types for the full UMTUBA ecosystem  
**Rule:** New formats plug into the same Campaign → Ad Group → Ad → Creative spine

---

## 1. Design Principles

1. **Separate creative shape from destination intent** — A video creative can drive Store, Website, App, or Live.  
2. **Vertical ads carry structured fields** — Jobs, Real Estate, Vehicles, Courses are not free-text posters only.  
3. **Policy packs differ by class** — Commercial, App, Government, Charity, Sensitive verticals.  
4. **Every ad has a clear CTA and destination type** — No unlabeled soft redirects.  
5. **Extensibility** — Custom formats register schema + placements + review rules without rewriting billing.

---

## 2. Campaign Classes

| Class | Purpose | Special rules |
|-------|---------|---------------|
| **Commercial** | Brand, SMB, seller promotion | Standard commercial policy |
| **App / Game** | Installs and engagement | Store listing / package verification |
| **Government** | Civic / public service | Elevated verification + labeling |
| **Charity** | Fundraising / awareness | Org verification + donation destination rules |
| **Recruitment** | Jobs | Employment disclosure rules |
| **Classifieds-like** | Real estate, vehicles, services | Structured listing integrity |

Campaign class constrains allowed ad types, placements, and review SLAs.

---

## 3. Creative Shapes (Media Formats)

### 3.1 Video Ads

| Aspect | Spec (design) |
|--------|----------------|
| **Use** | Watch, Discover, Live pre-roll/mid (policy), Learning mid-roll (rare), App trailers |
| **Assets** | Primary video + optional thumbnail + captions / burn-in text rules |
| **Metrics foundation** | Impressions, views (viewability + quartile), completions, clicks |
| **Constraints** | Max length per placement; sound-off safe framing; no fake player chrome |

**Variants:** In-feed video, rewarded/optional (future Games), Live companion video card.

### 3.2 Image Ads

| Aspect | Spec (design) |
|--------|----------------|
| **Use** | Discover, Search, Store, Profiles, Notifications (static), Learning side units |
| **Assets** | Single image + headline + body + CTA |
| **Constraints** | Safe-zone for UI chrome; text-to-image ratio policy optional |

### 3.3 Carousel Ads

| Aspect | Spec (design) |
|--------|----------------|
| **Use** | Discover, Store, Profiles, Search |
| **Assets** | 2–N cards; each card may deep-link differently (e.g., multi-SKU) |
| **Constraints** | Max cards per placement; consistent aspect ratio; swipe affordance required |
| **Commerce note** | Ideal for multi-product Store campaigns |

### 3.4 Collection / Catalog-style *(subset of carousel evolution)*

Optional future shape: auto-filled from Store catalog feed. V1 design allows manual carousel; catalog sync is roadmap.

---

## 4. Destination & Vertical Ad Types

### 4.1 Store Ads

**Intent:** Drive product or storefront discovery and purchase.

| Field group | Examples |
|-------------|---------|
| Destination | `store_id`, `product_id`, `variant_id?`, collection |
| Creative | Image / video / carousel of SKUs |
| CTA | Shop now, View product, View store |
| Attribution | PDP views, ATC, purchases via Store bridge |

**Eligibility:** Product must be publishable per Store moderation; suspended SKUs auto-ineligible.

### 4.2 Live Ads

**Intent:** Drive viewers into a Live session (and optionally Live Shopping).

| Field group | Examples |
|-------------|---------|
| Destination | `live_session_id` or scheduled Live |
| Creative | Stream cover, host avatar, live badge |
| CTA | Watch Live, Join now |
| Attribution | Join, watch time, Live purchase events |

**Constraints:** Cannot advertise ended Lives without clear VOD destination; fake “LIVE” badges forbidden.

### 4.3 App Ads

**Intent:** App / game install or re-engagement.

| Field group | Examples |
|-------------|---------|
| Destination | App store URL / UMTUBA Games deep link / package name |
| Creative | Video trailer, image, carousel screenshots |
| CTA | Install, Play, Open |
| Attribution | Install, first open, retention events (MMP or first-party)

### 4.4 Website Ads

**Intent:** Traffic to external or UMTUBA web destinations.

| Field group | Examples |
|-------------|---------|
| Destination | HTTPS URL allowlisted; redirect chain limits |
| Creative | Image / video / carousel |
| CTA | Learn more, Visit site |
| Measurement | Clicks + optional future pixel / CAPI |

**Constraints:** Malware/phishing scan; disclosure when leaving app.

### 4.5 Service Ads

**Intent:** Local or professional services (booking, consult, on-demand).

| Field group | Examples |
|-------------|---------|
| Structured | Service category, service area, price band optional |
| Destination | Profile, Store service offering, website, WhatsApp-style deep link (policy) |
| CTA | Book, Contact, Get quote |

### 4.6 Jobs Ads

**Intent:** Job applications and employer brand.

| Field group | Examples |
|-------------|---------|
| Structured | Title, employer, location/remote, employment type, salary disclosure where required |
| Destination | Job detail on UMTUBA or ATS URL |
| CTA | Apply, View job |
| Policy | No discriminatory targeting where prohibited; clear sponsored job label |

### 4.7 Real Estate Ads

**Intent:** Property interest and inquiries.

| Field group | Examples |
|-------------|---------|
| Structured | Property type, price, beds/baths, location, listing id |
| Destination | Listing detail / agent profile / website |
| CTA | View listing, Contact agent |
| Policy | Truth-in-advertising for price and availability; geo compliance |

### 4.8 Vehicles Ads

**Intent:** Vehicle listing interest.

| Field group | Examples |
|-------------|---------|
| Structured | Make, model, year, price, mileage, condition, VIN optional |
| Destination | Listing / dealer storefront |
| CTA | View vehicle, Contact dealer |
| Policy | Accurate specs; stolen-vehicle / fraud checks via review signals |

### 4.9 Courses (UM Learning) Ads

**Intent:** Course discovery and enrollment.

| Field group | Examples |
|-------------|---------|
| Destination | `course_id` / Learning path |
| Creative | Trailer video, instructor image, syllabus highlights |
| CTA | Enroll, Start learning, View course |
| Attribution | Enroll, first lesson start, completion (privacy-aware) |

### 4.10 Government Campaigns

**Intent:** Public information, civic programs, emergency awareness.

| Field group | Examples |
|-------------|---------|
| Verification | Government org tier required |
| Labeling | “Public service” / regional legal label |
| Creative | Image / video / carousel; strict claim review |
| Destination | Official domains / in-app civic hubs |
| Targeting | Often broad; sensitive microtargeting restricted |

### 4.11 Charity Campaigns

**Intent:** Awareness and donations.

| Field group | Examples |
|-------------|---------|
| Verification | Registered charity / NGO tier |
| Labeling | Charity / fundraising disclosure |
| Destination | Verified donation flow or official site |
| Policy | No misleading urgency; fund use claims reviewable |

---

## 5. Hybrid & Native Patterns

| Pattern | Description |
|---------|-------------|
| **Boosted content** | Promote existing organic video/post with ad delivery + label |
| **Creator partnership ad** | Branded content with creator inventory (roadmap marketplace) |
| **Store + Video** | Video creative with Store product CTA |
| **Live + Store** | Live destination with shoppable session |
| **Learning + Video** | Course trailer as video ad |

Boosted content still creates an Ad entity referencing `source_content_id`.

---

## 6. Future Custom Formats

### Extension model

1. Register **format_id** and JSON schema for creative payload.  
2. Declare **eligible placements**.  
3. Attach **review policy pack**.  
4. Declare **billable events** (impression, view, click, custom).  
5. Ship client renderer behind feature flag.

### Example future formats

- Interactive polls inside ad unit  
- AR try-on (commerce)  
- Playable game ads  
- Audio-only ads for future audio products  
- Map pins for local services  
- Sponsored Learning quizzes  

---

## 7. Ad Object Model (Logical)

```text
Campaign (class, objective, budget defaults)
  └─ Ad Group (targeting, placement set, bid)
       └─ Ad (type, destination, status)
            ├─ Creative(s) (shape: video/image/carousel/custom)
            └─ Structured payload (job/listing/course fields as needed)
```

**Objective examples (V1 design):** Awareness, Traffic, Engagement, Conversions (Store), App Install, Live Views, Lead/Apply, Donations.

Objectives constrain optimization signals; they do not replace destination types.

---

## 8. Eligibility Matrix (Summary)

| Ad type | Discover | Watch | Live | Search | Store | Profiles | Notifs | Learning | Games |
|---------|----------|-------|------|--------|-------|----------|--------|----------|-------|
| Video | ✓ | ✓ | ◐ | ◐ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Image | ✓ | ◐ | ◐ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Carousel | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ◐ | ◐ |
| Store | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ◐ | ✗ | ✗ |
| Live | ✓ | ✓ | ✓ | ✓ | ◐ | ✓ | ◐ | ✗ | ✗ |
| App | ✓ | ✓ | ◐ | ✓ | ✗ | ◐ | ◐ | ✗ | ✓ |
| Website | ✓ | ✓ | ◐ | ✓ | ◐ | ✓ | ◐ | ✓ | ◐ |
| Service | ✓ | ◐ | ✗ | ✓ | ✓ | ✓ | ◐ | ✗ | ✗ |
| Jobs | ✓ | ◐ | ✗ | ✓ | ✗ | ✓ | ◐ | ✓ | ✗ |
| Real Estate | ✓ | ◐ | ✗ | ✓ | ◐ | ✓ | ◐ | ✗ | ✗ |
| Vehicles | ✓ | ◐ | ✗ | ✓ | ◐ | ✓ | ◐ | ✗ | ✗ |
| Courses | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ | ◐ | ✓ | ✗ |
| Government | ✓ | ✓ | ◐ | ✓ | ✗ | ✓ | ✓ | ✓ | ◐ |
| Charity | ✓ | ✓ | ◐ | ✓ | ◐ | ✓ | ✓ | ✓ | ◐ |

Legend: ✓ allowed · ◐ conditional/policy · ✗ not in V1 design

---

## 9. Labeling Requirements

Every rendered ad must expose:

- Sponsored / Ad label (localized)  
- Advertiser display name  
- Campaign class label when Government or Charity  
- “Why am I seeing this?” entry point (where legally required or product-standard)

---

## Related Documents

- `04_PLACEMENTS.md` — slot UX and inventory rules  
- `05_TARGETING.md` — who can see which types  
- `08_SECURITY.md` — review by vertical  
- `09_DATABASE_BLUEPRINT.md` — creatives and structured payloads  
