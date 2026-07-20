# UMTUBA Ads — Experiment Platform

**Document type:** Enterprise design blueprint (Ads V2)  
**Status:** Design only — not implemented  
**Builds on:** Campaign → Ad Group → Ad → Creative hierarchy; Delivery; Reporting; AI Engine non-interference  
**Scope:** Controlled experiments for advertisers and internal platform yield/trust tests

---

## 1. Scope

The **Experiment Platform** provides registered, auditable tests over Creatives, copy, CTAs, audiences, placements, destinations, and budget strategies—with stable assignment, guardrails, and human-gated winner rollout.

### Goals

1. Support creative, headline, CTA, audience, placement, landing, and budget-strategy tests.  
2. Provide holdouts, control/variants, random assignment, and stable bucketing.  
3. Detect sample ratio mismatch and enforce minimum sample guidance.  
4. Separate primary, secondary, and guardrail metrics.  
5. Prevent overlapping experiments that corrupt inference.  
6. Keep platform-internal experiments isolated from advertiser experiments.  
7. Block AI optimization from mutating running experiment arms (`11`).  
8. Never auto-promote winners without explicit authority/policy.

### Non-goals

- Declaring a single permanent statistical framework (frequentist vs Bayesian) as final.  
- Guaranteeing significance under low traffic.  
- Automatic budget transfers on “winner.”  
- Client-side-only assignment without server truth.  
- Using experiments to bypass Review.

---

## 2. Core Concepts

| Concept | Meaning |
|---------|---------|
| **Experiment** | Registered test with hypothesis, metrics, allocation, window |
| **Arm / Variant** | Control or treatment configuration |
| **Holdout** | Group withheld from treatment (or from ads entirely for incrementality) |
| **Assignment unit** | Usually user/device within Advertiser+Experiment scope |
| **Stable bucketing** | Deterministic hash → arm; sticky for experiment lifetime |
| **Guardrail metric** | Must not degrade beyond threshold (hide rate, IVT, CPA ceiling) |
| **Primary metric** | Decision metric (e.g., CTR, CPA, ROAS foundation) |
| **SRM** | Sample ratio mismatch vs planned allocation |
| **Registry** | System of record for all experiments |

**Current Design:** Specified for future build. V1 allows multiple Creatives per Ad as a primitive—not a full experiment platform.

---

## 3. Experiment Types

| Type | Varies | Notes |
|------|--------|-------|
| **Creative tests** | Asset / Creative | Same destination preferred |
| **Headline tests** | Text assets | Via Asset Library |
| **CTA tests** | CTA variants | Policy-checked strings |
| **Audience tests** | TargetingSpec / Audience links | No sensitive illegal expansion |
| **Placement tests** | Placement Registry subsets | Eligibility matrix still applies |
| **Landing destination tests** | DestinationRef | Review on destination change |
| **Budget strategy tests** | Pacing mode / bid strategy hooks | Hard Budget ceilings still apply |
| **Sequential tests** *(Future)* | Ordered multi-stage | Requires platform support |
| **Holdout / incrementality** | Exposure withheld | Platform or advertiser scoped |

---

## 4. Platform vs Advertiser Experiments

| Class | Owner | Purpose |
|-------|-------|---------|
| **Advertiser experiments** | AdvertiserOrg | Optimize their Campaigns |
| **Platform experiments** | UMTUBA Ads/Yield/Trust | Ranker, UX, policy—**not** visible as advertiser “A/B” unless disclosed |

Platform experiments must not silently break advertiser experiment assignments (coordination via Experiment Registry).

---

## 5. Lifecycle

```text
draft → scheduled → running → paused → completed
                              ↘ aborted
completed → (optional) winner_applied | inconclusive | archived
```

| State | Behavior |
|-------|----------|
| **draft** | Editable; no assignment |
| **scheduled** | Starts at start_at |
| **running** | Stable assignment active |
| **paused** | No new assignment changes; existing sticky optional |
| **completed** | End reached or manual stop; analysis freeze |
| **aborted** | Invalidated (SRM, bug, policy) |
| **winner_applied** | Explicit apply action by authorized role |
| **inconclusive** | No rollout |

---

## 6. Assignment & Bucketing

```text
assignment_key = hash(experiment_id, unit_id, salt_version)
arm = map(assignment_key → allocation slices)
```

Requirements:

- **Server-side** assignment recorded for audit.  
- Sticky for experiment duration unless unit reset policy.  
- Allocation percentages sum to 100% (including holdout).  
- Eligibility filters applied before bucketing (geo, campaign class, consent).

---

## 7. Metrics & Decision Discipline

| Class | Examples |
|-------|----------|
| **Primary** | CTR, CPA, ROAS foundation, conversion rate |
| **Secondary** | View rate, CPC, reach, funnel step rates |
| **Guardrails** | Hide/report rate, IVT rate, refund rate, Review reject rate, latency |

### Statistical caution

- “Significance” is easy to misuse (peeking, multiple comparisons, low power).  
- Platform must show **sample size guidance**, confidence intervals/bands, and peeking warnings.  
- **Early stopping** without pre-registered rules risks false winners—default discourage.  
- Bayesian or **bandit** approaches are **Future Capability** options—not adopted as final framework (**Open Decision**).

### Inconclusive results

UI must support explicit inconclusive outcome; no forced winner.

---

## 8. Sample Health

| Check | Action |
|-------|--------|
| **Minimum sample** | Block “declare winner” until guidance met (configurable) |
| **SRM detection** | Alert; auto-abort if severe |
| **Delivery imbalance** | Diagnose budget/eligibility skew vs assignment bug |
| **IVT spike** | Guardrail fail; pause experiment |

---

## 9. Overlap Prevention

Registry enforces policies such as:

- One running creative experiment per Ad (or mutual exclusion set).  
- Audience experiments cannot overlap same users across conflicting TargetingSpecs without nested design.  
- Platform experiments declare exclusion keys that advertiser experiments must respect.

Conflict → reject start or require redesign.

---

## 10. AI Interaction Rules

While Experiment `running`:

- AI Advertising Engine cannot auto-mutate arms.  
- Assisted suggestions allowed as **out-of-band drafts** not attached to live arms.  
- Fatigue alerts may recommend ending test early—human decision.  
- Bandit AI allocation *(Future)* only if experiment type explicitly opt-in.

---

## 11. Privacy

- No user-level export of assignment lists to advertisers.  
- Aggregates only; small-N suppression.  
- Holdouts that withhold ads still respect frequency and legal requirements.  
- Youth surfaces: experiments restricted by policy packs.

---

## 12. Reporting Segmentation

- Results by arm: primary/secondary/guardrails.  
- Optional cuts: placement, device, country—with privacy thresholds (`15`).  
- Segment fishing discouraged; pre-register secondary cuts when possible.  
- Data freshness labels: preliminary vs finalized (IVT windows).

---

## 13. Registry Fields (Conceptual)

| Field | Purpose |
|-------|---------|
| experiment_id / version | Identity |
| class | advertiser \| platform |
| type | creative/headline/… |
| hypothesis | Text |
| primary/secondary/guardrail metrics | MetricDefinition refs |
| arms[] | Config snapshots (Creative ids, TargetingSpec versions, …) |
| allocation | Percentages |
| eligibility | Campaign/AdGroup scope |
| start_at / end_at | Schedule |
| status | Lifecycle |
| salt_version | Bucketing |
| audit log | Create/start/pause/apply |

Config snapshots freeze arm definitions so mid-test edits require new Experiment version.

---

## 14. Winner Application Policy

Default:

1. Experiment completes or analyst stops.  
2. Authorized role (Campaign Manager+/platform owner) reviews.  
3. Explicit **Apply winner** copies winning Creative/Targeting/Destination into production objects.  
4. Review triggered if policy requires (destination/creative material change).  
5. Audit records actor + experiment_id.

No silent auto-apply.

---

## 15. Failure Modes

| Failure | Behavior |
|---------|----------|
| Assignment service down | Fail closed: serve control-only or pause experiment traffic |
| Arm Creative rejected mid-test | Pause experiment; mark aborted or redesign |
| SRM | Abort + notify |
| Overlap detected late | Freeze analysis; mark inconclusive |
| Metric pipeline lag | Delay winner eligibility; show preliminary |

---

## 16. MVP vs Future Capability

| MVP | Future |
|-----|--------|
| Creative + headline + CTA tests | Sequential tests, budget strategy bandits |
| Manual apply winner | Limited auto-apply under policy |
| Frequentist guidance + warnings | Bayesian / bandit frameworks (Open Decision) |
| Advertiser registry | Full platform×advertiser exclusion graph |
| Holdout basic | Geo-based incrementality toolkit |

---

## 17. Open Decisions

1. **Experiment statistical framework** (frequentist vs Bayesian vs bandit default).  
2. Early-stopping policy template.  
3. Assignment unit: user vs device vs account.  
4. Whether budget strategy tests may change bids without human confirm.  
5. Interaction with auction formula experiments (platform class).  
6. Default attribution model used as primary for conversion experiments (`13`).  
7. AI automatic optimization authority vs experiment locks (`11`).

---

## 18. Design Completeness Checklist

- [x] Test types, holdouts, control/variants, bucketing  
- [x] SRM, sample floors, guardrails, significance cautions  
- [x] Overlap prevention, registry, lifecycle, audit  
- [x] No auto-winner without authority  
- [x] Platform vs advertiser separation  
- [x] AI non-interference  
- [x] Privacy + reporting segmentation  
- [x] Inconclusive path  

---

## Related Documents

- `03_AD_TYPES.md` / `12_CREATIVE_ASSET_LIBRARY.md` — creative variants  
- `05_TARGETING.md` — audience arms  
- `04_PLACEMENTS.md` — placement arms  
- `07_REPORTING.md` / `15_ENTERPRISE_REPORTING.md` — metrics  
- `11_AI_ADVERTISING_ENGINE.md` — non-interference  
- `13_ATTRIBUTION_ENGINE.md` — conversion primary metrics  
- `16_ADS_API_AND_INTEGRATIONS.md` — future experiment APIs  
