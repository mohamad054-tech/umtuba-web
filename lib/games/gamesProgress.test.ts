import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GAMES_PUBLIC_RPCS } from "./gamesFoundation";
import {
  getMyGameProgressTrusted,
  parseGamesMyProgressResponse,
  validateGameProgressGameId,
  type GamesMyProgressView,
} from "./gamesProgress";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MODULE = join(ROOT, "lib/games/gamesProgress.ts");
const HUB_RUNTIME = join(ROOT, "lib/games/gamesHubRuntime.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const SAMPLE_GAME_ID = "22222222-2222-4222-8222-222222222222";

function sampleProgress(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    game_id: SAMPLE_GAME_ID,
    play_count: 3,
    accepted_result_count: 2,
    best_score: 42.5,
    current_level: 4,
    experience_value: 120,
    last_played_at: "2026-07-24T10:00:00.000Z",
    ...overrides,
  };
}

/** Exact SQL empty-default when no `game_player_progress` row exists. */
function sampleEmptyDefault(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    game_id: SAMPLE_GAME_ID,
    play_count: 0,
    accepted_result_count: 0,
    best_score: null,
    current_level: 0,
    experience_value: 0,
    last_played_at: null,
    ...overrides,
  };
}

describe("Games Progress Lookup Trusted V1 — validators", () => {
  it("validateGameProgressGameId accepts UUID and rejects malformed", () => {
    expect(validateGameProgressGameId(SAMPLE_GAME_ID).ok).toBe(true);
    expect(validateGameProgressGameId("not-a-uuid").ok).toBe(false);
    expect(validateGameProgressGameId("").ok).toBe(false);
    expect(validateGameProgressGameId(null).ok).toBe(false);
    expect(validateGameProgressGameId(undefined).ok).toBe(false);
    const bad = validateGameProgressGameId(
      "22222222-2222-1222-1222-222222222222"
    );
    // version nibble must be 1-5; variant nibble must be 8|9|a|b
    expect(bad.ok).toBe(false);
  });

  it("parseGamesMyProgressResponse accepts exact owner metadata", () => {
    const r = parseGamesMyProgressResponse(sampleProgress());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.game_id).toBe(SAMPLE_GAME_ID);
    expect(r.value.play_count).toBe(3);
    expect(r.value.best_score).toBe(42.5);
    expect(r.value.last_played_at).toBe("2026-07-24T10:00:00.000Z");
  });

  it("parseGamesMyProgressResponse accepts SQL empty-default shape", () => {
    const r = parseGamesMyProgressResponse(sampleEmptyDefault());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      game_id: SAMPLE_GAME_ID,
      play_count: 0,
      accepted_result_count: 0,
      best_score: null,
      current_level: 0,
      experience_value: 0,
      last_played_at: null,
    });
  });

  it("rejects unknown fields and unsupported value shapes", () => {
    const unknownTop = parseGamesMyProgressResponse(
      sampleProgress({ catalog_exists: true })
    );
    expect(unknownTop.ok).toBe(false);
    if (unknownTop.ok) return;
    expect(unknownTop.reason).toBe("progress_unknown_field");

    const badPlayCount = parseGamesMyProgressResponse(
      sampleProgress({ play_count: -1 })
    );
    expect(badPlayCount.ok).toBe(false);
    if (badPlayCount.ok) return;
    expect(badPlayCount.reason).toBe("play_count_invalid");

    const badLevel = parseGamesMyProgressResponse(
      sampleProgress({ current_level: 1.5 })
    );
    expect(badLevel.ok).toBe(false);
    if (badLevel.ok) return;
    expect(badLevel.reason).toBe("current_level_invalid");

    const badScore = parseGamesMyProgressResponse(
      sampleProgress({ best_score: "high" })
    );
    expect(badScore.ok).toBe(false);
    if (badScore.ok) return;
    expect(badScore.reason).toBe("best_score_invalid");
  });
});

describe("Games Progress Lookup Trusted V1", () => {
  it("getMyGameProgressTrusted succeeds with bounded owner metadata", async () => {
    const r = await getMyGameProgressTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_PUBLIC_RPCS.getMyProgress);
          expect(fn).toBe("get_my_game_progress");
          expect(args).toEqual({ p_game_id: SAMPLE_GAME_ID });
          return { data: sampleProgress(), error: null };
        },
      },
      SAMPLE_GAME_ID
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const view: GamesMyProgressView = r.value;
    expect(view.game_id).toBe(SAMPLE_GAME_ID);
    expect(view.accepted_result_count).toBe(2);
    // Bounded return model — no Catalog / playability / reward / economy flags.
    expect(Object.keys(view).sort()).toEqual(
      [
        "game_id",
        "play_count",
        "accepted_result_count",
        "best_score",
        "current_level",
        "experience_value",
        "last_played_at",
      ].sort()
    );
    expect(view).not.toHaveProperty("platformSessionId");
    expect(view).not.toHaveProperty("catalog_exists");
    expect(view).not.toHaveProperty("playable");
    expect(view).not.toHaveProperty("runtime_eligible");
    expect(view).not.toHaveProperty("reward_entitled");
    expect(view).not.toHaveProperty("wallet_credit");
  });

  it("preserves SQL empty/default progress response as success", async () => {
    const r = await getMyGameProgressTrusted(
      {
        rpc: async () => ({ data: sampleEmptyDefault(), error: null }),
      },
      SAMPLE_GAME_ID
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.play_count).toBe(0);
    expect(r.value.best_score).toBeNull();
    expect(r.value.last_played_at).toBeNull();
    // Empty-default must not invent Catalog / playability authority.
    expect(r.value).not.toHaveProperty("game_exists");
    expect(r.value).not.toHaveProperty("visible");
  });

  it("rejects invalid game UUID before RPC", async () => {
    let called = false;
    const r = await getMyGameProgressTrusted(
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

  it("maps unauthenticated / denied RPC errors to progress_rpc_failed", async () => {
    for (const message of [
      "Authentication required",
      "game_id is required",
      "permission denied",
    ]) {
      const r = await getMyGameProgressTrusted(
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
      expect(r.reason).toBe("progress_rpc_failed");
    }
  });

  it("fails closed on RPC error and thrown client exception", async () => {
    const failed = await getMyGameProgressTrusted(
      { rpc: async () => ({ data: null, error: { message: "boom" } }) },
      SAMPLE_GAME_ID
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.reason).toBe("progress_rpc_failed");

    const thrown = await getMyGameProgressTrusted(
      {
        rpc: async () => {
          throw new Error("network");
        },
      },
      SAMPLE_GAME_ID
    );
    expect(thrown.ok).toBe(false);
    if (thrown.ok) return;
    expect(thrown.reason).toBe("progress_rpc_failed");
  });

  it("rejects null, malformed, and unsupported value responses", async () => {
    const nullData = await getMyGameProgressTrusted(
      { rpc: async () => ({ data: null, error: null }) },
      SAMPLE_GAME_ID
    );
    expect(nullData.ok).toBe(false);
    if (nullData.ok) return;
    expect(nullData.reason).toBe("progress_response_invalid");

    const malformed = await getMyGameProgressTrusted(
      {
        rpc: async () => ({
          data: sampleProgress({ playable: true }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(malformed.ok).toBe(false);
    if (malformed.ok) return;
    expect(malformed.reason).toBe("progress_response_invalid");

    const badValue = await getMyGameProgressTrusted(
      {
        rpc: async () => ({
          data: sampleProgress({ experience_value: -5 }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(badValue.ok).toBe(false);
    if (badValue.ok) return;
    expect(badValue.reason).toBe("progress_response_invalid");
  });

  it("lookup module path uses only authenticated RPC registry (no service-role / table)", () => {
    const src = read(MODULE);
    expect(src).toMatch(/getMyGameProgressTrusted/);
    expect(src).toMatch(/GAMES_PUBLIC_RPCS\.getMyProgress/);
    expect(src).toMatch(/parseGamesMyProgressResponse/);
    expect(src).toMatch(/validateGameProgressGameId/);
    expect(src).not.toMatch(/createServiceRole|service_role|serviceRole/i);
    expect(src).not.toMatch(/\.from\(\s*['"]game_player_progress['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]games['"]\s*\)/);
    expect(src).not.toMatch(/start_game_session|submit_game_session_result/);
    expect(src).not.toMatch(/platformSessionId/);
    expect(src).not.toMatch(/getCatalog|getMyCatalog|listCatalog/i);
  });

  it("does not open Hub Runtime authority or populate platformSessionId", () => {
    const hub = read(HUB_RUNTIME);
    expect(hub).toMatch(/platformSessionId:\s*null/);
    expect(hub).not.toMatch(/getMyGameProgressTrusted/);
    expect(hub).not.toMatch(/get_my_game_progress/);
  });

  it("does not infer Catalog / playability / reward / economy from progress", () => {
    const src = read(MODULE);
    expect(src).toMatch(/Progress metadata only/);
    expect(src).toMatch(/does not imply Catalog existence/);
    expect(src).not.toMatch(/reward_entitled|wallet_credit|economy_credit/);
    expect(src).not.toMatch(/runtime_eligible|can_play|is_playable/);
  });
});
