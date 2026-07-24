# UM Games — Session Result Submit Response Parser Trusted V1

Status: **code-ready**

Depends on:

- Games Platform Foundation V1 (`20260846`) — existing
  `submit_game_session_result` SQL success `jsonb_build_object`
- Shared types / helpers:
  - `GamesResultDecisionStatus` / `GAMES_RESULT_DECISION_STATUSES`
    (`lib/games/gamesFoundation.ts`)
  - `validateGameSessionId` (`lib/games/gamesSessions.ts`)

---

## Purpose

Provide a **pure fail-closed response parser** for the existing
`submit_game_session_result` success payload.

This slice is **parser-only**:

- pure and side-effect free
- no Supabase / RPC call
- no submit client
- no ownership, expiry, idempotency replay, or claim-decision logic
- no progress, achievement, reward, economy, Hub, or gameplay authority

Parsing success must **never** be treated as:

- caller owned the session
- session active / unexpired
- claim valid
- result newly applied
- idempotent replay safe to reapply
- progress / achievements changed
- reward / wallet / points / economy entitlement
- Hub Runtime / gameplay authority

SQL `submit_game_session_result` remains the **sole result decision and
mutation authority**. Hub Runtime authority remains closed.

---

## Exact SQL success response shape

Verified from `20260846` (`submit_game_session_result`):

Fresh insert and idempotent replay both return:

| Key | SQL source | Type / notes |
| --- | --- | --- |
| `session_id` | `p_session_id` / stored `session_id` | uuid (always present) |
| `result_id` | `v_result.id` / `v_existing.id` | uuid (always present) |
| `decision_status` | result row | `'accepted'` \| `'rejected'` |
| `rejection_reason` | result row | `text` or `null` (len ≤ 120 when string) |
| `recorded_score` | result row | `numeric` or `null` (`null` or `>= 0`) |
| `idempotent_replay` | literal | `true` (replay) / `false` (fresh) |

Do **not** reuse `parseGamesMySessionResult` — get-my-session nested result
includes `recorded_level` / `decided_at` and omits `session_id` /
`idempotent_replay`.

---

## Nullable and cross-field semantics

Nullable fields (per table + return object):

- `rejection_reason`
- `recorded_score`

Write-path behavior (fresh insert only; not enforced as table CHECKs):

- accepted → `rejection_reason = null`, `recorded_score = v_score`
- rejected → `rejection_reason = left(sqlerrm, 120)`, `recorded_score = null`

This parser does **not** invent those cross-field rules. Idempotent replay
returns stored row values; table CHECKs only require decision ∈
`{accepted,rejected}`, rejection reason null-or-≤120, and recorded score
null-or-≥0.

---

## Parser return type

```ts
type GamesSessionResultSubmitResponseView = {
  readonly session_id: string;
  readonly result_id: string;
  readonly decision_status: GamesResultDecisionStatus;
  readonly rejection_reason: string | null;
  readonly recorded_score: number | null;
  readonly idempotent_replay: boolean;
};
```

Top-level allowlist (exact): the six keys above.
Unknown top-level keys fail (`submit_response_unknown_field`).
Missing required keys fail (`submit_response_missing_field`).
Null / array / non-object payload fails (`submit_response_not_object`).
Successful values are returned frozen (immutable / bounded).

---

## Explicit non-authority

This module does **not**:

- call `submit_game_session_result` or any other RPC
- implement a submit client
- decide claim acceptance / rejection
- implement idempotency replay logic
- check ownership or session expiry
- mutate progress / achievements
- open Hub Runtime or wire `platformSessionId`
- imply rewards, wallet, points, or economy changes

---

## API

```ts
parseGamesSessionResultSubmitResponse(raw: unknown)
  → GamesValidationResult<GamesSessionResultSubmitResponseView>
```

---

## Out of scope (deferred)

- Submit client / remote RPC execution
- Ownership, expiry, idempotency replay, claim-decision logic
- Progress / achievement / anti-abuse / rewards / economy
- Hub Runtime / UI / playable runtime
- Migrations (do not apply `20260846` / `20260847` in this slice)
