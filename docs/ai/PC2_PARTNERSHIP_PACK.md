# UMTUBA Partnership Pack

**DATE** = 2026-08-18  
**DEVICE** = PC2  
**TASK** = PC2-A3 Partnership Outreach Pack (token-conservative)  
**STATUS** = DRAFT PACK ONLY — DO NOT SEND  
**MESSAGES_SENT** = 0  
**MODE** = Pre-company exploratory foundations. No catalog import. No fake partnerships.

`PC2_COMMERCE_PARTNER_READINESS.md` and `PC2_LEARNING_PARTNER_READINESS.md` were **not present** in this repo at write time. Program facts below come from first-party pages retrieved on 2026-08-18, plus UMTUBA Store / Learning / i18n / legal architecture already in this web repo.

---

## Legal placeholders (do not invent)

| Field | Value |
| --- | --- |
| LEGAL_COMPANY_NAME | PENDING |
| REGISTRATION_NUMBER | PENDING |
| REGISTRATION_COUNTRY | PENDING |
| BUSINESS_ADDRESS | PENDING |
| BANK/TAX_DETAILS | PENDING |

UMTUBA is not presenting itself as an incorporated trading entity in this pack. Where an official program requires a legal entity, tax ID, or business registration, the correct action is a **pre-registration exploratory inquiry** only.

---

## 1. Company / platform introduction

UMTUBA is a multi-surface web platform (Next.js) that combines social discovery, creator tools, **Store (Commerce)**, and **Learning OS** under one authenticated product, with shared i18n, revenue-ledger contracts, and fail-closed data rules.

**Public / product surfaces already in this repo (foundations, not all live in Production):**

- **Store / Commerce** — operator-reviewed seller onboarding, public store profiles, catalog, wishlist, cart, checkout quote/confirm, orders, promotions/fulfillment, settlement contracts.
- **Learning OS** — Spaces → Programs → Courses → Sections → Lessons → Activities; enrollments as entitlements (not payments); assessments; instructor authoring.
- **Shared platform** — App Shell locales, Unified Revenue Platform (sources include `commerce` and `learning`; consumers include `affiliate`, `seller`, `supplier`, `creator`, `platform`), UM Points / wallet presentation, ads/live/video adjacent surfaces.
- **Legal / privacy** — public Privacy Policy and Terms of Use for the Beta experience (`/privacy`, `lib/legal/legalDocuments.ts`).

**What UMTUBA is not claiming in this pack**

- Incorporated company details (all LEGAL_* = PENDING).
- Live authorized catalogs from any named partner.
- Live PSP / carrier / tax-engine production wiring (checkout foundation is provider-neutral; Stripe/PayPal/etc. remain deferred in Store docs).
- Rights to host, scrape, or train AI on third-party catalogs or course libraries.

---

## 2. Store partnership overview

UMTUBA Store is a **marketplace-style commerce surface**, not a scrape-and-list engine.

**Existing Store capabilities (architecture, this repo)**

| Capability | Status in product docs |
| --- | --- |
| Operator-reviewed seller applications | Implemented (`seller_applications`; no self-serve store creation) |
| Public catalog + store profiles | Implemented (`catalogQueries`, id-based deep links) |
| Product types / logistics fields | Physical + `booking`; `origin_country_code`, weight/dims |
| Cart → checkout quote → order confirm | Implemented; prices never trusted from client |
| Hosted checkout | `/store/checkout` (auth-gated) |
| Payment gateways | Deferred (no live Stripe/PayPal/HyperPay/MyFatoorah/Tap in Checkout Foundation) |
| Affiliates as a revenue consumer | Contract exists in Unified Revenue Platform; **no live partner-network integration** |
| External partner feed importer | **Not implemented** — would be a future official-API adapter only |

**Partnership posture for Store**

1. **Default / safest:** official **affiliate** programs — tracked outbound links or codes; checkout stays on the partner site.
2. **If and only if the partner’s official program allows it:** read-only **API / catalog feed** for discovery cards that still check out on the partner (Amazon Creators API, AliExpress Portals API, eBay EPN feeds — after approval).
3. **Wholesale / sourcing:** only where the partner is a B2B marketplace (Alibaba.com, DHgate). This is a buyer/sourcing conversation, not “list their retail catalog as UMTUBA inventory.”
4. **Dropship / reseller:** only if a first-party program exists and UMTUBA later has a legal entity + written grant. Not requested as a default.
5. **Never:** scrape catalogs; imply we already sell their goods; treat affiliate approval as catalog, hosting, or AI-training rights.

---

## 3. Learning partnership overview

UM Learning OS is a **first-party learning system** (spaces, programs, courses, enrollments, assessments). Enrollments answer “is this learner entitled to participate?” and use **soft references** for any future payment/source — there are no cross-product FKs to partner catalogs.

**Partnership posture for Learning**

1. **Default / safest:** official **affiliate / publisher** programs — deep links to the partner’s checkout or subscription page; UMTUBA does not host their videos or issue their certificates.
2. **Content partnership / revenue_share:** only if the partner’s official channel (e.g. Coursera Channel Partner *Technology & Integration*, FutureLearn institutional partner, MasterClass Partnership Program) exists and later grants a written integration. Exploratory only until LEGAL_* exist.
3. **Reseller / campus / enterprise seat sales:** only via first-party channel programs (Coursera Channel Partner Reseller; MasterClass at Work). Entity-gated.
4. **Never:** ask Coursera for Skillshare class-hosting rights; ask Udemy/edX/DataCamp for a wholesale course dump; ingest MOOC libraries into Learning OS; claim AI-tutor rights over partner content.

---

## 4. Target markets

**Do not invent geo coverage.** UMTUBA documents **language support**, not a published ship-to / sell-in country list.

| Dimension | Product-supported today | Not claimed |
| --- | --- | --- |
| UI locales | `ar` (RTL), `en` (default), `fr`, `es`, `de`, `pt` (`lib/i18n/locales.ts`, Platform I18n Foundation V1) | Extra languages (e.g. `zh`) |
| Locale resolution | Cookie `umtuba_locale` → Accept-Language → `en` | Locale URL prefixes |
| Commerce ship-to countries | PENDING — `origin_country_code` exists on products; no published destination matrix | “We ship to 150+ countries” |
| Learning availability by country | PENDING — no published geo eligibility table | Partner-equivalent campus coverage |
| Payments / tax nexus | PENDING — checkout tax configs are foundation only (`not_legal_advice: true`) | Registered VAT/GST numbers |
| Partner program geos | Follow **each partner’s** official eligibility; UMTUBA does not assert we are approved in their markets | |

When speaking to partners: describe UMTUBA as a **multi-language product surface** (Arabic + five Latin locales), not as a registered operator in named countries.

---

## 5. Integration capabilities

Generic modes that match current Store / Learning architecture. None of these are live partner connections.

| Mode | What UMTUBA can do later | What exists now |
| --- | --- | --- |
| **Affiliate links** | Store/Learning cards with official tracked URLs/codes; disclose affiliate relationship; attribute via partner network | Revenue consumer `affiliate` in ledger contracts; no Impact/Awin/Portals/Associates wiring |
| **Catalog feed adapters** | Read-only official API/feed → curated discovery cards; partner remains merchant of record | Internal `catalogQueries` for **UMTUBA sellers only** |
| **Hosted checkout (UMTUBA)** | Buyer pays on UMTUBA for **authorized UMTUBA-seller** inventory | Checkout Foundation (quote/confirm, no live PSP) |
| **Offsite / partner checkout** | Click-out to partner cart (affiliate default) | Natural for affiliate; not a partner SSO checkout |
| **Enrollment entitlement** | After a partner confirms a paid referral, optionally mark a Learning entitlement via soft `source` refs | Enrollments Foundation; no partner gateway |
| **Wholesale / dropship** | Operator-reviewed seller + official supplier APIs, if granted | Seller applications + logistics fields; no supplier API |

---

## 6. Commercial models

Ask **only** the model the partner actually publishes. Rates below are **partner-published headlines**, not UMTUBA offers. UMTUBA does not invent commissions.

| Model | Typical use | Ask only of |
| --- | --- | --- |
| `affiliate` | CPS / tracked referral; partner is merchant of record | All 15 (where a public affiliate/influencer program exists) |
| `api-feed` | Official product/course metadata for discovery | Amazon Creators API; AliExpress Portals API; eBay EPN feeds/APIs — after their eligibility gates |
| `catalog` | Authorized listing inside UMTUBA Store | **Not a default ask.** Only after a written catalog grant. None of the 15 publish “upload our full catalog to your marketplace” as the public affiliate program. |
| `reseller` | Sell partner seats / Plus / enterprise | Coursera Channel Partner (Reseller); exploratory MasterClass at Work |
| `wholesale` | B2B sourcing / MOQ supplier relationships | Alibaba.com; DHgate (marketplace nature). **Not** Amazon, SHEIN, Temu, Trendyol, eBay retail, or Learning brands. |
| `dropship` | Supplier ships to end buyer | Only if a first-party dropship program is later confirmed (AliExpress historically had a Dropshipping Center; treat current status as **verify-at-application**). Not a default ask. |
| `revenue_share` | Channel / integration economics | Coursera Channel Partner; FutureLearn / MasterClass partnership talks — exploratory |
| `content_partnership` | Co-branded or licensed learning, not scrape-host | Coursera Technology & Integration; FutureLearn institutional partner; MasterClass Partnership Program. **Not** Skillshare/Udemy/edX/DataCamp public affiliate pages. |

---

## 7. Compliance / rights policy

**Affiliate approval ≠ catalog rights ≠ hosting rights ≠ AI rights.**

1. **Affiliate** grants permission to promote with **their** tracked assets, subject to their operating agreement. It does not grant a license to copy product databases, course videos, certificates, or instructor IP onto UMTUBA.
2. **API / feed** access (when granted) is typically limited to display + click-out under the partner’s brand and data-use rules (example: Amazon Associates / Creators API participation requirements; AliExpress Portals agreement defines “AliExpress Content”).
3. **Catalog / hosting** on UMTUBA Store or Learning OS requires a **separate written grant**. Until then, partner goods/courses stay on the partner site.
4. **AI** — UMTUBA will not use partner catalogs, course text, or media to train or fine-tune models unless a later written AI-rights addendum says so. Affiliate and feed terms are not that addendum.
5. **No scraping** of partner storefronts or course catalogs (task hard rule).
6. **Seller integrity** — UMTUBA sellers are operator-reviewed; a partner integration does not bypass moderation.
7. **Disclosure** — affiliate relationships will be disclosed to end users when links go live.
8. **No fake partnerships** — this pack is exploratory. Do not publish “official partner of X” until a countersigned agreement exists.

---

## 8. Privacy / security summary (high-level, no secrets)

Drawn from the public Beta Privacy Policy and Store/Learning fail-closed patterns. No env, keys, or infrastructure account details.

- **Account data:** email/password handled by the authentication provider; UMTUBA does not store plaintext passwords.
- **User / seller / learner data:** profiles, User Content, store/seller submissions, enrollments, and support messages as the user chooses to provide them.
- **Usage / security logs:** approximate device, language, diagnostics, abuse-prevention; IP may be used for security and coarse localization — not a claim of continuous GPS tracking.
- **Processors (named in the public policy):** Supabase (auth/db/storage), LiveKit (live media), hosting/CDN. UMTUBA does not describe selling personal information as a Beta business model.
- **Store trust boundary:** client never supplies authoritative prices/totals; checkout RPCs are ownership-scoped; RLS fail-closed on seller drafts and applications.
- **Learning trust boundary:** SECURITY DEFINER RPCs; enrollments and audit logs; no partner PII pipelines exist yet.
- **Children:** not directed at children below the applicable minimum age.
- **Partner data:** if a future official API is used, partner credentials stay in server-side secrets (never in client or git); this pack contains **no** credentials.

---

## 9. Technical integration summary

**Proposed later sequence (not built, not committed):**

1. **Wave A — Affiliate click-out**  
   Curated Store/Learning modules → official tracked URL/code → partner site. Disclosure + `affiliate` ledger event when a program reports a qualifying sale (manual or network postback). No catalog scrape.

2. **Wave B — Official API/feed (only after program approval + entity if required)**  
   Adapter per partner (Associates Creators API, AliExpress Portals, eBay EPN). Cache allowed metadata only; deep-link out. Respect each API’s eligibility (e.g. Amazon Creators API: Associates enrollment + published qualifying-sales gate).

3. **Wave C — Entitlement / wholesale (entity + written grant)**  
   Learning: optional enrollment `source` after partner confirmation. Store: operator-reviewed seller + official supplier/dropship APIs if granted. Never invent endpoints.

**UMTUBA side already useful to partners (descriptive):** HTTPS web app, auth-gated checkout/learning, locale-aware UI, integer minor-unit money, operator moderation, append-only revenue/learning audit patterns.

**Explicitly out of scope for this pack:** mobile/Watch, App Store / Play Production, catalog imports, sending email.

---

## Official program matrix (research 2026-08-18)

### Commerce

| Partner | Official program (first-party) | Relevant models | Entity often required? |
| --- | --- | --- | --- |
| SHEIN | SHEIN Affiliate Program — [roe.shein.com/affiliate-a-427.html](https://roe.shein.com/affiliate-a-427.html); Help: search “Affiliate” on SHEIN. FAQ: registration **currently open to individuals**; enterprise “when available.” | `affiliate` only | Enterprise track PENDING (they said they will notify) |
| Temu | [TEMU Affiliate & Influencer Program](https://www.temu.com/affiliate_influencer_program.html); FAQ [temu.com/affiliate_question.html](https://www.temu.com/affiliate_question.html). Tiers: Affiliate, Influencer, **Affiliate Media Publisher (business registration required)** for website/app B2B. | `affiliate` (community / influencer / media publisher) | Yes for Media Publisher |
| AliExpress | [portals.aliexpress.com](https://portals.aliexpress.com) — Affiliate Program Service Agreement (Alibaba.com Singapore E-Commerce Private Limited et al.). Portals for links + designated APIs. Contact cited: affiliates@service.alibaba.com | `affiliate`, `api-feed` (Portals/Open Platform after approval). Dropship: **verify current first-party status at application** | Often for API/app; tax/ID per their process |
| Alibaba.com | [ads.alibaba.com](https://ads.alibaba.com/) — CPS / CPI / KOL affiliate on the **B2B wholesale** marketplace (not AliExpress retail). Inquiry: ads.alibaba@service.alibaba.com | `affiliate`, `wholesale` (sourcing). Not AliExpress affiliate. | Typical for wholesale buyer + payouts |
| Trendyol | [Trendyol Influencer Affiliate Program](https://influencer.trendyol.com/); [trendyol.com/en/s/trendyol-influencer-program](https://www.trendyol.com/en/s/trendyol-influencer-program) — tracked links/codes; commission from Trendyol net revenue on qualifying sales | `affiliate` (influencer / creator). Not wholesale catalog. | Application review (~1 week per their page) |
| Amazon | [Amazon Associates](https://affiliate-program.amazon.com/); [Creators API](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction) (PA-API 5 deprecated). Participation Requirements + Operating Agreement. | `affiliate`, `api-feed` (Creators API after Associates + their qualifying-sales gate). **Not wholesale / not Alibaba.** | Tax identity (W-9 / W-8 style) on enrollment |
| eBay | [eBay Partner Network](https://partnernetwork.ebay.com) — EPN affiliate; site copy also describes feeds/APIs for technical partners; Ambassador is a separate social-first track (US & UK per regional EPN pages) | `affiliate`, `api-feed` (EPN). Not DHgate wholesale. | Partner account; some promo methods need advance approval |
| DHgate | [aff.dhgate.com](https://aff.dhgate.com/) official in-house affiliate; help: join via DHgate account or aff.dhgate.com; affiliate@dhgate.com. DHgate is also a China wholesale marketplace. | `affiliate`; optional `wholesale` sourcing (marketplace nature, not a published “UMTUBA reseller API”) | Affiliate can be individual; wholesale buying may need business docs — PENDING |

### Learning

| Partner | Official program (first-party) | Relevant models | Entity often required? |
| --- | --- | --- | --- |
| Coursera | [Affiliate Program](https://www.coursera.org/about/affiliates) on **Impact** (courses, Specializations, Professional Certificates, Coursera Plus; degrees/certificate purchases excluded per their FAQ). Separate: [Channel Partner](https://www.coursera.org/enterprise/channel-partner) — Reseller & MSP, Technology & Integration, Strategic Alliance. | `affiliate` (Impact). `reseller` / `revenue_share` / `content_partnership` only via Channel Partner. | Channel Partner: yes. Impact publisher: network account |
| Udemy | [udemy.com/affiliate](https://www.udemy.com/affiliate/) — **Impact only**. Partner support: requirements (live site/social, traffic/follower floors). affiliates@udemy.com / affiliate-team@udemy.com | `affiliate` only. Not course hosting / instructor rights. | Impact publisher; tax IDs per Impact |
| edX | [edx.org/affiliate-program](https://www.edx.org/affiliate-program) via Impact. Commission on **verified certificates and pay-only courses**; Masters/Boot Camps not commissionable. affiliate-inquiries@edx.org | `affiliate` only. Not university content hosting. | Impact publisher |
| DataCamp | [datacamp.com/affiliates](https://www.datacamp.com/affiliates) via Impact; [terms](https://www.datacamp.com/affiliates/terms-and-conditions). Cookie 7–30 days; published subscription commission bands on that page. | `affiliate` (subscriptions). Not course dump / AI rights. | Impact publisher; DataCamp for Business would be a separate entity sale |
| FutureLearn | [affiliates.futurelearn.com](https://affiliates.futurelearn.com/) — official Affiliate Programme (page states powered by Webolytics). Separate: [Become a partner](https://progress.futurelearn.com/become-a-partner) for institutions/brands **creating** courses. | `affiliate` first. `content_partnership` only via institutional partner form — UMTUBA is not a university. | Affiliate review; institutional partner = organization |
| Skillshare | [skillshare.com/en/affiliates](https://www.skillshare.com/en/affiliates) — Impact + free Skillshare account. Official page: 20% up to $34 per **new** paid member; 30-day cookie. skillshare@dmipartners.com | `affiliate` only. Not Coursera channel / not class hosting. | Impact publisher |
| MasterClass | First-party Help: Partnership Program → **partnerships@masterclass.com**. [MasterClass at Work](https://work.masterclass.com/) = enterprise licenses/gifts (entity). Public self-serve `/affiliates` page was **not** confirmed as a live first-party marketing page on 2026-08-18 (third-party directories list Impact; treat Impact as **verify-on-Impact**, lead with partnerships@). | `affiliate` / `content_partnership` via partnerships@. `reseller` exploratory = At Work. Not video hosting. | At Work / many partnership deals: yes |

---

## Wave hint (do not apply in this task)

- **WAVE_A (affiliate click-out, lowest rights risk):** SHEIN, Temu (Affiliate or Media Publisher), AliExpress Portals, Alibaba.com affiliate, Trendyol influencer, Amazon Associates, eBay EPN, DHgate affiliate, Coursera Impact, Udemy, edX, DataCamp, FutureLearn affiliate, Skillshare, MasterClass partnerships@.
- **WAVE_B (official API/feed after approval):** Amazon Creators API, AliExpress Portals API, eBay EPN feeds/APIs.
- **WAVE_C (entity + written grant):** Coursera Channel Partner, Alibaba/DHgate wholesale buying, Temu Media Publisher if not already registered, MasterClass at Work, FutureLearn institutional (only if UMTUBA were offering original courses — currently a mismatch).

---

## Related files

- Outreach drafts (15, **unsent**): `docs/ai/PC2_PARTNERSHIP_OUTREACH_DRAFTS.md`
- This pack: `docs/ai/PC2_PARTNERSHIP_PACK.md`
