# UM Games — Hub Runtime Submit Outcome Apply Eligibility Contract Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`GamesRuntimeSessionContract`,
  `GamesRuntimeCompletionHandoff`)
- Hub Runtime Submit Outcome Acknowledgment Contract Trusted V1
  (`evaluateGamesRuntimeSubmitOutcomeAcknowledgmentTrusted` /
  `GamesRuntimeSubmitOutcomeAcknowledgment`)

---

## Purpose

Provide a **pure fail-closed eligibility classifier** that determines whether
an already-trusted Runtime submit outcome acknowledgment is eligible for a
future local apply step after strict continuity checks.

This slice is **eligibility classification only**:

- no apply semantics
- no mutation of runtime session or completion handoff
- no lifecycle transition
- no `handoff.applied = true`
- no reapply permission
- no Supabase / Submit / Start / RPC
- no progress, achievement, reward, economy, or gameplay authority
- no Hub synchronization

SQL remains the sole submit decision and mutation authority. The existing
acknowledgment is the only trusted classification input. Hub Runtime
authority remains closed.

---

## Helper

```
evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
  runtimeSession,
  completionHandoff,
  trustedOutcomeAcknowledgment
)
  → validate bounded objects
  → structurally validate trusted acknowledgment (no Platform re-parse)
  → require consistent acknowledgmentStatus / decisionStatus /
      idempotentReplay
  → require non-null valid platformSessionId
  → continuity:
       runtime ↔ handoff (runtimeSessionId / gameId / playerId)
       acknowledgment ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
  → classify eligibilityStatus
  → freeze eligibility (applied / mutates* / permitsReapply: false)
```

### Signature

```
evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedOutcomeAcknowledgment: unknown
) → GamesValidationResult<GamesRuntimeSubmitOutcomeApplyEligibility>
```

### Eligibility return type

```
GamesRuntimeSubmitOutcomeApplyEligibility = Readonly<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  acknowledgmentStatus:
    | "rejected"
    | "accepted_fresh"
    | "accepted_idempotent_replay";
  eligibilityStatus:
    | "ineligible_rejected"
    | "eligible_accepted_fresh"
    | "ineligible_idempotent_replay";
  decisionStatus: GamesResultDecisionStatus;
  idempotentReplay: boolean;
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  permitsReapply: false;
}>
```

Hub Runtime camelCase only. Authority flags are always literal `false`.

---

## Classification rules

| Acknowledgment status | `eligibilityStatus` |
| --- | --- |
| `rejected` | `ineligible_rejected` |
| `accepted_fresh` | `eligible_accepted_fresh` |
| `accepted_idempotent_replay` | `ineligible_idempotent_replay` |

No additional eligibility states are invented.

---

## Continuity checks

| Check | Reason on failure |
| --- | --- |
| Runtime session not a bounded object | `session_required` |
| Completion handoff not a bounded object | `handoff_required` |
| Acknowledgment missing / malformed | `acknowledgment_invalid` |
| Unsupported `acknowledgmentStatus` | `unsupported_acknowledgment_status` |
| Inconsistent `decisionStatus` / `idempotentReplay` | `inconsistent_acknowledgment_state` |
| `platformSessionId` null / invalid | `platform_session_id_required` |
| Runtime/handoff `runtimeSessionId` mismatch | `runtime_session_id_mismatch` |
| Runtime/handoff `gameId` mismatch | `session_game_mismatch` |
| Runtime/handoff `playerId` mismatch | `session_owner_mismatch` |
| Acknowledgment/runtime identity mismatch | `acknowledgment_identity_mismatch` |
| Acknowledgment/runtime `platformSessionId` mismatch | `platform_session_id_mismatch` |

### Consistency rules (acknowledgment)

| `acknowledgmentStatus` | Required |
| --- | --- |
| `rejected` | `decisionStatus === "rejected"` |
| `accepted_fresh` | `decisionStatus === "accepted"` AND `idempotentReplay === false` |
| `accepted_idempotent_replay` | `decisionStatus === "accepted"` AND `idempotentReplay === true` |

Input authority flags must remain literal `false`
(`applied` / `mutatesRuntime` / `mutatesHandoff` / `permitsReapply`).

---

## Non-inferences

| Eligibility | Must not imply |
| --- | --- |
| `eligible_accepted_fresh` | local apply occurred, Hub sync completed, automatic lifecycle transition, local progress/achievement change, reward/economy entitlement |
| `ineligible_idempotent_replay` | prior local apply definitely occurred, replay globally complete, new apply may be attempted |
| `ineligible_rejected` | auto-retry permission, claim mutation permission |

---

## Architecture constraints

- Eligibility-classification-only helper — no apply / mutation authority
- No lifecycle transition
- No handoff adaptation to `applied: true`
- No reapply / replay authority
- SQL remains sole submit decision and mutation authority
- Existing acknowledgment is the only trusted classification input
- Do not re-parse Platform snake_case submit responses here
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote RPC
execution, no Start or Submit call, no `handoff.applied=true`, no runtime
lifecycle activation, no UI, no gameplay, no progress / achievement
mutation, no rewards / wallet / points / economy, no multiplayer /
matchmaking, no Ads / Store / Learning / World, no merge to `alpha-0.2`.
