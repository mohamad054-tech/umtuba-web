# UMTUBA Ads — Targeting

**Document type:** Audience selection and delivery eligibility blueprint  
**Scope:** Who can see ads; legal gates; include/exclude audiences; future AI audiences  
**Principle:** Targeting is powerful only within law, policy, and user trust

---

## 1. Targeting Principles

1. **Eligibility before ranking** — An ad is a candidate only if all targeting predicates match.  
2. **Region policy packs** — Features like gender or certain interests can be disabled per country.  
3. **Minimize sensitive inference** — Prefer first-party declared/consented signals over invasive inference.  
4. **Inclusion and exclusion are first-class** — Advertisers can include audiences and exclude overlapping ones.  
5. **Frequency is targeting-adjacent** — Caps protect UX and brand; enforced globally across placements.  
6. **Explainability** — “Why this ad” maps to human-readable targeting categories.  
7. **Auditability** — Targeting snapshots stored with delivery for disputes and regulators.  
8. **Future AI audiences** — Same audience object model; models are swappable.

---

## 2. Targeting Dimensions

### 2.1 Geography

| Dimension | Behavior |
|-----------|----------|
| **Country** | ISO country; required floor for many campaigns |
| **Region / State** | Administrative subdivision |
| **City** | City-level include/exclude lists |
| **Radius** | Lat/lng + radius km/mi for local businesses |

**Notes:**

- IP, device locale, and profile home region may disagree; resolution policy is versioned.  
- Radius ads require accurate enough location permission; otherwise fall back or drop.  
- Government campaigns may be restricted to domestic geos only.

### 2.2 Language

| Signal | Use |
|--------|-----|
| App UI language | Primary matching |
| Content language preference | Secondary |
| Creative language | Advertiser-declared; used for brand safety matching |

Ads can require `language IN (...)`. Mismatch may still show if advertiser allows “expanded languages.”

### 2.3 Age

- Age bands (e.g., 18–24, 25–34, …) or min age.  
- Hard blocks for regulated verticals (alcohol, etc.) via policy pack—not only advertiser preference.  
- Unknown age: exclude from age-gated ads; never invent age.

### 2.4 Gender (where legally permitted)

- Only when **policy pack allows** for that country and campaign class.  
- Values limited to platform-supported self-declared options; unknown = no match for gender-targeted ads.  
- Prohibited for discrimination-sensitive verticals (e.g., housing/credit/jobs) where law forbids—even if commercial gender targeting exists elsewhere.  
- “Why this ad” must not expose sensitive inferences beyond allowed categories.

### 2.5 Interests

| Source | Examples |
|--------|----------|
| Declared | User topic follows, Learning categories |
| Behavioral (aggregated) | Watch categories, Store browse categories |
| Advertiser custom | Interest packs curated by platform |

Sensitive interest categories (health, politics, religion, etc.) are **restricted or banned** by policy pack.

### 2.6 User Behavior

| Signal class | Examples | Use |
|--------------|----------|-----|
| Engagement | Watch completion propensity, Live join rate | Optimization / value prediction |
| Commerce | Store browsers, past purchasers (seller-scoped with rules) | Remarketing audiences |
| Learning | Course starters | Course ads |
| Negative | Hide ad, report ad | Suppression |

Raw event streams are not exposed to advertisers—only aggregated audience membership or modeled scores.

### 2.7 Device

- Device type: phone, tablet, desktop, TV.  
- OEM / form factor optional later.

### 2.8 Operating System

- iOS, Android, Windows, macOS, other.  
- OS version floors for App Ads (e.g., requires iOS ≥ X).

### 2.9 Connection Type

- Wi-Fi, cellular, unknown.  
- Useful for heavy video; never sole determinant of price discrimination against users in a harmful way—monitor for fairness.

### 2.10 Time Schedule

| Mode | Behavior |
|------|----------|
| **Dayparting** | Hours × days in advertiser timezone or user local timezone (declared) |
| **Date window** | Campaign/ad group start–end (see Budget) |
| **Blackout dates** | Explicit exclusions (holidays, events) |

### 2.11 Frequency Limits

| Cap | Scope |
|-----|-------|
| Per user × advertiser × day | Default brand safety |
| Per user × campaign × day/week | Advertiser-set |
| Per user × creative × day | Creative fatigue |
| Cross-placement global | Platform UX cap |

Frequency counters are near-real-time with eventual correction; slight overshoot allowed, systematic overshoot is a defect.

### 2.12 Audience Inclusion / Exclusion

| Audience type | Description |
|---------------|-------------|
| **Customer list** | Hashed first-party CRM match (policy + consent) |
| **Engagement audience** | Viewed/clicked ads or content |
| **Store remarketing** | Viewed PDP / ATC / purchasers (scoped) |
| **Lookalike / AI** | Expanded from seed (future) |
| **Suppression** | Purchasers, converters, opposites |

**Rules:**

- Include lists OR’d within group; AND’d with demographic/geo predicates (configurable).  
- Exclude always wins over include.  
- Separate ad groups recommended for clean experiments.

---

## 3. Targeting Expression Model (Conceptual)

```text
AdGroup.targeting =
  ALL OF (
    geo_predicate,
    language_predicate?,
    age_predicate?,
    gender_predicate?,          # only if region allows
    device_os_connection?,
    schedule_predicate,
    ANY OF interest_predicates?,
    ANY OF include_audiences?,
  )
  AND NOT ANY OF exclude_audiences
  AND frequency_caps_ok
  AND policy_pack_ok(campaign_class, vertical)
```

Exact AND/OR UI sugar may simplify to “narrow your audience” without exposing boolean trees to SMBs.

---

## 4. Policy Gates by Vertical

| Vertical | Extra targeting constraints |
|----------|----------------------------|
| **Jobs** | No discriminatory demo targeting where prohibited |
| **Real Estate / Credit-like** | Fair housing / equal opportunity style limits by region |
| **Government** | Often broad reach; microtargeting limited |
| **Charity** | Restrict sensitive exploitation topics |
| **Alcohol / age-restricted** | Hard age + geo legal map |
| **App Ads to teens** | Platform youth protections |

Policy Service evaluates before Delivery index admission and again at serve.

---

## 5. Privacy & Consent

- Location radius requires appropriate consent/permission state.  
- Customer list matching uses salted hashing; plain PII not stored in Ads audiences.  
- Users can reset ad topics / opt out of personalized ads where law requires—then delivery falls back to contextual/geo-limited.  
- Minors: personalized advertising restricted or disabled per youth policy.

---

## 6. Contextual Targeting (Complement)

When personalized ads are limited, placements may use:

- Query context (Search)  
- Nearby content category (Watch/Discover)  
- Store category page  
- Course category  

Contextual signals are placement-owned and passed as request features—not silent profile rewriting.

---

## 7. Future AI Audiences

### Design

| Object | Role |
|--------|------|
| **Seed audience** | CRM, engagers, converters |
| **AI audience definition** | Model id + version + similarity threshold |
| **Membership materialization** | Batch/stream job writes AudienceMembership |
| **Explainability bundle** | Coarse themes for “why this ad” |

### Guardrails

- No AI expansion into prohibited sensitive categories.  
- Model cards and version pins for audit.  
- Advertiser sees estimated size, not individual users.  
- Kill switch per model globally.

---

## 8. Advertiser Experience Tiers

| Tier | Targeting UX |
|------|--------------|
| **Simple** | Geo + age band + interests chips + schedule |
| **Standard** | + devices, frequency, audiences include/exclude |
| **Advanced** | Full predicates, API, experiments |
| **API** | Full expression + audience upload |

---

## 9. Delivery Snapshot

On serve, persist a compact **targeting match snapshot** (hashed/category form) for:

- Dispute resolution  
- Fraud investigation  
- Regulatory audit  
- Analytics breakdowns  

Do not store unlawful sensitive inferences.

---

## Related Documents

- `04_PLACEMENTS.md` — placement caps  
- `06_BUDGET_SYSTEM.md` — schedule windows  
- `08_SECURITY.md` — abuse of targeting  
- `09_DATABASE_BLUEPRINT.md` — targeting and audiences entities  
- `07_REPORTING.md` — geo/device breakdowns  
