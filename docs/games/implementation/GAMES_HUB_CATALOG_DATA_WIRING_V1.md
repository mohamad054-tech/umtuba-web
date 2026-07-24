# UM Games — Hub Catalog Data Wiring V1

Status: **implemented locally** (no migration in this slice)

Route: `/games`

Contracts:

- Trusted list: `listGamesCatalogTrusted` / parsers in `lib/games/gamesCatalog.ts`
- Hub loader: `loadGamesHubExperienceCatalogFoundation` in
  `lib/games/gamesHubExperience.ts`
- Page wiring: `app/games/page.tsx`

Depends on:

- Games Catalog Foundation V1 (`list_games_catalog`, EntryView contracts)
- Games Hub Experience Foundation V1 (adapters + UI states)
- Games Hub / Runtime Foundation V1 (eligibility remains closed)

---

## Purpose

Replace the empty Hub catalog stub with a fail-closed, authenticated read of
visible Games Catalog entries so `/games` can render real catalog cards.
Runtime launch stays disabled.

## Locked decisions

1. Catalog RPC (`list_games_catalog`) is the authoritative list source.
2. Payloads are allowlist-parsed into `GamesCatalogEntryView` — no raw DB rows
   reach UI components.
3. Hub UI receives only the Experience presentation model.
4. `empty_catalog` only after a trusted success with zero displayable cards.
5. RPC / auth / envelope / load failures → `internal_error` (fail closed).
6. Hidden / draft / archived / malformed rows are never rendered.
7. No migrations, seeds, session creation, or playable runtime in this slice.

## Data flow

```
authenticated page
  → createClient() (user JWT)
  → listGamesCatalogTrusted → list_games_catalog
  → parse allowlisted EntryView[]
  → loadGamesHubExperienceCatalogFoundation
  → adaptGamesCatalogToHubExperience
  → GamesHub / GameCard (presentation only)
```

## Out of scope

Migration apply (`20260847`), title seeds, playable runtime, multiplayer,
matchmaking, session creation, nav redesign, Ads / Store / Learning / World.

## Migration apply status

**NOT APPLIED** — this slice does not create or apply migrations. Until Catalog
Foundation is applied remotely, the Hub fails closed to `internal_error`.
