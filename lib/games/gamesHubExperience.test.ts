import { describe, expect, it } from "vitest";
import {
  GAMES_CATALOG_FEATURE_FLAG_DEFAULTS,
  type GamesCatalogEntryView,
} from "./gamesCatalog";
import {
  adaptGamesCatalogEntryToHubCard,
  adaptGamesCatalogToHubExperience,
  assertGamesHubExperienceAuthorityClosed,
  evaluateGamesHubPlayAction,
  isGamesHubDisplayableEntry,
  loadGamesHubExperienceCatalogFoundation,
} from "./gamesHubExperience";
import { GAMES_HUB_RUNTIME_AUTHORITY } from "./gamesHubRuntime";

const GAME_ID = "22222222-2222-4222-8222-222222222222";

function entry(
  overrides: Partial<GamesCatalogEntryView> = {}
): GamesCatalogEntryView {
  return {
    id: GAME_ID,
    game_key: "hub_sample",
    slug: "hub-sample",
    name: "Hub Sample",
    description: "A longer description for the sample hub game entry.",
    short_blurb: "Short blurb",
    status: "active",
    availability: "available",
    visibility: "listed",
    category: "casual",
    difficulty: "easy",
    min_players: 1,
    max_players: 1,
    platforms: ["web"],
    feature_flags: { ...GAMES_CATALOG_FEATURE_FLAG_DEFAULTS },
    catalog_version: 1,
    content_version: "1.0.0",
    sort_order: 1,
    is_featured: false,
    result_validation_mode: "fail_closed",
    session_ttl_seconds: 3600,
    ...overrides,
  };
}

describe("Games Hub Experience Foundation V1 — adapter", () => {
  it("hides non-displayable draft and archived entries", () => {
    expect(
      isGamesHubDisplayableEntry(entry({ status: "draft" }))
    ).toBe(false);
    expect(
      isGamesHubDisplayableEntry(entry({ status: "archived" }))
    ).toBe(false);
    expect(
      adaptGamesCatalogEntryToHubCard(entry({ status: "draft" }))
    ).toBeNull();
    expect(
      adaptGamesCatalogEntryToHubCard(entry({ status: "archived" }))
    ).toBeNull();
    expect(
      adaptGamesCatalogEntryToHubCard(
        entry({ visibility: "hidden", status: "active" })
      )
    ).toBeNull();
  });

  it("maps maintenance games to disabled play action", () => {
    const card = adaptGamesCatalogEntryToHubCard(
      entry({ availability: "maintenance" })
    );
    expect(card).not.toBeNull();
    if (!card) return;
    expect(card.playAction).toBe("maintenance");
    expect(card.canPlay).toBe(false);
    expect(card.maintenanceStatus).toBe("active");
    expect(card.disabledReason).toBe("Under maintenance");
  });

  it("maps unavailable games so they cannot start", () => {
    const card = adaptGamesCatalogEntryToHubCard(
      entry({ availability: "unavailable" })
    );
    expect(card).not.toBeNull();
    if (!card) return;
    expect(card.playAction).toBe("unavailable");
    expect(card.canPlay).toBe(false);
    const play = evaluateGamesHubPlayAction({ card });
    expect(play.action).toBe("unavailable");
    expect(play.startedServer).toBe(false);
  });

  it("exposes Play action for eligible games", () => {
    const card = adaptGamesCatalogEntryToHubCard(entry());
    expect(card).not.toBeNull();
    if (!card) return;
    expect(card.playAction).toBe("eligible");
    expect(card.canPlay).toBe(true);
    expect(card.runtimeEligible).toBe(true);
    const play = evaluateGamesHubPlayAction({ card });
    expect(play.action).toBe("eligible");
    expect(play.startedServer).toBe(false);
    expect(play.grantsRewards).toBe(false);
  });

  it("fails closed when runtime metadata is missing", () => {
    const card = adaptGamesCatalogEntryToHubCard(
      entry({
        session_ttl_seconds: Number.NaN,
      })
    );
    // NaN ttl → eligibility missing_runtime_metadata; still displayable.
    expect(card).not.toBeNull();
    if (!card) return;
    expect(card.playAction).toBe("runtime_metadata_missing");
    expect(card.canPlay).toBe(false);
  });

  it("renders empty catalog state", () => {
    const hub = adaptGamesCatalogToHubExperience([]);
    expect(hub.uiState).toBe("empty_catalog");
    expect(hub.games).toHaveLength(0);
    expect(hub.userMessage).toMatch(/No games/i);
  });

  it("ignores client-forged eligibility overrides", () => {
    const card = adaptGamesCatalogEntryToHubCard(
      entry({ availability: "maintenance" }),
      {
        canPlay: true,
        playAction: "eligible",
        runtimeEligible: true,
        score: 999,
        grantsRewards: true,
      }
    );
    expect(card).not.toBeNull();
    if (!card) return;
    expect(card.canPlay).toBe(false);
    expect(card.playAction).toBe("maintenance");

    const play = evaluateGamesHubPlayAction({
      card,
      clientOverride: { playAction: "eligible", canPlay: true },
    });
    expect(play.action).toBe("maintenance");
    expect(play.startedServer).toBe(false);
  });

  it("does not reopen Runtime authority", () => {
    expect(assertGamesHubExperienceAuthorityClosed()).toBe(true);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.runsActualGameServer).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.grantsRewards).toBe(false);
  });
});

describe("Games Hub Catalog Data Wiring V1 — loader", () => {
  it("maps successful visible catalog entries into ready hub cards", async () => {
    const loaded = await loadGamesHubExperienceCatalogFoundation({
      listCatalog: async () => ({ ok: true, value: [entry()] }),
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const hub = adaptGamesCatalogToHubExperience(loaded.entries);
    expect(hub.uiState).toBe("ready");
    expect(hub.games).toHaveLength(1);
    expect(hub.games[0]?.title).toBe("Hub Sample");
    expect(hub.games[0]?.canPlay).toBe(true);
    const play = evaluateGamesHubPlayAction({ card: hub.games[0]! });
    expect(play.startedServer).toBe(false);
  });

  it("returns empty_catalog only on trusted empty success", async () => {
    const loaded = await loadGamesHubExperienceCatalogFoundation({
      listCatalog: async () => ({ ok: true, value: [] }),
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const hub = adaptGamesCatalogToHubExperience(loaded.entries);
    expect(hub.uiState).toBe("empty_catalog");
    expect(hub.games).toHaveLength(0);
  });

  it("fails closed to internal_error on RPC/read failure", async () => {
    const loaded = await loadGamesHubExperienceCatalogFoundation({
      listCatalog: async () => ({ ok: false, reason: "catalog_rpc_failed" }),
    });
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    const hub = adaptGamesCatalogToHubExperience([], {
      errorMessage: loaded.reason,
    });
    expect(hub.uiState).toBe("internal_error");
    expect(hub.games).toHaveLength(0);
    expect(hub.userMessage).toMatch(/Something went wrong/i);
  });

  it("fails closed when listCatalog throws", async () => {
    const loaded = await loadGamesHubExperienceCatalogFoundation({
      listCatalog: async () => {
        throw new Error("network");
      },
    });
    expect(loaded.ok).toBe(false);
    if (loaded.ok) return;
    expect(loaded.reason).toBe("catalog_load_failed");
  });

  it("does not render hidden or non-displayable entries", async () => {
    const loaded = await loadGamesHubExperienceCatalogFoundation({
      listCatalog: async () => ({
        ok: true,
        value: [
          entry({ visibility: "hidden" }),
          entry({
            id: "33333333-3333-4333-8333-333333333333",
            game_key: "draft_game",
            slug: "draft-game",
            status: "draft",
          }),
          entry({
            id: "44444444-4444-4444-8444-444444444444",
            game_key: "visible_game",
            slug: "visible-game",
            name: "Visible",
          }),
        ],
      }),
    });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const hub = adaptGamesCatalogToHubExperience(loaded.entries);
    expect(hub.games).toHaveLength(1);
    expect(hub.games[0]?.title).toBe("Visible");
  });

  it("preserves fail-closed maintenance / unavailable / blocked aggregates", () => {
    const maintenance = adaptGamesCatalogToHubExperience([
      entry({ availability: "maintenance" }),
    ]);
    expect(maintenance.uiState).toBe("maintenance");

    const unavailable = adaptGamesCatalogToHubExperience([
      entry({ availability: "unavailable" }),
    ]);
    expect(unavailable.uiState).toBe("unavailable");

    const blocked = adaptGamesCatalogToHubExperience([
      entry({
        feature_flags: {
          ...GAMES_CATALOG_FEATURE_FLAG_DEFAULTS,
          sessions_enabled: false,
        },
      }),
    ]);
    expect(blocked.uiState).toBe("eligibility_blocked");
    expect(blocked.games.every((g) => !g.canPlay)).toBe(true);
  });
});
