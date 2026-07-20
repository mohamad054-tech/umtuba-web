# UMTUBA Ads — Product Vision

**Document type:** Master blueprint (Ads Platform V1)  
**Scope:** Product vision and philosophy — not implementation  
**Scale assumption:** Tens of millions of users; multi-product UMTUBA ecosystem  
**Constraint:** Architecture and product design only; no code or migrations in this phase

---

## 1. Why UMTUBA Ads Exists

UMTUBA is an attention network spanning short video, Live, social discovery, Store commerce, Games, and UM Learning. Advertisers today must either interrupt that attention poorly or leave the platform entirely.

**UMTUBA Ads exists to convert ecosystem attention into measurable outcomes—commerce, awareness, education, public service, and charity—without breaking trust or the social moment.**

It is not a feed-only ad system. It is an **ecosystem demand platform**: one advertiser identity, one campaign hierarchy, many surfaces, shared identity and measurement, and native bridges into Store, Live, Games, and Learning.

### Strategic outcomes

| Outcome | Meaning |
|---------|---------|
| **Advertiser growth** | Brands, SMBs, creators, governments, and NGOs reach the right people in context |
| **Creator economy** | Creators and publishers share in ad value where policy allows |
| **Commerce flywheel** | Ads → Store / Live / product pages with first-party attribution |
| **Platform sustainability** | Monetization that funds free consumer experiences |
| **Public good capacity** | Government and charity campaigns with distinct trust rails |
| **Global relevance** | One ads system, many regions, languages, and compliance regimes |

---

## 2. Philosophy

### Principles

1. **Ecosystem first** — Ads are designed for Discover, Watch, Live, Search, Store, Profiles, Learning, Games, and future products—not only a social feed.
2. **Trust before scale** — Review, fraud controls, budget protection, and clear labeling precede aggressive auction growth.
3. **Native, not bolted** — Creatives and CTAs feel like UMTUBA surfaces; destination deep-links stay inside the app when possible.
4. **Outcome honesty** — Impressions, views, clicks, and conversions are defined, versioned, and auditable.
5. **Identity continuity** — Same UMTUBA account powers advertiser, creator, seller, learner, and viewer roles with scoped permissions.
6. **Commerce-aware demand** — Store inventory, Live sessions, courses, jobs, and listings are first-class ad objects—not only image URLs.
7. **Privacy and legality by region** — Targeting features (especially gender, age, and sensitive interests) are policy-gated per jurisdiction.
8. **Fair auction economics** — Transparent billing events, pacing, and frequency caps protect users and advertisers.
9. **Safety at internet scale** — Fake clicks, fake accounts, and budget drain are product threats, not edge cases.
10. **Extensible formats** — Custom ad formats and future placements plug into the same campaign, targeting, budget, and reporting spine.

### What we are not

- Not a Meta/Google clone pasted onto one feed  
- Not a pure display network with no UMTUBA identity  
- Not “boost post” as the only product  
- Not unmoderated open exchange that trades trust for GMV  
- Not a Store-only promo tool (promotions remain Store; Ads is paid demand)  

---

## 3. Differences from Existing Ad Platforms

| Dimension | Typical platforms | UMTUBA Ads |
|-----------|-------------------|------------|
| **Surface scope** | Feed + stories + sometimes Reels | Full ecosystem: Social, Watch, Live, Search, Store, Learning, Games, Profiles, limited Notifications |
| **Ad objects** | Creative + URL | Creative + destination type (Store SKU, Live, App, Course, Job, Listing, Government/Charity, Website) |
| **Commerce** | Pixel / partner APIs | First-party Store + Live attribution contracts |
| **Creator role** | Often separate “branded content” | Unified identity; optional creator inventory and revenue share |
| **Vertical formats** | Usually vertical-agnostic creatives | Jobs, Real Estate, Vehicles, Courses, Services as structured ads |
| **Public sector** | Afterthought or special sales | First-class Government and Charity campaign classes with elevated review |
| **Measurement** | Fragmented pixels | Shared event bus with Store, Live, Learning completion signals |
| **Trust posture** | Scale-first historically | Trust rails designed before high-velocity self-serve |

### Positioning statement

UMTUBA Ads is the **paid attention and outcomes layer** of the UMTUBA platform: it buys distribution across products while Store owns transactions, Live owns real-time sessions, Learning owns education outcomes, and Social owns identity and graph.

---

## 4. Primary Audiences

| Audience | Needs |
|----------|-------|
| **SMB / local business** | Simple campaigns, Store/Service/Jobs ads, local radius targeting |
| **Brand / agency** | Multi-placement campaigns, brand safety, reporting APIs, creative variants |
| **Creator / seller** | Promote own content, Live, and catalog with clear ROI |
| **App / game publisher** | App installs and re-engagement inside UMTUBA Games and Watch |
| **Educator / institution** | Course and Learning enrollment campaigns |
| **Government** | Civic campaigns with strict labeling and audit |
| **Charity / NGO** | Donation and awareness campaigns with verified org status |
| **Platform ops** | Review, fraud, pacing, yield, and policy tools |

---

## 5. Product Pillars (V1 Design)

| Pillar | Intent |
|--------|--------|
| **Campaign hierarchy** | Campaign → Ad Group → Ad → Creative, with shared budgets and targeting |
| **Placement system** | Inventory declared per product surface; ads eligible by type + policy |
| **Targeting engine** | Geo, demo (where legal), interests, behavior, device, schedule, frequency, audiences |
| **Budget & pacing** | Daily/lifetime budgets, date windows, hard stops, future smart pacing |
| **Auction & delivery** *(design contract)* | Rank by bid × predicted value × quality/safety; details evolve without rewriting objects |
| **Review & policy** | Pre-publish and continuous review; vertical-specific rules |
| **Measurement** | Impressions, views, reach, clicks, cost metrics, funnels, Store/Live attribution foundations |
| **Advertiser console** | Create, fund, report, appeal; API later |
| **Admin / risk** | Moderation, fraud, budget holds, audit |

---

## 6. Relationship to Other UMTUBA Systems

| System | Boundary |
|--------|----------|
| **UMTUBA Social** | Owns identity, graph, Discover, Watch, Profiles, Notifications delivery |
| **Store** | Owns catalog, cart, checkout, orders; Ads sends traffic and receives conversion events |
| **Live** | Owns sessions and Live Shopping pins; Ads can promote and attribute Live outcomes |
| **UM Learning** | Owns courses and progress; Ads promote enrollment and measure starts/completions |
| **Games** | Owns game catalog and sessions; Ads support App/Game install and engagement |
| **UM Points / Wallet** | Loyalty currency; Ads may fund points promotions later under Wallet rules—not a billing substitute |
| **Payments / Billing** | Ads billing is a separate advertiser ledger; may reuse payment adapters |

Ads **does not** replace Store promotions, coupons, or Live discounts. Those remain merchandising. Ads is **paid distribution**.

---

## 7. Trust & Brand Safety Vision

- Clear **Sponsored / Ad / Public Service / Charity** labels by campaign class.  
- Separate policy packs for commercial, political/government, and charity.  
- Frequency and placement limits to protect UX (especially Notifications).  
- Advertiser verification tiers for high-spend and sensitive verticals.  
- User controls: why this ad, hide advertiser, limited ad topics where required by law.  
- No dark patterns: misleading CTAs, fake system UI, or undisclosed sponsorship are policy violations.

---

## 8. Long-Term Vision

### Near horizon (post-V1 design → early delivery)

Self-serve commercial ads on core Social + Store placements; manual review; daily budgets; basic reporting; Store click-out attribution.

### Mid horizon

Live Ads at scale, Learning and Jobs verticals, automated review assist, lookalike/AI audiences, pacing algorithms, advertiser API, creator inventory marketplace.

### Long horizon

- Unified **outcomes marketplace**: awareness, traffic, commerce, installs, enrollments, applications, donations.  
- Cross-product **incrementality** and clean-room style measurement for large brands.  
- **AI creative assistance** and **AI audiences** with human and policy oversight.  
- Regional **data residency** and sovereign advertising modes for government clients.  
- Open but controlled **partner demand** (selected DSPs) without surrendering user trust.

### North-star experience

An advertiser in any eligible vertical can reach UMTUBA users across the products they already use, pay only for governed delivery, and prove outcomes through first-party ecosystem signals—while users still experience a platform that feels social, useful, and safe.

---

## 9. Success Criteria (Design-Level)

| Signal | Direction |
|--------|-----------|
| Advertiser retention | Repeat spend with measurable CTR/CPA/ROAS foundations |
| User trust | Low hide rates; stable ad complaint rates; clear labeling |
| Ecosystem GMV / outcomes | Meaningful Store/Live/Learning attribution share |
| Integrity | Fraud loss and invalid traffic within defined thresholds |
| Ops scalability | Review SLA met as self-serve volume grows |
| Extensibility | New placement or ad type ships without redesigning campaign spine |

---

## 10. Explicit Non-Goals for V1 Design Docs

- Choosing a specific auction formula or ML model family as permanent  
- Writing SQL DDL or shipping migrations  
- Implementing billing provider contracts in code  
- Replacing Store promotions or organic recommendation ranking  
- Political advertising productization beyond government campaign class hooks (policy TBD per region)

---

## Related Documents

- `02_SYSTEM_ARCHITECTURE.md` — services, data flow, scalability  
- `03_AD_TYPES.md` — formats and vertical ads  
- `04_PLACEMENTS.md` — inventory surfaces  
- `05_TARGETING.md` — audience selection  
- `06_BUDGET_SYSTEM.md` — spend controls  
- `07_REPORTING.md` — analytics and attribution  
- `08_SECURITY.md` — review, fraud, permissions  
- `09_DATABASE_BLUEPRINT.md` — conceptual entities  
- `10_FUTURE_ROADMAP.md` — phased integration with UMTUBA products  
