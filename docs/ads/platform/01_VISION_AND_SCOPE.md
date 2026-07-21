# 01 — Vision, Goals, Scope & Principles

## 1. Vision

UMTUBA Ads is an **independent advertising platform**, not a feature bolted onto
one surface. Its purpose is to become the single system through which every
UMTUBA product monetizes attention, promotes content and commerce, and connects
advertisers with audiences — safely, transparently, and at global scale.

The platform sells and delivers **structured promotion** (video, image,
carousel, story, sponsored products, sponsored creators, and more) into any
product surface that opts in, while UEOS remains the sole authority for money.
Products never build their own ad stacks; they consume Ads Platform services
through stable contracts.

The end state: an advertiser defines *who, what, where, how much, and for what
outcome* once, and the platform can deliver that intent across Watch, Discover,
World, Live, Store, Search, Games, UM Learning, and the Creator Economy — each
with product-appropriate formats, policy, and measurement.

## 2. Goals

### Product goals

- One advertiser experience that spans all UMTUBA surfaces.
- One campaign object model reused by every product and format.
- Predictable, auditable delivery with first-class privacy and safety.
- Transparent measurement advertisers can trust (no invented numbers).
- A monetization surface for creators and merchants, not only external brands.

### Platform goals

- **Independence:** Ads is deployable and reasoned about as its own platform
  with its own domain, storage authority, and contracts.
- **Consumability:** every product integrates through the same small set of
  service contracts (request placement, render, report event).
- **Separation of concerns:** targeting, delivery, measurement, moderation,
  and billing are distinct services with clear ownership.
- **Financial correctness by delegation:** all spend, credit, and settlement
  flow through UEOS; Ads never posts its own ledger.
- **Evolvability:** the model supports future auctions, bidding, and AI
  optimization without redesign.

### Non-goals (permanent architectural stances)

- Ads never becomes a financial system of record.
- Ads never targets individuals by identity, private messages, or sensitive
  attributes.
- Products never own ad-serving logic or ad data tables.

## 3. Product scope

### Consuming products (current + future)

| Product | Role as Ads consumer |
| --- | --- |
| Watch | In-feed video ads, sponsored creators, brand awareness |
| Discover | In-feed image/video/carousel, promoted content |
| World | Nearby/World ads, place and city promotion (policy-gated geo) |
| Live | Sponsored live, live pre/mid promotions, live lobby units |
| Store | Sponsored products, catalog promotion, retargeting-free promotion |
| Search | Search ads / sponsored results with clear labeling |
| Messages | Future, strictly policy-controlled; no message-content targeting |
| Games | Rewarded and promotional units (policy-gated, minor-safe) |
| UM Learning | Learning promotions, course/skill promotion |
| Creator Economy | Sponsored creators, creator self-promotion, boosts |
| Future products | Onboard via the same placement + policy contracts |

### In scope for the platform (over its lifetime)

Advertiser accounts and org roles; campaign/ad-set/creative/ad object model;
targeting; creative management and storage; placement contracts per product;
delivery decisioning; measurement and reporting; moderation and policy;
fraud-prevention readiness; UEOS-backed billing; future auction and AI
optimization.

### Out of scope for the platform (owned elsewhere)

Money movement, ledgers, settlement, payouts, FX (UEOS). Identity/auth
(platform auth). Product content and UX shells (each product). Real payment
processing (future UEOS-integrated billing + PSPs).

### Explicit boundaries: what Ads is NOT

- **Ads ≠ Store Promotions.** Store's seller promotions/discounts and
  fulfillment (e.g. `store_promotions_fulfillment`) are a Store commerce feature
  owned by Store. The Ads Platform's *Store Sponsored Products* is paid
  promotion/placement of catalog items through the Ads campaign model — it does
  not own, replace, or duplicate Store discount logic. A sponsored product may
  also carry a Store promotion, but the two systems remain independent.
- **Ads ≠ UM Points campaigns.** UM Points balances, rewards, and any
  points-based promotions are owned by the points/rewards domain and post
  through UEOS. Ads may *target* on a coarse UM Points **band** (see doc 04) but
  never issues, spends, or runs UM Points campaigns.
- **Ads ≠ a financial system.** All money is UEOS (see doc 07); Ads holds
  references only.

These boundaries prevent duplicated commerce/points logic and keep a single
owner for each concern.

## 4. Design principles

1. **Ads is a Platform, not a module.** It has its own domain, data authority,
   and service contracts. Products depend on Ads; Ads does not depend on any one
   product's internals.
2. **Financial operations belong to UEOS.** Ads records commercial intent and
   consumption (impressions, spend requests, budgets) but every value posting is
   a UEOS journal. Ads holds references, never balances of record.
3. **Every product consumes Ads Platform services.** Integration is through
   stable contracts (placement request, creative render descriptor, event
   report), never by reaching into ad tables.
4. **Database authority.** Invariants (budgets, status transitions, targeting
   validity, spend locks, dedupe) are enforced at the database with RLS,
   constraints, and `SECURITY DEFINER` RPCs — not only in application code.
5. **Policy driven.** Eligibility, targeting limits, creative rules, and
   placement rules are expressed as versioned policy, not hard-coded per surface.
6. **Feature flags.** Every capability (delivery, each placement, auctions, AI
   optimization) ships behind a flag and defaults to off. Nothing serves until
   explicitly enabled.
7. **Privacy-first targeting.** Targeting uses coarse, consented, non-PII
   signals. No individual-user targeting, no sensitive attributes, no private
   message/contact data. Minor-safety constraints are structural.
8. **Global scale.** Multi-region, multi-currency (via UEOS), multi-language,
   high-cardinality targeting, and high-volume event ingestion are assumed from
   the start of the design.
9. **Future auction support.** The delivery model is defined so a ranking/bid
   layer can be inserted without changing campaign or placement contracts.
10. **Future AI optimization support.** Decisioning is pluggable so budget
    pacing, bid shaping, and creative selection can later be model-driven,
    behind flags, with human-auditable overrides.

## 5. Platform boundaries

```
+---------------------------------------------------------------+
|                      UMTUBA Products                          |
|  Watch  Discover  World  Live  Store  Search  Games  Learning |
|      (each renders ad slots via placement contracts)          |
+-------------------------------▲-------------------------------+
                                | placement request / render / event report
                                |
+-------------------------------▼-------------------------------+
|                      ADS PLATFORM (this package)              |
|                                                               |
|  Advertiser  Campaign   Targeting   Creative   Delivery       |
|  Accounts    & Objects  & Audience  & Assets    Decisioning   |
|                                                               |
|  Measurement  Reporting  Moderation/Policy  Fraud Readiness   |
+----------------▲---------------------------------▲------------+
                 | spend / credit / settlement     | identity
                 | (references only)               |
+----------------▼------------------+   +----------▼------------+
|            UEOS (money)           |   |    Platform Auth      |
|  accounts, journals, balances,    |   |  users, sessions,     |
|  policies, settlement (future)    |   |  roles                |
+-----------------------------------+   +-----------------------+
```

- **Above the platform:** products own their UX and decide *whether and where*
  to expose ad slots. They call the platform; they do not read ad tables.
- **Below the platform:** UEOS owns money; Auth owns identity. Ads holds
  references (UEOS account ids, product/policy ids) and never duplicates their
  state.
- **Inside the platform:** each core service (see doc 02) has a single
  responsibility and a defined contract with the others.

The boundary is contractual and enforced by design: the only supported ways in
and out of the platform are the placement/render/event contracts (to products),
the UEOS RPC contracts (to money), and the auth context (to identity).
