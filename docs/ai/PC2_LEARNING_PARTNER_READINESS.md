# PC2 Learning Partner Readiness

```text
DATE = 2026-08-18
DEVICE = PC2
TASK_ID = PC2_A2_LEARNING_PARTNER_READINESS_V1
MODE = RESEARCH ONLY — NO OUTREACH — NO COURSE IMPORT — NO CONTENT COPY
RETRIEVAL_DATE = 2026-08-18
LEGAL_COMPANY_* = PENDING (do not invent)
```

Hard rules used: first-party official pages only. Affiliate ≠ copy videos, host materials, feed AI Tutor, or issue partner certificates. `AI_USAGE_RIGHTS = NO_UNLESS_EXPLICITLY_PROVEN`. UNKNOWN ≠ NO. Never invent commissions, APIs, reseller/AI/hosting rights.

**Affiliate is not:** catalog dump, LMS hosting, reseller seat sales, certificate issuance, or AI-tutor access to partner content.

---

## 1. Hard defaults (all seven)

| Right | Default | Override only if |
| --- | --- | --- |
| `AI_USAGE_RIGHTS` | `NO_UNLESS_EXPLICITLY_PROVEN` | Written first-party grant to UMTUBA |
| `HOST_CONTENT` | NO unless written grant | Content-hosting license on UMTUBA |
| `ISSUE_CERTIFICATE` | NO unless written grant | Partner authorizes UMTUBA-issued credential |
| `SELL_ENROLLMENT` | NO unless reseller/B2B grant | First-party reseller / channel program + entity |
| `LINK_TO_EXTERNAL_COURSE` | YES if affiliate/publisher program exists | Tracked outbound only |
| `DISPLAY_METADATA` | YES only for assets the program supplies (titles, banners, merchandiser fields) | Not a scrape of their catalog |
| `AI_TUTOR_ACCESS_TO_PARTNER_CONTENT` | NO | Explicit AI addendum |

`CERTIFICATE_INTEGRATION` on a partner LMS (enterprise customer completion sync) is **not** UMTUBA issuing that partner’s certificate.

---

## 2. Wave classification (UMTUBA recommended)

| Wave | Meaning | Companies / programs |
| --- | --- | --- |
| **WAVE_A** | Public affiliate/publisher apply; pre-company possible; click-out only | Coursera Affiliate (Impact); Udemy Affiliate (Impact); edX Affiliate (Impact); DataCamp Affiliate (Impact); Skillshare Affiliate (Impact) |
| **WAVE_B** | Public B2B/channel/reseller or company-oriented partner form; entity expected; still no hosting/AI | Coursera Channel Partner; Udemy Business Reseller + Technology Partnership; edX Reseller / Loyalty; DataCamp Partner Program; FutureLearn Affiliate Programme (company-oriented form) |
| **WAVE_C** | Wrong-direction content-on-their-platform, email-only partnership, or unproven AI/host/cert rights | Coursera University / Industry content partnerships; edX Content Partnership; FutureLearn Become a Partner (publish ON FutureLearn); MasterClass Partnership Program + At Work (buy-side / email); any AI Tutor / host / issue-certificate ask |

Do not apply, email, or import in this task.

---

## 3. Per-company matrix

Legend for capability cells: `YES` / `NO` / `NOT_PUBLICLY_DOCUMENTED`.  
`STATUS` = `PUBLICLY DOCUMENTED` or `REQUIRES_DIRECT_CONFIRMATION`.

### 3.1 Coursera

| Field | Value | Status | Source (retrieved 2026-08-18) |
| --- | --- | --- | --- |
| Exact program names | **Affiliate Program** (Impact); **Channel Partner Program** (Reseller & Managed Service Providers; Technology & Integration Partners; Strategic Alliance Partners); **University Partnerships**; **Industry Partnerships**; **Coursera for Business** LMS/API integrations | PUBLICLY DOCUMENTED | [affiliates](https://www.coursera.org/about/affiliates); [channel-partner](https://www.coursera.org/enterprise/channel-partner); [partnerships](https://www.coursera.org/partnerships); [business/integrations](https://www.coursera.org/business/integrations) |
| AFFILIATE | YES — Impact; banners/text links; 30-day cookie; commissions on courses, Specializations, professional certificates, Coursera Plus. Degrees and “Certificate purchases” excluded per FAQ footnote | PUBLICLY DOCUMENTED | affiliates page |
| CATALOG/API | NO public open catalog API. Affiliates: Impact “product merchandiser field, updated daily.” Enterprise/Tech Partner: “Coursera APIs” / skills API / LMS listing for **customers or approved tech partners** — not a public developer catalog | PUBLICLY DOCUMENTED (gated) | affiliates; business/integrations. `building.coursera.org` is an old engineering blog, not current Catalog API docs |
| PRODUCT/COURSE_FEED | YES for approved Impact affiliates (merchandiser field + creatives). Broader course dump: NOT_PUBLICLY_DOCUMENTED | PUBLICLY DOCUMENTED / REQUIRES_DIRECT_CONFIRMATION | affiliates |
| B2B | YES — Coursera for Business / Enterprise (buyer). Channel Partner sells into business/campus/government | PUBLICLY DOCUMENTED | partnerships; channel-partner; business |
| RESELLER | YES as Channel Partner track “Reseller & Managed Service Providers” | PUBLICLY DOCUMENTED | channel-partner |
| CONTENT_PARTNERSHIP | YES — University / Industry partners **put content ON Coursera** (wrong direction for UMTUBA discovery) | PUBLICLY DOCUMENTED | partnerships; [industry get-started](https://www.coursera.org/partnerships/industry/get-started) |
| REVENUE_SHARE | Channel Partner copy: “Unlock new revenue streams”; exact split NOT_PUBLICLY_DOCUMENTED | REQUIRES_DIRECT_CONFIRMATION | channel-partner |
| CERTIFICATE_INTEGRATION | Learners earn Coursera / partner certificates **on Coursera**. LMS integrations can surface courses/certificates/progress for **enterprise customers**. UMTUBA issuing Coursera certificates: NO | PUBLICLY DOCUMENTED | ToU; business/integrations |
| CONTENT_HOSTING_RIGHTS | NO for affiliates. Content Offerings remain Coursera/Content Provider IP | PUBLICLY DOCUMENTED | [Terms of Use](https://www.coursera.org/about/terms) |
| AI_USAGE_RIGHTS | **NO** — ToU prohibits using any content/data/text for text/data mining or to develop/train generative AI or other ML models, commercial or not | PUBLICLY DOCUMENTED | ToU Acceptable Use |
| APPLICATION_CHANNEL | Impact (affiliate); web inquiry forms (Channel / Industry) | PUBLICLY DOCUMENTED | affiliates; channel-partner; industry/get-started |
| OFFICIAL_CONTACT | No public affiliate email on affiliates page. IP: copyright@coursera.org | PUBLICLY DOCUMENTED | ToU |
| APPLICATION_URL | https://www.coursera.org/about/affiliates (then Impact). Channel: https://www.coursera.org/enterprise/channel-partner. Industry form: https://www.coursera.org/partnerships/industry/get-started. Exact Impact campaign URL not published on Coursera page | PUBLICLY DOCUMENTED | same |
| COMPANY_REQUIRED | Affiliate: not stated (free join). Channel / University / Industry: organization implied | PUBLICLY DOCUMENTED / REQUIRES_DIRECT_CONFIRMATION | affiliates; channel-partner |
| REQUIREMENTS | Affiliate: Impact publisher account; brand-safe promotion via their links. Channel: commercial/tech capability — details behind form | PUBLICLY DOCUMENTED / REQUIRES_DIRECT_CONFIRMATION | affiliates; channel-partner |
| Published commission (affiliate only) | Baseline **15%–45%** on eligible purchases within 30 days; last-click; degrees/certificate purchases excluded | PUBLICLY DOCUMENTED | affiliates (*footnote on page) |
| UMTUBA_RECOMMENDED_ENTRY_MODEL | **Affiliate (Impact) click-out.** Channel Partner only after LEGAL_* | — | — |

**Capability split**

| LINK_TO_EXTERNAL_COURSE | DISPLAY_METADATA | HOST_CONTENT | SELL_ENROLLMENT | ISSUE_CERTIFICATE | AI_TUTOR_ACCESS_TO_PARTNER_CONTENT |
| --- | --- | --- | --- | --- | --- |
| YES (affiliate) | YES (supplied creatives / merchandiser) | NO | NO unless Channel Reseller grant | NO | NO |

**Can apply pre-company:** YES for Affiliate. NO for Channel / University / Industry.

---

### 3.2 Udemy

| Field | Value | Status | Source (retrieved 2026-08-18) |
| --- | --- | --- | --- |
| Exact program names | **Udemy Affiliate Program** (Impact Network); **Udemy Business Reseller Partner Program**; **Referral Partnership**; **Technology Partnership**; **Affiliate Partnership** (Business hub) | PUBLICLY DOCUMENTED | [udemy.com/affiliate](https://www.udemy.com/affiliate/); [partner-with-udemy](https://business.udemy.com/partner-with-udemy/); [reseller](https://business.udemy.com/partner-with-udemy/reseller/); [partnersupport apply](https://partnersupport.udemy.com/hc/en-us/articles/13819713397783-How-do-I-Apply-to-Join-the-Udemy-Business-Reseller-Partner-Program) |
| AFFILIATE | YES — Impact only; course/sitewide/custom deep links; creatives; 3–4 business day review | PUBLICLY DOCUMENTED | affiliate page; [How to Get Started with Impact](https://partnersupport.udemy.com/hc/en-us/articles/360049413233-How-to-Get-Started-with-Impact) |
| CATALOG/API | **Affiliate API discontinued for new access since 2025-01-01.** Page: join Affiliate Program instead. Terms hub lists **Udemy API Agreement** (separate, not a public catalog grant) | PUBLICLY DOCUMENTED | [developers/affiliate](https://www.udemy.com/developers/affiliate/); [terms hub](https://www.udemy.com/terms/) |
| PRODUCT/COURSE_FEED | Affiliate: Impact product marketplace / tracking assets. New Affiliate API clients: NO | PUBLICLY DOCUMENTED | developers/affiliate; Impact article |
| B2B | YES — Udemy Business (buyer) + partner hub (Referral / Technology / Affiliate / Reseller) | PUBLICLY DOCUMENTED | partner-with-udemy |
| RESELLER | YES — Udemy Business Reseller Partner Program (Partner Portal; Global Reseller Agreement) | PUBLICLY DOCUMENTED | reseller page; partnersupport apply article |
| CONTENT_PARTNERSHIP | Instructor/content-on-Udemy is not a third-party host program. Technology Partnership = integrate with Udemy Business — details REQUIRES_DIRECT_CONFIRMATION | REQUIRES_DIRECT_CONFIRMATION | partner-with-udemy |
| REVENUE_SHARE | Affiliate: “competitive commission rates” — **exact % NOT_PUBLICLY_DOCUMENTED**. Reseller economics behind agreement | REQUIRES_DIRECT_CONFIRMATION | affiliate page; reseller |
| CERTIFICATE_INTEGRATION | NO public grant for UMTUBA to issue Udemy certificates | NOT_PUBLICLY_DOCUMENTED as a partner right (treat as NO grant) | — |
| CONTENT_HOSTING_RIGHTS | NO. Official help: may publish course **description and curriculum**; **preview videos are instructor copyright — do not re-upload** to site/social | PUBLICLY DOCUMENTED | How to Get Started with Impact |
| AI_USAGE_RIGHTS | **NO_UNLESS_EXPLICITLY_PROVEN.** Terms hub lists Instructor Generative AI Policy, Responsible AI Principles, AI Connector Terms (instructor/Udemy-side). No public license for third parties to feed courses to an AI tutor. Full ToU body fetch timed out this session | REQUIRES_DIRECT_CONFIRMATION (default NO) | terms hub |
| APPLICATION_CHANNEL | Impact (affiliate); Application Form + Global Reseller Agreement (reseller) | PUBLICLY DOCUMENTED | affiliate; partnersupport apply |
| OFFICIAL_CONTACT | affiliates@udemy.com (general/technical); affiliate-team@udemy.com (commission discussion) | PUBLICLY DOCUMENTED | How to Get Started with Impact |
| APPLICATION_URL | https://www.udemy.com/affiliate/ (Sign up → Impact). Reseller: https://business.udemy.com/partner-with-udemy/reseller/ + Application Form linked from partnersupport | PUBLICLY DOCUMENTED | same |
| COMPANY_REQUIRED | Affiliate: NO (website, blog, or social with traffic). Reseller: **YES** — “Established company with quality web presence” | PUBLICLY DOCUMENTED | [Who can Participate](https://partnersupport.udemy.com/hc/en-us/articles/360049411933-Who-can-Participate-in-the-Udemy-Affiliate-Program); [Requirements](https://partnersupport.udemy.com/hc/en-us/articles/360049411833-What-are-the-Requirements-to-Join-the-Udemy-Affiliate-Program); reseller page |
| REQUIREMENTS | Affiliate: live site/page; consistent traffic; not Udemy-only sites; not paid-ad-only affiliates; agree Impact + Affiliate Operating Agreement. Reseller (published): registered/approved; accept Global Reseller Agreement; established company; published partner-sourced ARR band **$750k–$1.5M Net New ARR** on official reseller page excerpt | PUBLICLY DOCUMENTED | requirements articles; reseller page |
| UMTUBA_RECOMMENDED_ENTRY_MODEL | **Affiliate (Impact) click-out.** Reseller/Technology only after company + they meet published reseller bar | — | — |

**Capability split**

| LINK_TO_EXTERNAL_COURSE | DISPLAY_METADATA | HOST_CONTENT | SELL_ENROLLMENT | ISSUE_CERTIFICATE | AI_TUTOR_ACCESS_TO_PARTNER_CONTENT |
| --- | --- | --- | --- | --- | --- |
| YES (affiliate) | YES (descriptions/curriculum + official creatives; not preview video files) | NO | NO unless Reseller grant | NO | NO |

**Can apply pre-company:** YES for Affiliate (if live channel). NO for Reseller / Technology.

---

### 3.3 edX

| Field | Value | Status | Source (retrieved 2026-08-18) |
| --- | --- | --- | --- |
| Exact program names | **edX Affiliate Program** (Impact); **Reseller Partnership** (Loyalty Partner; Strategic Reseller); **Content Partnership**; **edX for Business / Enterprise** (buyer + Enterprise API) | PUBLICLY DOCUMENTED | [affiliate-program](https://www.edx.org/affiliate-program); [schools-partners](https://www.edx.org/schools-partners); [business.edx.org/partner](https://business.edx.org/partner/); [reseller overview](https://business.edx.org/partner/type-overview/); [Enterprise product terms](https://business.edx.org/product-descriptions-and-terms/) |
| AFFILIATE | YES — Impact; links/banners; 60-day cookie; commission on **verified certificates and pay-only courses**. Masters and Boot Camps **not** allowed (no commission; apply-to-university) | PUBLICLY DOCUMENTED | affiliate-program |
| CATALOG/API | **edX Enterprise API** / Enterprise Integration Toolkit: curated catalog + metadata for **enterprise customers** (server-to-server; cache daily). Not an affiliate catalog API. Course Catalog API (if still offered) is informational and **not for affiliate marketing** per older guide — treat current public-affiliate API as **not granted** | PUBLICLY DOCUMENTED (enterprise-gated) | [Displaying a catalog](https://business-support.edx.org/hc/en-us/articles/360005360954-4-Displaying-a-catalog-of-edX-courses); product-descriptions-and-terms |
| PRODUCT/COURSE_FEED | Affiliate: Impact tracked assets. Enterprise: customer-specific catalog API | PUBLICLY DOCUMENTED | affiliate-program; Enterprise API articles |
| B2B | YES — edX for Business / Enterprise Plan (buyer). Loyalty/Strategic Reseller (partner) | PUBLICLY DOCUMENTED | business.edx.org; type-overview |
| RESELLER | YES — Loyalty Partner (redemption codes / promotions as value-add); Strategic Reseller (enterprise sales infrastructure / VAS) | PUBLICLY DOCUMENTED | type-overview |
| CONTENT_PARTNERSHIP | YES — offer **your** content ON edX (wrong direction). Schools: visit business.edx.org/partner | PUBLICLY DOCUMENTED | schools-partners; [content](https://business.edx.org/partner/content/) |
| REVENUE_SHARE | Affiliate published start rates (below). Reseller splits NOT_PUBLICLY_DOCUMENTED | PUBLICLY DOCUMENTED / REQUIRES_DIRECT_CONFIRMATION | affiliate-program; type-overview |
| CERTIFICATE_INTEGRATION | Certificates awarded by edX/Members on edX. Enterprise toolkit may include completion data to **customer** admin systems. UMTUBA issuing edX certificates: NO | PUBLICLY DOCUMENTED | [Terms of Service](https://www.edx.org/edx-terms-service); product-descriptions-and-terms |
| CONTENT_HOSTING_RIGHTS | NO. Personal, non-commercial license; no reproduce/distribute/derivative of Service | PUBLICLY DOCUMENTED | edx-terms-service |
| AI_USAGE_RIGHTS | **NO_UNLESS_EXPLICITLY_PROVEN.** ToS: no bots/spiders/crawlers/data-mining tools other than edX-provided agents. No AI-training grant | PUBLICLY DOCUMENTED (scrape ban); AI tutor grant absent | edx-terms-service |
| APPLICATION_CHANNEL | Impact (affiliate); partner portal forms (reseller/content) | PUBLICLY DOCUMENTED | affiliate-program; business.edx.org/partner |
| OFFICIAL_CONTACT | affiliate-inquiries@edx.org | PUBLICLY DOCUMENTED | affiliate-program |
| APPLICATION_URL | https://www.edx.org/affiliate-program ; partner: https://business.edx.org/partner/ | PUBLICLY DOCUMENTED | same |
| COMPANY_REQUIRED | Affiliate: not stated (free; 2–3 day review). Reseller/Content: organization | PUBLICLY DOCUMENTED | affiliate-program; type-overview |
| REQUIREMENTS | Affiliate: Impact account; promote commissionable catalog only. Strategic Reseller: established services / SaaS resellers with enterprise sales infrastructure (ideal-for list, not a published legal test) | PUBLICLY DOCUMENTED | affiliate-program; type-overview |
| Published commission (affiliate only) | Starting **5%** voucher/coupon/discount sites; **10%** all other affiliates | PUBLICLY DOCUMENTED | affiliate-program |
| UMTUBA_RECOMMENDED_ENTRY_MODEL | **Affiliate (Impact) click-out.** Loyalty/Strategic Reseller after LEGAL_* | — | — |

**Capability split**

| LINK_TO_EXTERNAL_COURSE | DISPLAY_METADATA | HOST_CONTENT | SELL_ENROLLMENT | ISSUE_CERTIFICATE | AI_TUTOR_ACCESS_TO_PARTNER_CONTENT |
| --- | --- | --- | --- | --- | --- |
| YES (affiliate) | YES (official assets; enterprise API only if customer) | NO | NO unless Reseller grant | NO | NO |

**Can apply pre-company:** YES for Affiliate. NO for Reseller / Content.

---

### 3.4 DataCamp

| Field | Value | Status | Source (retrieved 2026-08-18) |
| --- | --- | --- | --- |
| Exact program names | **DataCamp Affiliate Program** (Impact); **DataCamp Partner Program** (consulting / implementation partners); **DataCamp for Business** LMS/SSO/Enterprise integrations (buyer) | PUBLICLY DOCUMENTED | [affiliates](https://www.datacamp.com/affiliates); [affiliate T&Cs](https://www.datacamp.com/affiliates/terms-and-conditions); [partner-program](https://www.datacamp.com/business/partner-program); [integration](https://www.datacamp.com/business/integration) |
| AFFILIATE | YES — Impact; cookie up to 30 days (7–30 by category); creatives; ~72h review; Individual Plan conversions only | PUBLICLY DOCUMENTED | affiliates; affiliate T&Cs |
| CATALOG/API | **DataCamp integration API** / SFTP / xAPI for **Enterprise subscribers** (LMS catalog + completions). Not a public affiliate API. Support: interactive content “cannot package and share” due to interactive nature | PUBLICLY DOCUMENTED (enterprise-gated) | integration page; [LMS/LXP Overview](https://support.datacamp.com/hc/en-us/articles/360034285254-LMS-LXP-Integration-Overview) |
| PRODUCT/COURSE_FEED | Affiliate: Impact links + banner creatives. LMS catalog sync: Enterprise customer only | PUBLICLY DOCUMENTED | affiliates T&Cs; LMS overview |
| B2B | YES — DataCamp for Business (buyer). Partner Program complements consulting GTM | PUBLICLY DOCUMENTED | partner-program; business |
| RESELLER | Partner Program: “top-of-market commercial terms” / grow partner revenue — **not labeled “reseller”**; exact model REQUIRES_DIRECT_CONFIRMATION | REQUIRES_DIRECT_CONFIRMATION | partner-program |
| CONTENT_PARTNERSHIP | Featured partners include consultancies and Degreed (LXP). Not a “host DataCamp on UMTUBA” grant | REQUIRES_DIRECT_CONFIRMATION | partner-program |
| REVENUE_SHARE | Affiliate commissions published (note marketing vs legal band). Partner commercial terms unpublished | PUBLICLY DOCUMENTED / REQUIRES_DIRECT_CONFIRMATION | affiliates vs T&Cs |
| CERTIFICATE_INTEGRATION | LMS can sync certification completions for **Enterprise customers**. UMTUBA issuing DataCamp certs: NO | PUBLICLY DOCUMENTED (customer sync) | LMS overview (SFTP content types include certifications) |
| CONTENT_HOSTING_RIGHTS | NO. ToU: no license/sell/host/commercially exploit Service or displayed content; no copy except as enabled | PUBLICLY DOCUMENTED | [Terms of Use](https://www.datacamp.com/terms-of-use) |
| AI_USAGE_RIGHTS | **NO.** DataCamp’s **AI Tutor** is their product for subscribers. ToU grants no third-party right to use courses as tutor corpus. Affiliate license = links + permitted logos only | PUBLICLY DOCUMENTED | ToU §§2, 5, 11; affiliate T&Cs §5 |
| APPLICATION_CHANNEL | Impact signup; Partner “Become a Partner” on partner-program page | PUBLICLY DOCUMENTED | affiliates; partner-program |
| OFFICIAL_CONTACT | Affiliates page lists a contact (Cloudflare-obfuscated in fetch). Use page form / Impact | PUBLICLY DOCUMENTED (email string not reliably extracted) | affiliates |
| APPLICATION_URL | https://www.datacamp.com/affiliates → https://app.impact.com/campaign-promo-signup/DataCamp.brand ; Partner: https://www.datacamp.com/business/partner-program | PUBLICLY DOCUMENTED | affiliates |
| COMPANY_REQUIRED | Affiliate: not stated. Partner Program: designed for consulting companies | PUBLICLY DOCUMENTED | affiliates; partner-program |
| REQUIREMENTS | Affiliate: Impact application; one account; no self-referral; no brand-term PPC; no cookie stuffing; comply ToU. Partner: data/AI consulting GTM fit | PUBLICLY DOCUMENTED | affiliate T&Cs |
| Published commission (affiliate only) | Marketing page: **15–20%** of yearly subscriptions; **50–80%** of first month monthly. Legal T&Cs: **7.5–25%** first year yearly Individual Plan; **15–80%** first month monthly. **Cite legal T&Cs as controlling; do not invent a single rate** | PUBLICLY DOCUMENTED (bands conflict — use T&Cs) | affiliates vs affiliates/terms-and-conditions |
| UMTUBA_RECOMMENDED_ENTRY_MODEL | **Affiliate (Impact) click-out.** Partner Program after company if consulting/B2B GTM exists | — | — |

**Capability split**

| LINK_TO_EXTERNAL_COURSE | DISPLAY_METADATA | HOST_CONTENT | SELL_ENROLLMENT | ISSUE_CERTIFICATE | AI_TUTOR_ACCESS_TO_PARTNER_CONTENT |
| --- | --- | --- | --- | --- | --- |
| YES (affiliate) | YES (official creatives) | NO | NO unless Partner grant | NO | NO |

**Can apply pre-company:** YES for Affiliate. NO for Partner Program.

---

### 3.5 FutureLearn

| Field | Value | Status | Source (retrieved 2026-08-18) |
| --- | --- | --- | --- |
| Exact program names | **FutureLearn Affiliate Programme** (powered by Webolytics / Webosaurus); **Become a FutureLearn partner** (universities/brands **create courses on** FutureLearn); **FLx** (B2B learning platform) | PUBLICLY DOCUMENTED | [affiliates.futurelearn.com](https://affiliates.futurelearn.com/); [become-a-partner](https://progress.futurelearn.com/become-a-partner); [for-business](https://progress.futurelearn.com/for-business) |
| AFFILIATE | YES — apply via official affiliate site; custom tracking link + discount codes after eligibility review | PUBLICLY DOCUMENTED | affiliates.futurelearn.com |
| CATALOG/API | NO public catalog API found. FLx is FutureLearn’s B2B product (buyer), not a third-party course API | NOT_PUBLICLY_DOCUMENTED as partner API (treat as no public API) | become-a-partner; for-business |
| PRODUCT/COURSE_FEED | Affiliate: tracking links / dashboard. No public product feed | NOT_PUBLICLY_DOCUMENTED | affiliates.futurelearn.com |
| B2B | YES — FLx for organizations (buyer). Industry/government/charity **content** partners | PUBLICLY DOCUMENTED | for-business; become-a-partner |
| RESELLER | NOT_PUBLICLY_DOCUMENTED | — | — |
| CONTENT_PARTNERSHIP | YES — institutions/brands publish ON FutureLearn (wrong direction for UMTUBA) | PUBLICLY DOCUMENTED | become-a-partner |
| REVENUE_SHARE | Affiliate: “commission structures based on their revenue impact” — **exact % NOT_PUBLICLY_DOCUMENTED** | REQUIRES_DIRECT_CONFIRMATION | affiliates.futurelearn.com |
| CERTIFICATE_INTEGRATION | Certificates/credit are Partner Institution responsibility. UMTUBA issuing FutureLearn certs: NO | PUBLICLY DOCUMENTED | [Terms](https://www.futurelearn.com/info/terms) |
| CONTENT_HOSTING_RIGHTS | NO. No scrape; no copy/reproduce/distribute Online Content and Courses without prior written consent. Copyright generally Partner Institution | PUBLICLY DOCUMENTED | Terms §§2.2.12, 5, 12 |
| AI_USAGE_RIGHTS | **NO_UNLESS_EXPLICITLY_PROVEN.** Scrape/copy bans; no AI-training grant | PUBLICLY DOCUMENTED (scrape/copy ban) | Terms |
| APPLICATION_CHANNEL | Affiliate web form (company + marketing expertise). Partner: “Fill out the form to get in touch” | PUBLICLY DOCUMENTED | affiliates; become-a-partner |
| OFFICIAL_CONTACT | Affiliate form on affiliates.futurelearn.com. Support@futurelearn.com (learner/support). copyright-infringement@futurelearn.com | PUBLICLY DOCUMENTED | affiliates; Terms |
| APPLICATION_URL | https://affiliates.futurelearn.com/ ; partner: https://progress.futurelearn.com/become-a-partner | PUBLICLY DOCUMENTED | same |
| COMPANY_REQUIRED | Affiliate form asks “Tell us about your company” — company **oriented**, not an explicit legal-entity rule | REQUIRES_DIRECT_CONFIRMATION | affiliates.futurelearn.com |
| REQUIREMENTS | Eligibility review by partnership team; Affiliate Terms (Webosaurus) + FutureLearn Privacy Policy consent | PUBLICLY DOCUMENTED | affiliates.futurelearn.com |
| UMTUBA_RECOMMENDED_ENTRY_MODEL | **Affiliate Programme click-out** (if accepted). Do **not** apply as a university content partner | — | — |

**Capability split**

| LINK_TO_EXTERNAL_COURSE | DISPLAY_METADATA | HOST_CONTENT | SELL_ENROLLMENT | ISSUE_CERTIFICATE | AI_TUTOR_ACCESS_TO_PARTNER_CONTENT |
| --- | --- | --- | --- | --- | --- |
| YES (if affiliate approved) | NOT_PUBLICLY_DOCUMENTED beyond tracking links | NO | NO | NO | NO |

**Can apply pre-company:** UNCLEAR — form is company-oriented. Treat as **not a clean pre-company apply**. WAVE_B.

---

### 3.6 Skillshare

| Field | Value | Status | Source (retrieved 2026-08-18) |
| --- | --- | --- | --- |
| Exact program names | **Skillshare Affiliate Program** (Impact); **Skillshare for Teams** (buyer B2B); teacher referral (teachers only); partnerships inbox | PUBLICLY DOCUMENTED | [affiliates](https://www.skillshare.com/en/affiliates); [for-teams](https://www.skillshare.com/en/for-teams/pricing); [contact](https://help.skillshare.com/hc/en-us/articles/205312177-How-can-I-get-in-touch-with-Skillshare) |
| AFFILIATE | YES — Impact + free Skillshare account; unique tracking link for any Skillshare URL; 30-day cookie; new paid members | PUBLICLY DOCUMENTED | affiliates |
| CATALOG/API | ToS mentions Skillshare APIs as **their** property. No public partner catalog API | NOT_PUBLICLY_DOCUMENTED as partner API | [Terms of Service](https://legal.skillshare.com/hc/en-us/articles/27194932901645-Skillshare-Terms-of-Service) |
| PRODUCT/COURSE_FEED | Affiliate: “access our entire catalog” = promote via tracking link, not a data feed | PUBLICLY DOCUMENTED (link, not API) | affiliates |
| B2B | YES — Skillshare for Teams (annual seats; buyer). Not a reseller program on that page | PUBLICLY DOCUMENTED | for-teams; Help Teams vs Individual |
| RESELLER | NOT_PUBLICLY_DOCUMENTED | — | — |
| CONTENT_PARTNERSHIP | Skillshare may license **teacher** content to streaming/AI partners (teacher opt-out). That is Skillshare outbound licensing, **not** a grant to UMTUBA | PUBLICLY DOCUMENTED (wrong-party grant) | [Partnership Revenue](https://help.skillshare.com/hc/en-us/articles/37027989370125-Understanding-Partnership-Revenue); [AI Principles](https://help.skillshare.com/hc/en-us/articles/34215508464141-Skillshare-s-AI-Principles-Supporting-Our-Creative-Community) |
| REVENUE_SHARE | Affiliate: **20% of revenue, up to $34**, per new paid membership | PUBLICLY DOCUMENTED | affiliates |
| CERTIFICATE_INTEGRATION | NO public partner-certificate program | NOT_PUBLICLY_DOCUMENTED (no grant) | — |
| CONTENT_HOSTING_RIGHTS | NO. Personal, noncommercial, educational license; no copy of class content except items Skillshare marks downloadable | PUBLICLY DOCUMENTED | ToS §IV |
| AI_USAGE_RIGHTS | **NO.** ToS bans robots/scraping. Skillshare AI partnerships are **their** deals with teachers (opt-out). No license for UMTUBA AI Tutor | PUBLICLY DOCUMENTED | ToS; AI Principles |
| APPLICATION_CHANNEL | Impact + Skillshare account | PUBLICLY DOCUMENTED | affiliates |
| OFFICIAL_CONTACT | skillshare@dmipartners.com (affiliate). partners@skillshare.com (org partnerships). teamhelp@skillshare.com (Teams) | PUBLICLY DOCUMENTED | affiliates; contact Help |
| APPLICATION_URL | https://www.skillshare.com/en/affiliates | PUBLICLY DOCUMENTED | affiliates |
| COMPANY_REQUIRED | NO — “anybody” with ≥1 aligned channel (blog/social/newsletter) | PUBLICLY DOCUMENTED | affiliates |
| REQUIREMENTS | Free Impact + free Skillshare account; demonstrated brand-aligned audience | PUBLICLY DOCUMENTED | affiliates |
| UMTUBA_RECOMMENDED_ENTRY_MODEL | **Affiliate (Impact) click-out.** Teams = buy-side only. partners@ only after LEGAL_* | — | — |

**Capability split**

| LINK_TO_EXTERNAL_COURSE | DISPLAY_METADATA | HOST_CONTENT | SELL_ENROLLMENT | ISSUE_CERTIFICATE | AI_TUTOR_ACCESS_TO_PARTNER_CONTENT |
| --- | --- | --- | --- | --- | --- |
| YES (affiliate) | YES (promote classes via official links; no scrape) | NO | NO | NO | NO |

**Can apply pre-company:** YES (need a live channel + Skillshare account).

---

### 3.7 MasterClass

| Field | Value | Status | Source (retrieved 2026-08-18) |
| --- | --- | --- | --- |
| Exact program names | **Partnership Program** (email); **MasterClass at Work** (enterprise licenses / gifts — **buyer**); consumer membership + optional Certificates of completion | PUBLICLY DOCUMENTED | [Promotions and Partnerships](https://www.masterclass.com/help-center/masterclass/answers/promotions-and-partnerships--id--tjQHxt1oSP6lzJmrVx9m5w); [Contacting Support](https://www.masterclass.com/help-center/masterclass/answers/contacting-master-class-support--id--6sH8j_CwT9iEZ_BJq_p6Sg); [How It Works / At Work](https://www.masterclass.com/for-business/how-it-works); [Terms](https://www.masterclass.com/terms) |
| AFFILIATE | **NOT_PUBLICLY_DOCUMENTED** on first-party marketing pages (no live `/affiliates` program page confirmed 2026-08-18). Third-party directories ignored | NOT_PUBLICLY_DOCUMENTED | first-party Help + site search |
| CATALOG/API | NO public catalog API found | NOT_PUBLICLY_DOCUMENTED | — |
| PRODUCT/COURSE_FEED | NO | NOT_PUBLICLY_DOCUMENTED | — |
| B2B | YES — MasterClass at Work (admin panel, SSO at seat threshold, analytics). This is **purchase**, not a published reseller API | PUBLICLY DOCUMENTED | for-business/how-it-works; At Work FAQ |
| RESELLER | NOT_PUBLICLY_DOCUMENTED | — | — |
| CONTENT_PARTNERSHIP | Help: partners with select orgs for special memberships/benefits. “Participate in our Partnership Program” → email | PUBLICLY DOCUMENTED (existence); terms REQUIRES_DIRECT_CONFIRMATION | Promotions and Partnerships; Contacting Support |
| REVENUE_SHARE | NOT_PUBLICLY_DOCUMENTED | — | — |
| CERTIFICATE_INTEGRATION | MasterClass may issue **their** completion Certificates to purchasers. Non-transferable; not academic credit. UMTUBA issuing MasterClass certificates: NO | PUBLICLY DOCUMENTED | Terms §2.8 |
| CONTENT_HOSTING_RIGHTS | NO. Streaming-only personal non-commercial license; no commercial copy/resell | PUBLICLY DOCUMENTED | Terms |
| AI_USAGE_RIGHTS | **NO** unless express prior written consent. ToS forbids access/scrape/copy/download of Service Content to develop, train, evaluate, or improve ML/LLM/generative AI | PUBLICLY DOCUMENTED | Terms (Service Content / AI clause) |
| APPLICATION_CHANNEL | Email Partnership Program; At Work order/sales forms | PUBLICLY DOCUMENTED | Contacting Support |
| OFFICIAL_CONTACT | partnerships@masterclass.com ; support@masterclass.com ; press@masterclass.com | PUBLICLY DOCUMENTED | Contacting Support (consumer + At Work Help) |
| APPLICATION_URL | No public affiliate apply URL. Partnership: email. At Work: https://www.masterclass.com/for-business/how-it-works and work.masterclass.com get-in-touch | PUBLICLY DOCUMENTED | same |
| COMPANY_REQUIRED | At Work / most partnership deals: organization implied. Affiliate self-serve: not published | REQUIRES_DIRECT_CONFIRMATION | — |
| REQUIREMENTS | Not published for Partnership Program | REQUIRES_DIRECT_CONFIRMATION | — |
| UMTUBA_RECOMMENDED_ENTRY_MODEL | **Do not apply pre-company.** After LEGAL_*: exploratory email to partnerships@ only. Do not claim affiliate, catalog, hosting, or AI rights. At Work is buy-side | — | — |

**Capability split**

| LINK_TO_EXTERNAL_COURSE | DISPLAY_METADATA | HOST_CONTENT | SELL_ENROLLMENT | ISSUE_CERTIFICATE | AI_TUTOR_ACCESS_TO_PARTNER_CONTENT |
| --- | --- | --- | --- | --- | --- |
| NOT_PUBLICLY_DOCUMENTED (no confirmed affiliate) | NO grant | NO | NO | NO | NO |

**Can apply pre-company:** NO public affiliate path. Email partnership is entity-appropriate only.

---

## 4. Cross-cut (do not blur)

| Ask | WAVE_A affiliate | WAVE_B channel/reseller | WAVE_C |
| --- | --- | --- | --- |
| Deep-link to their checkout / Plus / membership | In scope after approval | In scope if program says so | N/A |
| Show their supplied title/banner/price field | In scope | Maybe (enterprise feed) | Do not scrape |
| Host videos / worksheets / assessments on Learning OS | Out | Out unless written | Out |
| Sell their seats as UMTUBA SKU | Out | Only after reseller grant + company | Out |
| Issue “UMTUBA × Partner” certificate | Out | Out | Out |
| Feed lessons into AI Tutor | Out | Out | Out |

Coursera University/Industry, edX Content Partnership, and FutureLearn Become a Partner mean **UMTUBA would publish original courses on their platform**. That is not the Learning OS discovery entry model.

---

## 5. Blockers

```text
LEGAL_COMPANY_* = PENDING
NO_OUTREACH_THIS_TASK = YES
NO_COURSE_IMPORT = YES
NO_AI_TUTOR_CORPUS = YES
UDEMY_AFFILIATE_API_NEW_ACCESS = DISCONTINUED_2025-01-01
MASTERCLASS_PUBLIC_AFFILIATE = NOT_PUBLICLY_DOCUMENTED
FUTURELEARN_AFFILIATE_COMPANY_GATE = UNCLEAR
CHANNEL_RESELLER_PROGRAMS = ENTITY_GATED
```

No email sent. No courses imported. No content copied.

---

## 6. First-party source index (all retrieved 2026-08-18)

**Coursera:** https://www.coursera.org/about/affiliates · https://www.coursera.org/partnerships · https://www.coursera.org/enterprise/channel-partner · https://www.coursera.org/partnerships/industry/get-started · https://www.coursera.org/business/integrations · https://www.coursera.org/about/terms

**Udemy:** https://www.udemy.com/affiliate/ · https://www.udemy.com/developers/affiliate/ · https://www.udemy.com/terms/ · https://business.udemy.com/partner-with-udemy/ · https://business.udemy.com/partner-with-udemy/reseller/ · https://partnersupport.udemy.com/hc/en-us/articles/360049413233-How-to-Get-Started-with-Impact · https://partnersupport.udemy.com/hc/en-us/articles/360049411833-What-are-the-Requirements-to-Join-the-Udemy-Affiliate-Program · https://partnersupport.udemy.com/hc/en-us/articles/360049411933-Who-can-Participate-in-the-Udemy-Affiliate-Program · https://partnersupport.udemy.com/hc/en-us/articles/13819713397783-How-do-I-Apply-to-Join-the-Udemy-Business-Reseller-Partner-Program

**edX:** https://www.edx.org/affiliate-program · https://www.edx.org/schools-partners · https://www.edx.org/edx-terms-service · https://business.edx.org/partner/ · https://business.edx.org/partner/type-overview/ · https://business.edx.org/partner/content/ · https://business.edx.org/product-descriptions-and-terms/ · https://business-support.edx.org/hc/en-us/articles/360005360954-4-Displaying-a-catalog-of-edX-courses

**DataCamp:** https://www.datacamp.com/affiliates · https://www.datacamp.com/affiliates/terms-and-conditions · https://www.datacamp.com/business/partner-program · https://www.datacamp.com/business/integration · https://www.datacamp.com/terms-of-use · https://support.datacamp.com/hc/en-us/articles/360034285254-LMS-LXP-Integration-Overview

**FutureLearn:** https://affiliates.futurelearn.com/ · https://progress.futurelearn.com/become-a-partner · https://progress.futurelearn.com/for-business · https://www.futurelearn.com/info/terms

**Skillshare:** https://www.skillshare.com/en/affiliates · https://legal.skillshare.com/hc/en-us/articles/27194932901645-Skillshare-Terms-of-Service · https://www.skillshare.com/en/for-teams/pricing · https://help.skillshare.com/hc/en-us/articles/205312177-How-can-I-get-in-touch-with-Skillshare · https://help.skillshare.com/hc/en-us/articles/34215508464141-Skillshare-s-AI-Principles-Supporting-Our-Creative-Community · https://help.skillshare.com/hc/en-us/articles/37027989370125-Understanding-Partnership-Revenue

**MasterClass:** https://www.masterclass.com/terms · https://www.masterclass.com/help-center/masterclass/answers/promotions-and-partnerships--id--tjQHxt1oSP6lzJmrVx9m5w · https://www.masterclass.com/help-center/masterclass/answers/contacting-master-class-support--id--6sH8j_CwT9iEZ_BJq_p6Sg · https://www.masterclass.com/for-business/how-it-works
