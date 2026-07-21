# 06 — Moderation, Policy, Privacy & Fraud-Prevention Readiness

## 1. Operator authorization model

Moderation is performed by **Platform Admins**, a role that is entirely separate
from advertiser roles. The authority chain is database-first and matches the
shipped `ADS_ADMIN_REVIEW_FOUNDATION_V1.md`:

```
Platform Admin (row in public.platform_admins, keyed by auth.uid())
        ↓
SECURITY DEFINER RPC (admin_* review functions)
        ↓
require_platform_admin()  → sets reviewer_id = auth.uid(), then transitions
```

Rules:

- Operator review actions (approve / reject / suspend / restore) are **only**
  reachable through `SECURITY DEFINER` RPCs gated by `require_platform_admin()`.
- The **Next.js application never holds `SUPABASE_SERVICE_ROLE_KEY`.** JWT
  `app_metadata` / env allowlists are UX hints only and never grant admin access
  by themselves — the database is the sole authority.
- **`service_role` is reserved for trusted server-side tooling and operational
  tasks** (e.g. batch/automation jobs, migrations, back-office scripts). It is
  never the mechanism by which normal in-app review or advertiser actions occur.
- Advertiser roles (`owner` / `admin` / `campaign_manager` / `analyst` /
  `viewer`) **never** grant operator access; there are no admin links in
  advertiser navigation.
- Every operator action writes an immutable audit row (`reviewer_id = auth.uid()`)
  inside the same transaction as the status transition.

## 2. Policy as data

Moderation is driven by **versioned policy records**, not hard-coded rules per
surface. Policy governs:

- **Eligibility:** who may advertise, in which markets, for which objectives.
- **Creative content:** prohibited content, disclosures, labeling, format rules.
- **Targeting limits:** allowed dimensions, minor-safety constraints, min-size.
- **Placement rules:** which ad types/objectives are allowed per placement, plus
  product-specific constraints (e.g. Watch playback integrity, World coarse-geo).

Each policy is versioned with `effective_from`/`effective_to` (same discipline
as UEOS policies), so decisions are reproducible and auditable against the policy
in force at review time.

## 3. Review workflow

```
advertiser submits (account / campaign / ad set / ad / creative)
  → item enters pending_review
  → moderation queue (Platform Admin tooling)
  → policy checks (automated pre-checks + human decision)
  → approve / reject / request-changes / suspend
  → audit event recorded (reviewer_id = auth.uid(), when, policy version, reason)
```

Rules:

- Approve / reject / suspend / restore are **Platform Admin operator** actions
  via `SECURITY DEFINER` + `require_platform_admin()` (see §1); never
  advertiser-accessible.
- Every decision writes an **immutable audit event**.
- Approved creatives are **immutable**; changes create a new draft revision that
  re-enters review.
- Destination URLs are validated at submit and re-validated at review
  (https-only; no credentials/localhost/unsafe schemes).

## 3a. Enforcement actions (takedown, suspension, blocking)

Operators have a graduated, audited set of enforcement actions:

| Action | Scope | Effect |
| --- | --- | --- |
| Reject | Entity in review | Blocks approval; advertiser may revise and resubmit |
| Request changes | Entity in review | Returns to draft with reviewer notes |
| Suspend | Advertiser / campaign / ad set / ad / creative | Immediately stops serving; reversible via restore |
| Emergency takedown | Any live creative/ad | Immediate removal from delivery (policy/legal/safety incident), audited, reversible |
| Placement-level block | (Placement × advertiser/creative/category) | Stops eligibility for a specific placement without suspending the whole object |
| Advertiser suspension | Advertiser account | Halts all of the advertiser's delivery and new submissions |

- All enforcement actions are immutable-audited (who, when, reason, policy
  version) and reversible with a new decision.
- Emergency takedown and placement-level block take effect at the delivery
  eligibility stage, so a blocked object simply produces no candidates.

## 4. Automated pre-checks (foundation) → assisted moderation (future)

- **Foundation:** deterministic pre-checks — URL safety, format/size/MIME,
  targeting validity, minor-safety constraints, prohibited-content **placeholders**
  (keyword/category checks), and completeness. Human operators make the final
  call.
- **Future (flag-gated):** assisted moderation — model-based content
  classification, image/video safety scoring, and policy-violation suggestions.
  Models **advise**; humans retain override authority and every automated action
  is logged and reversible. No automated moderation ships without audit and
  appeal paths.

## 5. Prohibited & restricted content (policy categories)

- **Prohibited:** illegal goods/services, weapons to minors, adult content to
  minors, deceptive/misleading claims, malware/unsafe destinations, prohibited
  sensitive-attribute targeting.
- **Restricted (policy/market-gated):** alcohol, tobacco/vaping, gambling,
  financial products, health claims, political/social issue ads — allowed only
  where policy and market rules explicitly permit, with stricter review and
  labeling.
- **Minor-safety overlays:** stricter creative and targeting gates whenever an
  audience includes 13–17 (see doc 04 §5).

## 6. Privacy (platform posture)

- **No PII in targeting, delivery, or measurement.** Coarse, consented,
  non-identifying signals only.
- **No individual-user targeting**, no private message/contact data, no
  precise/continuous location.
- **Data minimization:** store targeting *intent* and aggregate metrics, not
  per-user match profiles.
- **Regional compliance:** available targeting signals and data retention are
  governed by market/consent rules; unavailable signals are absent from the
  allowed set for that context.
- **Right-to-transparency:** every ad renders with required labeling; users can
  see why (coarse) they saw a promotion where product surfaces provide that
  affordance.
- **Retention:** raw events retained per policy for audit/fraud/recompute, then
  aged out; aggregates retained longer as non-identifying counts.

## 7. Fraud-prevention readiness (hooks, not an engine)

This phase builds **readiness**, not a fraud engine. The architecture guarantees
the data shapes and control points a future engine will need.

### 7.0 Threat taxonomy the design must accommodate

| Threat | Description | Readiness hook |
| --- | --- | --- |
| Bot / non-human traffic | Automated impressions/clicks from bots | Signed server-side ingestion; coarse device/session anomaly signals; velocity limits |
| Click fraud | Inflated or malicious clicks | Per-handle dedupe + rate limits; click/impression ratio anomalies; IVT gate before billable counting |
| Conversion fraud | Fake or replayed conversions | Product-reported conversions with dedupe keys + attribution windows; provenance reference to the originating ad |
| Replay attacks | Re-sending captured event beacons | Signed events with dedupe keys / nonces; append-only store rejects duplicates (replay protection) |
| Self-clicking | Advertiser/creator clicking own ads | Account-relationship signals; handle/account correlation flags for review |
| Account farms | Many coordinated fake accounts | Coarse device/session/connection clustering signals; velocity spikes per handle/placement |
| Creator collusion | Creators coordinating to inflate sponsored metrics | Relationship + anomaly signals between advertiser, creator, and traffic patterns; manual-review flags |
| Merchant collusion | Merchants coordinating fake sponsored-product engagement | Same relationship/anomaly signals applied to Store sponsored placements |
| Coordinated abuse | General cross-account manipulation | Aggregate anomaly detection over append-only events; operator quarantine |

None of these detectors are built in this phase; the platform guarantees the
data shapes, signatures, dedupe/replay protection, and control points so a later
engine can implement them without redesign.

### 7.1 Trust levels

Events and actors carry a **trust level** so counting and (future) billing can
weight or exclude low-trust traffic:

| Trust level | Meaning | Treatment |
| --- | --- | --- |
| trusted | Signed, first-party, passes basic checks | Countable and billable |
| unverified | Missing/weak signature or provenance | Counted as diagnostic only; never billable |
| suspicious | Trips anomaly/relationship signals | Quarantined pending review; excluded from billing |
| rejected | Fails signature/replay/dedupe | Dropped; not counted |

Trust level is assigned at ingestion and can be downgraded retroactively (append
compensating records); the minimal IVT gate (doc 07 §2.2, doc 08 Phase 4) only
lets **trusted** events become billable.

### 7.2 Structural readiness

- **Server-side signed ingestion:** no anonymous client writes to event tables;
  events carry signatures and dedupe keys.
- **Dedupe keys + rate limits:** duplicate/abusive beacons are dropped, not
  counted.
- **Non-identifying handles:** frequency/session handles enable capping and
  anomaly detection without user profiles.
- **Append-only raw events:** immutable truth enables retrospective invalid-
  traffic analysis and recompute.
- **Idempotent spend postings:** billing (when enabled) is idempotent so
  invalidated events can be reconciled via UEOS compensations, never silent
  edits.
- **Replay protection:** signed events with dedupe keys/nonces and an
  append-only store make replayed beacons detectable and non-counting.

### 7.3 Signals a future engine can consume

- Impression/click ratios and timing anomalies.
- Device/session/connection-class anomaly patterns (coarse, non-PII).
- Geo/context inconsistencies vs targeting.
- Velocity spikes per handle/placement/campaign.
- Manual-review flags on suspicious accounts.

### 7.4 Control points (reserved)

- **Minimal IVT gate** (Phase 4): only trusted, deduped, replay-checked events
  are eligible to become billable (doc 07 §2.2, doc 08 Phase 4).
- Invalid-traffic filtering **before** billable counting.
- Quarantine/suspend on suspicious accounts (operator action, audited).
- Spend clawback via UEOS compensating journals (future billing).

No full fraud engine, scoring model, or bidding-abuse detector is implemented in
this phase (that is Phase 6); the platform guarantees these hooks and the
minimal IVT gate exist so later phases can add advanced detection without
redesign.

## 8. Appeals & reversibility

- Rejections and suspensions are appealable through operator tooling.
- Every automated or manual action is logged with policy version and reason, and
  is reversible (new decision + audit), preserving history.
