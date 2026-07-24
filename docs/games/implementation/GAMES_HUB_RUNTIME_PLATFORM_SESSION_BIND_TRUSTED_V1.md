# UM Games — Hub Runtime Platform Session Bind Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`lib/games/gamesHubRuntime.ts`)
- Session UUID validator: `validateGameSessionId`
  (`lib/games/gamesSessions.ts`)

---

## Purpose

Provide a **pure fail-closed binder** that attaches a validated Platform
`session_id` to an existing Hub Runtime session contract.

This slice is **binder-only**:

- pure and side-effect free
- no Session Start / Submit / RPC / Supabase
- no completion → submit wiring
- no Hub authority changes
- no UI / gameplay / rewards / economy

`platformSessionId` is **metadata only**. A non-null value must **never** be
treated as:

- ownership
- gameplay permission
- submit permission
- runtime authority
- playability

---

## Helper

```
bindGamesRuntimePlatformSessionId(session, platformSessionId)
  → validate session present
  → validateGameSessionId(platformSessionId)
  → reject conflicting rebind
  → freezeAuthority({ ...session fields, platformSessionId })
```

### Signature

```
bindGamesRuntimePlatformSessionId(
  session: unknown,
  platformSessionId: unknown
) → GamesValidationResult<GamesRuntimeSessionContract>
```

Sets **only** `platformSessionId`. Every other runtime field is preserved.

---

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| Null / undefined / non-object session | `session_required` |
| Missing / malformed Platform UUID | `session_id_invalid` (from `validateGameSessionId`) |
| Rebind to a different non-null Platform id | `platform_session_id_conflict` |

### Idempotency

Rebinding the **same** Platform session id is allowed and returns an
equivalent frozen contract.

---

## Architecture constraints

- Pure function only — no side effects
- No RPC / Supabase / Session Start / Submit
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed (all capability flags false)
- Does not connect completion handoff or Platform submit
- Does not mutate the input session object

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote execution,
no Session Start / Submit changes, no completion→submit wiring, no UI,
no gameplay, no rewards / wallet / points / economy, no merge to
`alpha-0.2`.
