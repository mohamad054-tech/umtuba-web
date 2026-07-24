import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GAMES_PUBLIC_RPCS } from "./gamesFoundation";
import {
  parseGamesMySessionStartResponse,
  startMyGameSessionTrusted,
  validateGameSessionStartGameId,
  type GamesMySessionStartView,
} from "./gamesSessionStart";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MODULE = join(ROOT, "lib/games/gamesSessionStart.ts");
const HUB_RUNTIME = join(ROOT, "lib/games/gamesHubRuntime.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const SAMPLE_SESSION_ID = "11111111-1111-4111-8111-111111111111";
const SAMPLE_GAME_ID = "22222222-2222-4222-8222-222222222222";

function sampleStart(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    session_id: SAMPLE_SESSION_ID,
    game_id: SAMPLE_GAME_ID,
    status: "active",
    started_at: "2026-07-24T10:00:00.000Z",
    expires_at: "2026-07-24T11:00:00.000Z",
    resumed: false,
    ...overrides,
  };
}

describe("Games Session Start Trusted V1 — validators", () => {
  it("validateGameSessionStartGameId accepts UUID and rejects malformed", () => {
    expect(validateGameSessionStartGameId(SAMPLE_GAME_ID).ok).toBe(true);
    expect(validateGameSessionStartGameId("not-a-uuid").ok).toBe(false);
    expect(validateGameSessionStartGameId("").ok).toBe(false);
    expect(validateGameSessionStartGameId(null).ok).toBe(false);
    expect(validateGameSessionStartGameId(undefined).ok).toBe(false);
    const bad = validateGameSessionStartGameId(
      "22222222-2222-2222-2222-222222222222"
    );
    // version nibble must be 1-5
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe("game_id_invalid");
  });

  it("parseGamesMySessionStartResponse accepts create and resume payloads", () => {
    const created = parseGamesMySessionStartResponse(
      sampleStart({ resumed: false })
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.resumed).toBe(false);
    expect(created.value.status).toBe("active");

    const resumed = parseGamesMySessionStartResponse(
      sampleStart({ resumed: true })
    );
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    expect(resumed.value.resumed).toBe(true);
  });

  it("parseGamesMySessionStartResponse rejects unknown fields and bad shapes", () => {
    const unknown = parseGamesMySessionStartResponse(
      sampleStart({ platformSessionId: "x" })
    );
    expect(unknown.ok).toBe(false);
    if (unknown.ok) return;
    expect(unknown.reason).toBe("session_start_unknown_field");

    const badStatus = parseGamesMySessionStartResponse(
      sampleStart({ status: "submitted" })
    );
    expect(badStatus.ok).toBe(false);
    if (badStatus.ok) return;
    expect(badStatus.reason).toBe("session_status_invalid");

    const badResumed = parseGamesMySessionStartResponse(
      sampleStart({ resumed: "yes" })
    );
    expect(badResumed.ok).toBe(false);
    if (badResumed.ok) return;
    expect(badResumed.reason).toBe("resumed_invalid");

    const badTs = parseGamesMySessionStartResponse(
      sampleStart({ started_at: "" })
    );
    expect(badTs.ok).toBe(false);
    if (badTs.ok) return;
    expect(badTs.reason).toBe("started_at_invalid");

    const badUuid = parseGamesMySessionStartResponse(
      sampleStart({ session_id: "not-a-uuid" })
    );
    expect(badUuid.ok).toBe(false);
    if (badUuid.ok) return;
    expect(badUuid.reason).toBe("session_id_invalid");

    const notObj = parseGamesMySessionStartResponse(null);
    expect(notObj.ok).toBe(false);
    if (notObj.ok) return;
    expect(notObj.reason).toBe("session_start_not_object");
  });
});

describe("Games Session Start Trusted V1", () => {
  it("startMyGameSessionTrusted succeeds for new session creation (resumed: false)", async () => {
    const r = await startMyGameSessionTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_PUBLIC_RPCS.startSession);
          expect(fn).toBe("start_game_session");
          expect(args).toEqual({ p_game_id: SAMPLE_GAME_ID });
          return { data: sampleStart({ resumed: false }), error: null };
        },
      },
      SAMPLE_GAME_ID
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const view: GamesMySessionStartView = r.value;
    expect(view.session_id).toBe(SAMPLE_SESSION_ID);
    expect(view.game_id).toBe(SAMPLE_GAME_ID);
    expect(view.status).toBe("active");
    expect(view.resumed).toBe(false);
    expect(Object.keys(view).sort()).toEqual(
      [
        "session_id",
        "game_id",
        "status",
        "started_at",
        "expires_at",
        "resumed",
      ].sort()
    );
    expect(view).not.toHaveProperty("platformSessionId");
    expect(view).not.toHaveProperty("runtime_eligible");
    expect(view).not.toHaveProperty("can_submit");
    expect(view).not.toHaveProperty("can_play");
    expect(view).not.toHaveProperty("awarded_points");
  });

  it("startMyGameSessionTrusted succeeds for existing-session resume (resumed: true)", async () => {
    const r = await startMyGameSessionTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_PUBLIC_RPCS.startSession);
          expect(args).toEqual({ p_game_id: SAMPLE_GAME_ID });
          return { data: sampleStart({ resumed: true }), error: null };
        },
      },
      SAMPLE_GAME_ID
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resumed).toBe(true);
    expect(r.value.status).toBe("active");
  });

  it("rejects invalid game UUID before RPC", async () => {
    let called = false;
    const r = await startMyGameSessionTrusted(
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

  it("maps unauthenticated and Catalog denials to session_start_rpc_failed", async () => {
    for (const message of [
      "Authentication required",
      "Game not available",
      "Game sessions disabled",
    ]) {
      const r = await startMyGameSessionTrusted(
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
      expect(r.reason).toBe("session_start_rpc_failed");
    }
  });

  it("fails closed on RPC error and thrown client exception", async () => {
    const failed = await startMyGameSessionTrusted(
      { rpc: async () => ({ data: null, error: { message: "boom" } }) },
      SAMPLE_GAME_ID
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.reason).toBe("session_start_rpc_failed");

    const thrown = await startMyGameSessionTrusted(
      {
        rpc: async () => {
          throw new Error("network");
        },
      },
      SAMPLE_GAME_ID
    );
    expect(thrown.ok).toBe(false);
    if (thrown.ok) return;
    expect(thrown.reason).toBe("session_start_rpc_failed");
  });

  it("rejects null, malformed, unknown-field, and invalid field responses", async () => {
    const nullData = await startMyGameSessionTrusted(
      { rpc: async () => ({ data: null, error: null }) },
      SAMPLE_GAME_ID
    );
    expect(nullData.ok).toBe(false);
    if (nullData.ok) return;
    expect(nullData.reason).toBe("session_start_response_invalid");

    const malformed = await startMyGameSessionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ can_play: true }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(malformed.ok).toBe(false);
    if (malformed.ok) return;
    expect(malformed.reason).toBe("session_start_response_invalid");

    const badStatus = await startMyGameSessionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ status: "running" }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(badStatus.ok).toBe(false);
    if (badStatus.ok) return;
    expect(badStatus.reason).toBe("session_start_response_invalid");

    const badResumed = await startMyGameSessionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ resumed: 1 }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(badResumed.ok).toBe(false);
    if (badResumed.ok) return;
    expect(badResumed.reason).toBe("session_start_response_invalid");

    const badTs = await startMyGameSessionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ expires_at: "   " }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(badTs.ok).toBe(false);
    if (badTs.ok) return;
    expect(badTs.reason).toBe("session_start_response_invalid");

    const badUuid = await startMyGameSessionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ game_id: "bad" }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(badUuid.ok).toBe(false);
    if (badUuid.ok) return;
    expect(badUuid.reason).toBe("session_start_response_invalid");
  });

  it("enforces exact bounded return model (six keys only)", async () => {
    const r = await startMyGameSessionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ resumed: false }),
          error: null,
        }),
      },
      SAMPLE_GAME_ID
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.value).sort()).toEqual(
      [
        "expires_at",
        "game_id",
        "resumed",
        "session_id",
        "started_at",
        "status",
      ].sort()
    );
    expect(r.value).not.toHaveProperty("platformSessionId");
    expect(r.value).not.toHaveProperty("runtime_eligible");
    expect(r.value).not.toHaveProperty("can_submit");
    expect(r.value).not.toHaveProperty("can_play");
    expect(r.value).not.toHaveProperty("awarded_points");
    expect(r.value).not.toHaveProperty("result");
  });

  it("start module uses authenticated RPC only (no service-role / table write)", () => {
    const src = read(MODULE);
    expect(src).toMatch(/startMyGameSessionTrusted/);
    expect(src).toMatch(/GAMES_PUBLIC_RPCS\.startSession/);
    expect(src).toMatch(/start_game_session/);
    expect(src).toMatch(/p_game_id/);
    expect(src).toMatch(/parseGamesMySessionStartResponse/);
    expect(src).toMatch(/validateGameSessionStartGameId/);
    expect(src).not.toMatch(/createServiceRole|service_role|serviceRole/i);
    expect(src).not.toMatch(/\.from\(\s*['"]game_sessions['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]game_player_profiles['"]\s*\)/);
    expect(src).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/);
    expect(src).not.toMatch(/isCatalogPlayable\s*\(/);
    expect(src).not.toMatch(/submit_game_session_result/);
  });

  it("does not import or call isCatalogPlayable", () => {
    const src = read(MODULE);
    expect(src).toMatch(/does not call `isCatalogPlayable`/);
    expect(src).not.toMatch(/isCatalogPlayable\s*\(/);
    expect(src).not.toMatch(/import\s*\{[^}]*isCatalogPlayable/);
    expect(src).not.toMatch(/from\s+["'].*gamesCatalog/);
  });

  it("does not open Hub Runtime authority or populate platformSessionId", () => {
    const src = read(MODULE);
    const hub = read(HUB_RUNTIME);
    expect(src).toMatch(/Does not populate Hub Runtime `platformSessionId`/);
    expect(src).not.toMatch(/platformSessionId\s*[:=]/);
    expect(hub).toMatch(/platformSessionId:\s*null/);
    expect(hub).not.toMatch(/startMyGameSessionTrusted/);
    expect(hub).not.toMatch(/start_game_session/);
  });

  it("does not treat start metadata as submit or reward authority", () => {
    const src = read(MODULE);
    expect(src).toMatch(/permission to submit a result/);
    expect(src).toMatch(/reward/);
    expect(src).not.toMatch(/can_submit\s*[:=]\s*true/);
    expect(src).not.toMatch(/awarded_points|wallet_credit|economy_credit/);
    expect(src).not.toMatch(/submit_game_session_result/);
  });
});