# UM Games — Hub Experience Foundation V1

Status: **implemented locally** (no migration in this slice)

Route: `/games`

Contracts: `lib/games/gamesHubExperience.ts`

UI: `app/games/page.tsx`, `app/components/games/*`

Depends on:

- Games Platform Foundation V1
- Games Catalog Foundation V1
- Games Hub / Runtime Foundation V1

---

## Purpose

Foundational Games Hub page and view-model adapter. Displays catalog cards
with fail-closed Play actions bound to Runtime eligibility. No live game
server, multiplayer, matchmaking, rewards, or production APIs.

## Locked decisions

1. Route is `/games` (no prior Games route existed).
2. UI never trusts client-forged eligibility / score / rewards.
3. Draft and archived games are never listed.
4. Maintenance / unavailable games show disabled status — no fake Play.
5. Play evaluates foundation action only (`startedServer: false`).
6. Catalog loader is empty until a later data-wiring slice.
7. Visual language matches Learning/App dark panels (Tailwind only).

## UI states

loading · empty_catalog · ready · unavailable · maintenance ·
eligibility_blocked · internal_error

## Out of scope

Playable games, Hub nav chrome expansion, DB catalog fetch, multiplayer,
matchmaking, migrations, production assets.
