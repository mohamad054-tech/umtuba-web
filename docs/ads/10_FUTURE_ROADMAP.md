# UMTUBA Ads — Future Roadmap

**Document type:** Phased delivery and ecosystem integration blueprint  
**Constraint:** Architecture first; no implementation in V1 docs phase  
**Scale target:** Global ads platform across Social, Store, Live, Games, UM Learning, and future products

---

## 1. Roadmap Philosophy

- Ship **trustworthy self-serve** before exotic formats.  
- Integrate **first-party outcomes** (Store, Live, Learning) early—this is the UMTUBA advantage.  
- Keep the **campaign spine stable** while placements and formats expand.  
- Treat **Government and Charity** as privileged classes with slower, safer rollout.  
- Align milestones with Store and Live roadmaps where commerce attribution depends on them.

---

## 2. Phase 0 — Foundation & Blueprint *(current)*

**Goal:** Freeze Ads identity: vision, architecture, types, placements, targeting, budget, reporting, security, data model, roadmap.

### Deliverables

- [x] Product vision  
- [x] System architecture  
- [x] Ad types & placements  
- [x] Targeting & budget systems  
- [x] Reporting & security  
- [x] Conceptual database blueprint  
- [x] This roadmap  

### Exit criteria

Stakeholders agree: Ads is ecosystem demand (not feed-only); Store promotions ≠ Ads; boundaries with Social/Live/Learning are clear.

---

## 3. Phase 1 — Ads MVP Core

**Goal:** Trusted paid delivery on a minimal placement set with commercial advertisers.

### Scope

- AdvertiserOrg + roles + prepaid billing v1  
- Campaign → Ad Group → Ad → Creative (image + video)  
- Placements: Discover sponsored unit + Watch between-videos  
- Targeting: country/region/city, language, age, schedule, basic frequency  
- Daily + lifetime budgets + auto-stop  
- Manual review queue + basic automated URL/malware checks  
- Metrics: impressions, views, clicks, CTR, CPC, CPM, spend  
- Website + Store product destinations (Store click → PDP)  
- Fraud v1: velocity + signed tokens + simple IVT credits  

### Explicitly deferred

- Live Ads at scale  
- Carousel / vertical structured ads  
- AI audiences  
- CPA optimization / full ROAS automation  
- Notifications ads  
- Government/Charity self-serve  
- Partner DSP  

### Exit criteria

Real advertiser spend with controlled cohort; review SLA met; IVT within pilot threshold; no silent overspend beyond tolerance.

---

## 4. Phase 2 — Commerce & Social Activation

**Goal:** Make Ads native to UMTUBA commerce and richer social inventory.

### Scope

- Carousel + multi-SKU Store Ads  
- Store placements (home/category/search sponsored)  
- Search sponsored block  
- Store attribution v1 (purchase ROAS foundation)  
- Boosted organic video as ad type  
- Profiles limited placements  
- Interest + behavior remarketing audiences (first-party)  
- Even pacing v1  
- Advertiser diagnostics (budget limited, learning limited)  

### Depends on

Store catalog eligibility APIs; Store conversion event contracts (`docs/store`).

### Exit criteria

Meaningful share of Store-attributed GMV from Ads; advertisers retain on ROAS-visible campaigns.

---

## 5. Phase 3 — Live, Learning, Apps

**Goal:** Expand ecosystem destinations and outcomes.

### Scope

- Live Ads (lobby + pre-join + companion) + Live join/purchase attribution  
- UM Learning course ads + enroll attribution  
- App / Games ads + install open attribution  
- Jobs / Services structured ads (pilot geos)  
- Dayparting sophistication + connection/device targeting  
- Automated review assist (classifiers) with human final for edge cases  
- Frequency caps cross-product hardening  

### Exit criteria

Multi-product campaign performance visible in one console; Live peak serve isolated successfully.

---

## 6. Phase 4 — Vertical Scale & Public Classes

**Goal:** Depth in classifieds-like verticals and privileged campaign classes.

### Scope

- Real Estate + Vehicles ads with listing integrity checks  
- Government campaigns (verified orgs, special labels, audit exports)  
- Charity campaigns (verified NGOs, donation attribution)  
- Notifications limited inventory (opt-in regions)  
- Customer list matching (hashed) + suppression audiences  
- Postpaid invoicing for enterprise  
- Reporting API + async exports  

### Exit criteria

Vertical SLAs and legal packs approved per launch country; public-sector audit trail proven.

---

## 7. Phase 5 — Intelligence & Marketplace

**Goal:** Optimize outcomes and expand supply/demand safely.

### Scope

- AI / lookalike audiences with kill switches  
- CPA bid strategies + conversion optimization  
- Multi-touch path reporting  
- Creator inventory marketplace / branded content ads  
- Playable / rewarded game ads  
- Catalog-feed dynamic Store creatives  
- Incrementality experimentation toolkit  
- Selective partner demand adapter (optional)  
- Cross-region active-active delivery maturity  

### Exit criteria

Automated strategies beat manual CPC baselines on held-out studies; creator revenue share accounting correct; partner demand does not worsen IVT/trust KPIs.

---

## 8. Integration Maps by Product

### UMTUBA Social (Discover, Watch, Profiles, Search, Notifications)

| Phase | Integration |
|-------|-------------|
| 1 | Discover + Watch inventory; identity; media CDN; hide/report |
| 2 | Search + Profiles; boosted content |
| 3+ | Cross-product frequency; notification caps |
| 5 | Creator inventory marketplace |

### Store

| Phase | Integration |
|-------|-------------|
| 1 | Product destination deep links; eligibility on publish state |
| 2 | Store placements; purchase attribution; ROAS foundation |
| 3+ | Live shopping dual attribution; dynamic catalog creatives |
| Note | Coupons/promotions remain Store-owned |

### Live

| Phase | Integration |
|-------|-------------|
| 3 | Promote Live; companion placements; join attribution |
| 3+ | Live purchase attribution with Store |
| 5 | Host-sold vs platform inventory split (if productized) |

### Games

| Phase | Integration |
|-------|-------------|
| 3 | App install ads in Games catalog + Watch |
| 5 | Rewarded/playable formats |

### UM Learning

| Phase | Integration |
|-------|-------------|
| 3 | Course ads + enroll/start events |
| 4+ | Institution advertisers; gov education campaigns |

### Future products

Register placements via Placement Registry; inherit campaign, budget, review, fraud, reporting spine.

---

## 9. Cross-Cutting Workstreams (All Phases)

| Workstream | Continuous focus |
|------------|------------------|
| **Trust** | Review SLA, IVT, budget freezes |
| **Privacy / Legal** | Regional targeting packs, youth, disclosures |
| **Measurement honesty** | Metric definition versions |
| **Reliability** | Ads degrade to organic-only |
| **Yield** | Fill rate without trust regression |
| **Docs ↔ impl** | Keep blueprints updated when decisions land |

---

## 10. Dependency Risks

| Risk | Mitigation |
|------|------------|
| Store attribution contract delayed | Ship click→PDP metrics first; purchases as phase gate |
| Live inventory UX conflict | Hard rules: never block pins; separate companion slots |
| Review staffing | Automate assist early; throttle self-serve verticals |
| Fraud against prepaid | Graduated limits + anomaly freeze |
| Over-scoping verticals | Pilot Jobs before Real Estate/Vehicles |
| Policy variance by country | Feature flags; don’t global-enable gender targeting |

---

## 11. Success Metrics by Phase

| Phase | Leading indicators |
|-------|--------------------|
| 1 | Paying advertisers, review SLA, IVT %, overspend incidents = 0 Sev-1 |
| 2 | Store-attributed GMV $, advertiser retention |
| 3 | Multi-product campaigns %, Live join CPA quality |
| 4 | Vertical complaint rate, gov/charity audit pass |
| 5 | Optimization lift, creator ads revenue share accuracy |

---

## 12. What “Done” Looks Like Long-Term

UMTUBA Ads is the default paid layer for the ecosystem: any eligible product can monetize attention with labeled inventory; any eligible advertiser can buy outcomes with first-party proof; users retain trust; and new formats plug into the same spine without redesign.

---

## Related Documents

- All `docs/ads/01`–`09` blueprints  
- `docs/store/14_ROADMAP.md` — commerce dependencies  
- `docs/store/10_LIVE_SHOPPING.md` — Live commerce attribution surface  
