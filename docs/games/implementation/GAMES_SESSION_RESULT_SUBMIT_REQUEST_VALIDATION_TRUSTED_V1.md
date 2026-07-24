# UM Games — Session Result Submit Request Validation Trusted V1

Status: **code-ready**

Depends on:

- Games Platform Foundation V1 (`20260846`) — existing
  `submit_game_session_result` SQL signature and claim contract
- Shared validators:
  - `validateGameSessionId` (`lib/games/gamesSessions.ts`)
  - `validateIdempotencyKey` (`lib/games/gamesFoundation.ts`)
  - `validateClientResultClaim` (`lib/games/gamesFoundation.ts`)

---

## Purpose

Provide a **single fail-closed request-validation and assembly boundary** for
a *future* `submit_game_session_result` client.

This slice is **validation / assembly only**:

- pure and side-effect free
- no Supabase / RPC call
- no submit client
- no response or decision parser
- no ownership, expiry, idempotency replay, or acceptance authority

Validation success must **never** be treated as:

- permission to submit
- ownership of the session
- session active / unexpired
- claim accepted
- authoritative result
- progress / achievement entitlement
- reward / wallet / points / economy entitlement
- Hub Runtime / gameplay authority

SQL `submit_game_session_result` remains the **sole future mutation authority**.
Hub Runtime authority remains closed.

---

## Future RPC contract (authoritative; not called here)

| Item | Value |
| --- | --- |
| RPC | `submit_game_session_result` |
| Registry | `GAMES_PUBLIC_RPCS.submitResult` |
| Signature | `(p_session_id uuid, p_idempotency_key text, p_claim jsonb) → jsonb` |
| Grants | `authenticated`, `service_role` (SQL layer) |

A later submit client must map the validated request fields to SQL args:

| Validated field | SQL argument |
| --- | --- |
| `session_id` | `p_session_id` |
| `idempotency_key` | `p_idempotency_key` |
| `claim` | `p_claim` |

---

## Validated request type

```ts
type GamesSessionResultSubmitRequest = {
  readonly session_id: string;
  readonly idempotency_key: string;
  readonly claim: GamesClientResultClaim;
};
```

Top-level allowlist (exact): `session_id`, `idempotency_key`, `claim`.
Unknown top-level keys fail closed (`submit_request_unknown_field`).
Null / array / non-object request fails (`submit_request_not_object`).

Successful values are returned frozen (immutable / bounded).

---

## Claim allowlist and validation behavior

Claim validation is delegated entirely to `validateClientResultClaim`
(`fail_closed`). Allowlisted keys:

| Key | Required | Constraints |
| --- | --- | --- |
| `score` | yes | finite number, `>= 0`, `<= 1_000_000_000` |
| `level` | no | integer, `0..1_000_000` |
| `experience_delta` | no | integer, `0..1_000_000` |
| `duration_ms` | no | integer, `0..86_400_000` |
| `client_meta` | no | plain object, UTF-8 JSON `<= 1024` bytes |

Also rejected by the existing claim validator:

- unknown claim fields (`unknown_claim_field`)
- authoritative denylist fields (`authoritative_field_forbidden`)
- malformed numeric / string / boolean values
- oversized claim payload (`<= 4096` bytes serialized)

Session UUID and idempotency validation reuse:

- `validateGameSessionId` → `session_id_invalid`
- `validateIdempotencyKey` → length / charset rules matching SQL

No duplicated claim or idempotency logic in this module.

---

## Explicit non-authority

This module does **not**:

- call `submit_game_session_result` or any other RPC
- look up sessions or check ownership / expiry
- check idempotency replay
- decide claim acceptance / rejection
- persist results or update progress / achievements
- open Hub Runtime or wire `platformSessionId`
- imply rewards, wallet, points, or economy changes

---

## API

```ts
validateGamesSessionResultSubmitRequest(raw: unknown)
  → GamesValidationResult<GamesSessionResultSubmitRequest>
```

---

## Out of scope (deferred)

- Submit client / remote RPC execution
- Response / decision parser
- Session mutation, Hub wiring, UI, playable runtime
- Progress / achievement / anti-abuse / rewards / economy
- Migrations (do not apply `20260846` / `20260847` in this slice)
