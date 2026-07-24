import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GAMES_PUBLIC_RPCS } from "./gamesFoundation";
import {
  getMyGameAchievementsTrusted,
  parseGamesMyAchievementEntry,
  parseGamesMyAchievementsResponse,
  validateGameAchievementsGameId,
  type GamesMyAchievementsView,
} from "./gamesAchievements";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MODULE = join(ROOT, "lib/games/gamesAchievements.ts");
const HUB_RUNTIME = join(ROOT, "lib/games/gamesHubRuntime.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const SAMPLE_GAME_ID = "22222222-2222-4222-8222-222222222222";
const SAMPLE_ACHIEVEMENT_ID_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SAMPLE_ACHIEVEMENT_ID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function sampleEntry(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    achievement_id: SAMPLE_ACHIEVEMENT_ID_A,
    achievement_key: "first_win",
    name: "First Win",
    description: "Complete one accepted result",
    unlocked_at: "2026-07-24T10:00:00.000Z",
    ...overrides,
  };
}

function sampleAchievements(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    game_id: SAMPLE_GAME_ID,
    achievements: [sampleEntry()],
    ...overrides,
  };
}

/** Exact SQL empty-list when caller has no unlocks for the game. */
function sampleEmptyList(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    game_id: SAMPLE_GAME_ID,
    achievements: [],
    ...overrides,
  };
}

describe("Games Achievements Lookup Trusted V1 — validators", () => {
  it("validateGameAchievementsGameId accepts UUID and rejects malformed", () => {
    expect(validateGameAchievementsGameId(SAMPLE_GAME_ID).ok).toBe(true);
    expect(validateGameAchievementsGameId("not-a-uuid").ok).toBe(false);
    expect(validateGameAchievementsGameId("").ok).toBe(false);
    expect(validateGameAchievementsGameId(null).ok).toBe(false);
    expect(validateGameAchievementsGameId(undefined).ok).toBe(false);
    const bad = validateGameAchievementsGameId(
      "22222222-2222-1222-1222-222222222222"
    );
    // version nibble must be 1-5; variant nibble must be 8|9|a|b
    expect(bad.ok).toBe(false);
  });

  it("parseGamesMyAchievementsResponse accepts exact owner unlock metadata", () => {
    const r = parseGamesMyAchievementsResponse(sampleAchievements());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.game_id).toBe(SAMPLE_GAME_ID);
    expect(r.value.achievements).toHaveLength(1);
    expect(r.value.achievements[0]?.achievement_key).toBe("first_win");
    expect(r.value.achievements[0]?.unlocked_at).toBe(
      "2026-07-24T10:00:00.000Z"
    );
  });

  it("parseGamesMyAchievementsResponse accepts SQL empty achievements array", () => {
    const r = parseGamesMyAchievementsResponse(sampleEmptyList());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      game_id: SAMPLE_GAME_ID,
      achievements: [],
    });
  });

  it("parseGamesMyAchievementsResponse accepts multiple bounded entries", () => {
    const r = parseGamesMyAchievementsResponse(
      sampleAchievements({
        achievements: [
          sampleEntry({
            achievement_id: SAMPLE_ACHIEVEMENT_ID_A,
            achievement_key: "first_win",
            unlocked_at: "2026-07-24T12:00:00.000Z",
          }),
          sampleEntry({
            achievement_id: SAMPLE_ACHIEVEMENT_ID_B,
            achievement_key: "score_100",
            name: "Century",
            description: null,
            unlocked_at: "2026-07-24T11:00:00.000Z",
          }),
        ],
      })
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.achievements).toHaveLength(2);
    expect(r.value.achievements[0]?.achievement_id).toBe(
      SAMPLE_ACHIEVEMENT_ID_A
    );
    expect(r.value.achievements[1]?.description).toBeNull();
  });

  it("rejects unknown fields and unsupported value shapes", () => {
    const unknownTop = parseGamesMyAchievementsResponse(
      sampleAchievements({ reward_entitled: true })
    );
    expect(unknownTop.ok).toBe(false);
    if (unknownTop.ok) return;
    expect(unknownTop.reason).toBe("achievements_unknown_field");

    const unknownEntry = parseGamesMyAchievementEntry(
      sampleEntry({ source_session_id: SAMPLE_GAME_ID })
    );
    expect(unknownEntry.ok).toBe(false);
    if (unknownEntry.ok) return;
    expect(unknownEntry.reason).toBe("achievement_entry_unknown_field");

    const badKey = parseGamesMyAchievementEntry(
      sampleEntry({ achievement_key: "" })
    );
    expect(badKey.ok).toBe(false);
    if (badKey.ok) return;
    expect(badKey.reason).toBe("achievement_key_invalid");

    const badDesc = parseGamesMyAchievementEntry(
      sampleEntry({ description: 42 })
    );
    expect(badDesc.ok).toBe(false);
    if (badDesc.ok) return;
    expect(badDesc.reason).toBe("achievement_description_invalid");
  });

  it("rejects invalid returned UUID and timestamp on entries", () => {
    const badId = parseGamesMyAchievementEntry(
      sampleEntry({ achievement_id: "not-a-uuid" })
    );
    expect(badId.ok).toBe(false);
    if (badId.ok) return;
    expect(badId.reason).toBe("achievement_id_invalid");

    const badTs = parseGamesMyAchievementEntry(
      sampleEntry({ unlocked_at: "" })
    );
    expect(badTs.ok).toBe(false);
    if (badTs.ok) return;
    expect(badTs.reason).toBe("unlocked_at_invalid");

    const nullTs = parseGamesMyAchievementEntry(
      sampleEntry({ unlocked_at: null })
    );
    expect(nullTs.ok).toBe(false);
    if (nullTs.ok) return;
    expect(nullTs.reason).toBe("unlocked_at_invalid");
  });
});

describe("Games Achievements Lookup Trusted V1", () => {
  it("getMyGameAchievementsTrusted succeeds with bounded owner unlocks", async () => {
    const r = await getMyGameAchievementsTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_PUBLIC_RPCS.getMyAchievements);
          expect(fn).toBe("get_my_game_achievements");
          expect(args).toEqual({ p_game_id: SAMPLE_GAME_ID });
          return { data: sampleAchievements(), error: null };
        },
      },
      SAMPLE_GAME_ID
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const view: GamesMyAchievementsView = r.value;
    expect(view.game_id).toBe(SAMPLE_GAME_ID);
    expect(view.achievements).toHaveLength(1);
    // Bounded return model — no Catalog / playability / reward / economy flags.
    expect(Object.keys(view).sort()).toEqual(["achievements", "game_id"]);
    expect(Object.keys(view.achievements[0]!).sort()).toEqual(
      [
        "achievement_id",
        "achievement_key",
        "description",
        "name",
        "unlocked_at",
      ].sort()
    );
    expect(view).not.toHaveProperty("platformSessionId");
    expect(view).not.toHaveProperty("catalog_exists");
    expect(view).not.toHaveProperty("playable");
    expect(view).not.toHaveProperty("runtime_eligible");
    expect(view).not.toHaveProperty("reward_entitled");
    expect(view).not.toHaveProperty("wallet_credit");
  });

  it("preserves SQL empty achievements array as success", async () => {
    const r = await getMyGameAchievementsTrusted(
      {
        rpc: async () => ({ data: sampleEmptyList(), error: null }),
      },
      SAMPLE_GAME_ID
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.achievements).toEqual([]);
    // Empty list must not invent Catalog / playability / reward authority.
    expect(r.value).not.toHaveProperty("game_exists");
    expect(r.value).not.toHaveProperty("visible");
    expect(r.value).not.toHaveProperty("reward_entitled");
  });

  it("succeeds with multiple bounded achievement entries", async () => {
    const payload = sampleAchievements({
      achievements: [
        sampleEntry({
          achievement_id: SAMPLE_ACHIEVEMENT_ID_A,
          achievement_key: "first_win",
        }),
        sampleEntry({
          achievement_id: SAMPLE_ACHIEVEMENT_ID_B,
          achievement_key: "score_100",
          name: "Century",
          description: null,
        }),
      ],
    });
    const r = await getMyGameAchievementsTrusted(
      { rpc: async () => ({ data: payload, error: null }) },
      SAMPLE_GAME_ID
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.achievements).toHaveLength(2);
    expect(r.value.achievements[1]?.description).toBeNull();
  });

  it("rejects invalid game UUID before RPC", async () => {
    let called = false;
    const r = await getMyGameAchievementsTrusted(
      {
        rpc: async () => {
          called = true;
          return { data: null, error: null };
        },
      },
      "not-a-uuid"
    );
    expect(called).toBe(false);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("game_id_invalid");
  });

  it("maps unauthenticated / denied RPC errors to achievements_rpc_failed", async () => {
    for (const message of [
      "Authentication required",
      "game_id is required",
      "permission denied",
    ]) {
      const r = await getMyGameAchievementsTrusted(
        {
          rpc: async () => ({
            data: null,
            error: { message },
          }),
        },
        SAMPLE_GAME_ID
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.reason).toBe("achievements_rpc_failed");
    }
  });

  it("fails closed on RPC error and thrown client exception", async () => {
    const failed = await getMyGameAchievementsTrusted(
      { rpc: async () => ({ data: null, error: { message: "boom" } }) },
      SAMPLE_GAME_ID
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.reason).toBe("achievements_rpc_failed");

    const thrown = await getMyGameAchievementsTrusted(
      {
        rpc: async () => {
          throw new Error("network");
        },
      },
      SAMPLE_GAME_ID
    );
    expect(thrown.ok).toBe(false);
    if (thrown.ok) return;
    expect(thrown.reason).toBe("achievements_rpc_failed");
  });

  it("rejects null, malformed top-level, and malformed achievement entries", async () => {
    const nullData = await getMyGameAchievementsTrusted(
      { rpc: async () => ({ data: null, error: null }) },
      SAMPLE_GAME_ID
    );
    expect(nullData.ok).toBe(false);
    if (nullData.ok) return;
    expect(nullData.reason).toBe("achievements_response_invalid");

    const unknownField = await getMyGameAchievementsTrusted(
      {
        rpc: async () => ({
          data: sampleAchievements({ playable: true }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(unknownField.ok).toBe(false);
    if (unknownField.ok) return;
    expect(unknownField.reason).toBe("achievements_response_invalid");

    const malformedEntry = await getMyGameAchievementsTrusted(
      {
        rpc: async () => ({
          data: sampleAchievements({
            achievements: [sampleEntry({ achievement_id: "bad" })],
          }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(malformedEntry.ok).toBe(false);
    if (malformedEntry.ok) return;
    expect(malformedEntry.reason).toBe("achievements_response_invalid");

    const badTimestamp = await getMyGameAchievementsTrusted(
      {
        rpc: async () => ({
          data: sampleAchievements({
            achievements: [sampleEntry({ unlocked_at: null })],
          }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(badTimestamp.ok).toBe(false);
    if (badTimestamp.ok) return;
    expect(badTimestamp.reason).toBe("achievements_response_invalid");
  });

  it("lookup module path uses only authenticated RPC registry (no service-role / table)", () => {
    const src = read(MODULE);
    expect(src).toMatch(/getMyGameAchievementsTrusted/);
    expect(src).toMatch(/GAMES_PUBLIC_RPCS\.getMyAchievements/);
    expect(src).toMatch(/parseGamesMyAchievementsResponse/);
    expect(src).toMatch(/validateGameAchievementsGameId/);
    expect(src).not.toMatch(/createServiceRole|service_role|serviceRole/i);
    expect(src).not.toMatch(/\.from\(\s*['"]game_player_achievements['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]game_achievements['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]games['"]\s*\)/);
    expect(src).not.toMatch(/start_game_session|submit_game_session_result/);
    expect(src).not.toMatch(/platformSessionId/);
    expect(src).not.toMatch(/getCatalog|getMyCatalog|listCatalog/i);
    expect(src).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/);
    expect(src).not.toMatch(/unlock_game_achievement|grant_achievement/i);
  });

  it("does not open Hub Runtime authority or populate platformSessionId", () => {
    const hub = read(HUB_RUNTIME);
    expect(hub).toMatch(/platformSessionId:\s*null/);
    expect(hub).not.toMatch(/getMyGameAchievementsTrusted/);
    expect(hub).not.toMatch(/get_my_game_achievements/);
  });

  it("does not infer Catalog / playability / reward / economy from achievements", () => {
    const src = read(MODULE);
    expect(src).toMatch(/Unlock metadata only/);
    expect(src).toMatch(/does not imply Catalog existence/);
    expect(src).not.toMatch(/reward_entitled|wallet_credit|economy_credit/);
    expect(src).not.toMatch(/runtime_eligible|can_play|is_playable/);
  });
});
