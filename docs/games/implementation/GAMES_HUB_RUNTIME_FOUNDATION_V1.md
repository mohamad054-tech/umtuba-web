# UM Games — Hub / Runtime Foundation V1

Status: **implemented locally** (no migration in this slice)

Constants / contracts: `lib/games/gamesHubRuntime.ts`

Depends on:

- Games Platform Foundation V1 (`20260846`, `lib/games/gamesFoundation.ts`)
- Games Catalog Foundation V1 (`20260847`, `lib/games/gamesCatalog.ts`)

---

## Purpose

Internal Hub presentation contracts and Runtime session lifecycle foundation
for UMTUBA games. Fail-closed eligibility, start/resume/completion/abandon
paths, and non-authoritative completion handoff into Platform result /
progress / achievements foundations.

## Locked decisions

1. **No playable game server** in this slice — contracts only.
2. **Catalog is authority** for status / availability / playability.
3. **Client results are claims** — never final authority; no rewards granted.
4. **Solo mode only** — multiplayer / matchmaking remain false.
5. **At most one active runtime session** per player + game (evaluated).
6. **Idempotent finalization** for completion / abandon / expiry.
7. **No public API / Hub UI / production runtime endpoint**.
8. **No migration** in this slice.

## Hub domain fields

game id, title, description, category, status, availability, supported modes,
player-count bounds, runtime eligibility, maintenance state, release channel.

## Runtime lifecycle

```
created → active | abandoned | expired
active → paused | completed | abandoned | expired
paused → active | completed | abandoned | expired
completed | abandoned | expired → (terminal)
```

## Out of scope

Kick Blast / Card game implementations, multiplayer, matchmaking, economy /
UM Points rewards, Hub UI pages, production endpoints, migration apply.

## Authority

`GAMES_HUB_RUNTIME_AUTHORITY` keeps all of the following **false**:

- runsActualGameServer
- grantsRewards
- acceptsClientResultAsAuthoritative
- multiplayerEnabled
- matchmakingEnabled
- appliesMigrations
- publicApiEnabled
- productionRuntimeEndpointEnabled
- mutatesDatabase
