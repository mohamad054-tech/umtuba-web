# UMTUBA Ads — AI Advertising Engine

**Document type:** Enterprise design blueprint (Ads V2)  
**Status:** Design only — not implemented  
**Builds on:** Foundation V1 (`01`–`10`), especially Targeting, Budget, Delivery, Reporting, Review  
**Scope:** Assisted and optimized advertising intelligence with human and policy controls

---

## 1. Scope

This document defines the **AI Advertising Engine**: a governed intelligence layer that helps Advertisers create, localize, diagnose, and improve Campaigns, Ad Groups, Ads, and Creatives—without replacing Delivery, Billing, Review, or human accountability.

### Goals

1. Reduce time-to-first-valid-campaign for SMBs and agencies.  
2. Suggest objective, audience, Placement Registry slots, Budget, duration, format, and CTA—with explanations.  
3. Generate and localize creative copy variants under brand and policy constraints.  
4. Detect underperformance and Creative Fatigue during Delivery.  
5. Provide performance forecasts labeled as **estimates, not guarantees**.  
6. Keep humans in control of sensitive changes (budget raises, publish, targeting expansion).  
7. Prevent AI from expanding into prohibited or sensitive targeting categories.  
8. Protect user data: no raw PII to models; auditable model/prompt versions; rollback.

### Non-goals

- Replacing the auction / ranker formula (still an open decision).  
- Autonomous spend without Budget and human/policy gates.  
- Bypassing Review or moderation.  
- Binding to a specific AI vendor or model family.  
- Guaranteeing ROAS, CPA, or reach.  
- Inferring sensitive user attributes beyond policy packs in `05_TARGETING.md`.

---

## 2. Core Concepts

| Concept | Meaning |
|---------|---------|
| **AI Advertising Engine** | Orchestrator of suggestion, generation, diagnosis, and optional optimization proposals |
| **Suggestion** | Non-applied recommendation (objective, audience, placements, budget, creative) |
| **Proposal** | Structured change set awaiting **Human approval** before mutate |
| **Estimate** | Forecast band with assumptions and confidence; never a contract |
| **Explainability Bundle** | Human-readable reasons + policy checks that produced a suggestion |
| **Model Version** | Immutable id for model + prompt/template pack + feature schema |
| **Assisted mode** | AI drafts; human applies |
| **Optimization mode** | AI proposes Delivery/Budget/Creative tweaks under authority policy *(Future Capability)* |
| **Rules layer** | Deterministic validators that always run before/after AI |

**Current Design:** Engine is specified as a future service boundary. Foundation V1 already reserves AI audiences and pacing hooks; this document expands the enterprise control plane.

---

## 3. Architecture Placement

```text
Advertiser Console / Ads API
        │
        ▼
┌───────────────────────────┐
│   AI Advertising Engine   │
│  Suggest · Generate ·     │
│  Diagnose · Propose       │
└─────────────┬─────────────┘
              │ reads (aggregates, catalogs, policy)
              │ writes only via Proposal → Campaign/Creative services
              ▼
┌─────────────┴──────────────────────────────────────────┐
│ Campaign · Creative · Asset Library · Audience · Budget │
│ Placement Registry · Reporting aggregates · Review      │
└─────────────┬──────────────────────────────────────────┘
              │ never on hot serve path
              ▼
         Delivery / Ad Server   (consumes approved objects only)
```

### Integration boundaries

| System | AI may | AI must not |
|--------|--------|-------------|
| **Delivery** | Read eligibility diagnostics | Change auction weights inline; inject unpublished creatives |
| **Reporting** | Read aggregates / funnels | Rewrite historical facts |
| **Review** | Pre-check drafts; flag risk | Auto-approve or skip queue |
| **Budget / Billing Account** | Suggest caps; draft proposals | Raise limits or charge without approval policy |
| **Store / Live / Learning** | Read eligibility metadata | Mutate orders, sessions, enrollments |
| **Identity** | Use coarse consented features | Send raw PII to external models |

---

## 4. Capability Catalog

### 4.1 Natural-language campaign draft

**Input (Current Design contract):** free-text brief + AdvertiserOrg context (region, vertical, linked Store if any).  
**Output:** draft Campaign objective, Ad Group TargetingSpec sketch, placement set, BudgetPolicy sketch, Ad + Creative text options, Explainability Bundle.

Workflow:

```text
Brief → Rules normalize intent
     → AI draft structure
     → Policy pack filter (geo, vertical, sensitive)
     → Human edit + approve
     → Review submission (unchanged trust path)
```

### 4.2 Objective suggestion

Map brief language to Campaign objectives already used in V1 (Awareness, Traffic, Engagement, Conversions/Store, App Install, Live Views, Lead/Apply, Donations).  
If ambiguous, present ranked options with trade-offs—not a silent pick.

### 4.3 Audience suggestion

Propose include interests, geo, schedule, and (Future) AI audiences from seed performance.  
**Hard stop:** cannot add gender or sensitive interests where regional policy packs forbid; cannot invent age for unknown users.

### 4.4 Placement suggestion

Select from **Placement Registry** eligibility matrix (`03`/`04`), filtered by ad type and campaign class. Prefer surfaces matching objective (e.g., Store Ads → Store + Discover).

### 4.5 Budget and duration suggestion

Suggest daily/lifetime Budget and date window using AdvertiserAccount currency, historical category benchmarks (anonymized), and advertiser constraints.  
Always show: assumptions, estimate range, and “not a guarantee.”

### 4.6 Format and CTA suggestion

Recommend creative shape (image/video/carousel) and CTA language compatible with destination type (Shop now, Watch Live, Enroll, Apply, …).

### 4.7 Multi-variant copy generation

Generate N headlines, descriptions, CTA variants; store as Creative text candidates or Asset Library text assets (`12_CREATIVE_ASSET_LIBRARY.md`).  
Each variant carries provenance: `ai_generated` + Model Version.

### 4.8 Language, translation, localization

- Source language detection (best-effort).  
- Translation + locale adaptation (currency display, CTA norms)—not legal claim rewriting.  
- Human must confirm regulated claims (health, finance, government).

### 4.9 In-flight optimization (proposals only by default)

Detect issues from Reporting aggregates; emit Proposals such as:

- Pause fatigued Creative  
- Shift placement mix within approved set  
- Suggest budget reallocation across Ad Groups  
- Suggest audience broaden/narrow within policy  

**Open Decision:** whether Optimization mode may auto-apply low-risk changes (see §12). Default Current Design: **Human approval required** for sensitive classes.

### 4.10 Underperformance detection

Signals (illustrative, thresholds TBD): sudden CTR drop vs placement baseline, CPA spike, delivery “learning limited,” high hide/report rate, destination errors (delisted SKU, ended Live).

### 4.11 Creative Fatigue alerts

Cross-ref frequency and Creative-level CTR decay (`05_TARGETING.md` frequency caps). Alert → suggest new Creative from Asset Library or AI variants → still Review if material change.

### 4.12 Performance estimates

Show predicted impressions/spend/CPA **bands** with Model Version, training window, and disclaimer. Never present as SLA.

### 4.13 Explainability

Every suggestion includes:

| Field | Example |
|-------|---------|
| Why audience | “Matches Store category affinity + geo of prior converters (aggregated)” |
| Why budget | “Category median daily spend for similar SMB pilots ± band” |
| Why placement | “Objective=Store conversion; Placement Registry allows Store+Discover” |
| Policy checks | “Gender targeting disabled for region X” |
| Rejected alternatives | “Blocked interest pack: health-sensitive” |

---

## 5. Human Approval & Authority Matrix

| Change class | Default authority |
|--------------|-------------------|
| Draft copy / creative variants | Human apply |
| Targeting within existing approved dimensions | Human apply |
| Expand geo or budget increase | Human + optional step-up for large deltas |
| Publish / resume Campaign | Human; then Review path |
| Auto-pause on fraud/policy | Platform Fraud/Review (not AI) |
| Auto-apply optimization | **Open Decision** — default off |

AI never holds independent Billing Account spend authority.

---

## 6. Safety, Privacy, and Policy

1. **No raw PII** in prompts or external model calls—use aggregated features, hashed ids only inside Ads VPC, or synthetic examples.  
2. **Customer lists** never sent to generative models.  
3. **Sensitive category blocklist** enforced by Rules layer after AI output.  
4. **Youth / regulated verticals** use stricter templates or disable generative claims.  
5. **Government / Charity** campaign classes: AI assist limited; elevated human Review remains.  
6. **Prompt injection** from advertiser briefs treated as untrusted input.  
7. **Output scanning** before Proposal (malware URLs, banned claims, fake urgency).

---

## 7. Model Versioning, Audit, Rollback

| Artifact | Requirement |
|----------|-------------|
| **Model Version** | Immutable; referenced on every Suggestion/Proposal |
| **Prompt/template pack version** | Same |
| **Feature schema version** | Same |
| **Audit** | Actor, org, inputs hash (not raw PII), outputs summary, accept/reject |
| **Rollback** | Revert Campaign/AdGroup/Creative to prior revision; disable Model Version globally via kill switch |

Rollback does not rewrite historical Reporting facts; it only restores mutable campaign objects.

---

## 8. Failure Modes & Manual Fallback

| Failure | Behavior |
|---------|----------|
| Model timeout / outage | Console falls back to manual builder; no blocked CRUD |
| Low-confidence estimate | Show “insufficient data”; suppress numeric forecast |
| Policy filter strips most of draft | Return partial draft + explicit blocks |
| Hallucinated placement_id | Rules drop unknown ids |
| Optimization loop instability | Circuit breaker; revert to Assisted-only |
| Suspected data leakage | Kill switch + incident playbook (`08_SECURITY.md`) |

---

## 9. Phased Implementation (Design)

| Phase | Name | Capability |
|-------|------|------------|
| **A** | Rules first | Deterministic templates, validators, fatigue heuristics without generative models |
| **B** | Assisted AI | NL draft, copy variants, localization, explainability, human apply |
| **C** | Optimization | In-flight proposals; optional limited auto-apply per Open Decision |

Aligns with roadmap intelligence themes in `10_FUTURE_ROADMAP.md` without claiming Phase C is shipped.

---

## 10. Relationship to Experiments

AI must not silently mutate arms of a running Experiment (`14_EXPERIMENT_PLATFORM.md`). Optimization Proposals that touch experiment-eligible objects are blocked or require experiment-aware policy.

---

## 11. MVP vs Future Capability

| MVP (Assisted) | Future |
|----------------|--------|
| NL → draft Campaign structure | Auto budget pacing via AI controller |
| Copy + CTA variants + translation assist | Multi-touch creative sequencing |
| Fatigue & underperformance alerts | Bandit creative selection (see Experiments) |
| Estimates with disclaimer | Causal uplift estimates |
| Explainability bundles | Advertiser-facing model cards |

---

## 12. Open Decisions

1. **AI automatic optimization authority** — which change classes may auto-apply, if any.  
2. Auction formula interaction with AI bid suggestions.  
3. Gender and sensitive targeting policy packs (AI must follow, not invent).  
4. Political advertising policy for generative content.  
5. Default attribution windows affecting CPA estimate training labels.  
6. Creator inventory revenue sharing (AI must not promise creator payouts).  
7. Regional data residency for model inference endpoints.  
8. External DSP demand (out of AI Engine scope until decided).

---

## 13. Design Completeness Checklist

- [x] Suggestion surfaces for objective, audience, placements, budget, format/CTA  
- [x] Multi-variant copy + localization  
- [x] In-flight diagnosis, fatigue, estimates-as-estimates  
- [x] Explainability + human approval + sensitive-target blocks  
- [x] No raw PII to models; versioning; audit; rollback  
- [x] Delivery/Reporting/Review boundaries  
- [x] Rules → Assisted → Optimization phases  
- [x] Failure/fallback modes  
- [x] Open decisions recorded  

---

## Related Documents

- `05_TARGETING.md` — policy-gated targeting; AI audiences guardrails  
- `06_BUDGET_SYSTEM.md` — caps, auto-stop; AI cannot override hard ceilings  
- `07_REPORTING.md` / `15_ENTERPRISE_REPORTING.md` — signals for diagnosis  
- `08_SECURITY.md` — Review, fraud, audit  
- `12_CREATIVE_ASSET_LIBRARY.md` — storage for AI variants + provenance  
- `13_ATTRIBUTION_ENGINE.md` — conversion labels for estimates  
- `14_EXPERIMENT_PLATFORM.md` — non-interference rules  
- `16_ADS_API_AND_INTEGRATIONS.md` — future assisted-draft API surfaces  
