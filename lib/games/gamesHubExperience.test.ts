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
