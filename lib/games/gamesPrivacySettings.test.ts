import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { GAMES_PUBLIC_RPCS } from "./gamesFoundation";
import {
  getMyGamePrivacySettingsTrusted,
  parseGamesMyPrivacySettingsResponse,
  updateMyGamePrivacySettingsTrusted,
  validateGamesMyPrivacySettingsPatch,
  type GamesMyPrivacySettingsView,
} from "./gamesPrivacySettings";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MODULE = join(ROOT, "lib/games/gamesPrivacySettings.ts");
const LOOKUP_DOCS = join(
  ROOT,
  "docs/games/implementation/GAMES_PRIVACY_SETTINGS_LOOKUP_TRUSTED_V1.md"
);
const UPDATE_DOCS = join(
  ROOT,
  "docs/games/implementation/GAMES_PRIVACY_SETTINGS_UPDATE_TRUSTED_V1.md"
);
const FOUNDATION_SQL = join(
  ROOT,
  "supabase/migrations/20260846_games_platform_foundation_v1.sql"
);
const HUB_RUNTIME = join(ROOT, "lib/games/gamesHubRuntime.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/** Exact SQL default-all-false privacy preference object. */
function samplePrivacyDefaults(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    share_achievements: false,
    share_best_score: false,
    share_level_or_progress: false,
    share_activity: false,
    ...overrides,
  };
}

/** Mixed boolean preferences within the exact SQL response shape. */
function samplePrivacyMixed(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    share_achievements: true,
    share_best_score: false,
    share_level_or_progress: true,
    share_activity: false,
    ...overrides,
  };
}

describe("Games Privacy Settings Lookup Trusted V1 — parser", () => {
  it("parseGamesMyPrivacySettingsResponse accepts all-false defaults", () => {
    const r = parseGamesMyPrivacySettingsResponse(samplePrivacyDefaults());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      share_achievements: false,
      share_best_score: false,
      share_level_or_progress: false,
      share_activity: false,
    });
  });

  it("parseGamesMyPrivacySettingsResponse accepts mixed boolean preferences", () => {
    const r = parseGamesMyPrivacySettingsResponse(samplePrivacyMixed());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.share_achievements).toBe(true);
    expect(r.value.share_best_score).toBe(false);
    expect(r.value.share_level_or_progress).toBe(true);
    expect(r.value.share_activity).toBe(false);
  });

  it("rejects unknown fields and non-boolean values", () => {
    const unknownTop = parseGamesMyPrivacySettingsResponse(
      samplePrivacyDefaults({ public_profile: true })
    );
    expect(unknownTop.ok).toBe(false);
    if (unknownTop.ok) return;
    expect(unknownTop.reason).toBe("privacy_unknown_field");

    const notObject = parseGamesMyPrivacySettingsResponse(null);
    expect(notObject.ok).toBe(false);
    if (notObject.ok) return;
    expect(notObject.reason).toBe("privacy_not_object");

    const badBool = parseGamesMyPrivacySettingsResponse(
      samplePrivacyDefaults({ share_achievements: "true" })
    );
    expect(badBool.ok).toBe(false);
    if (badBool.ok) return;
    expect(badBool.reason).toBe("share_achievements_invalid");

    const nullField = parseGamesMyPrivacySettingsResponse(
      samplePrivacyDefaults({ share_activity: null })
    );
    expect(nullField.ok).toBe(false);
    if (nullField.ok) return;
    expect(nullField.reason).toBe("share_activity_invalid");
  });
});

describe("Games Privacy Settings Lookup Trusted V1", () => {
  it("getMyGamePrivacySettingsTrusted succeeds with all-false defaults", async () => {
    const r = await getMyGamePrivacySettingsTrusted({
      rpc: async (fn, args) => {
        expect(fn).toBe(GAMES_PUBLIC_RPCS.getMyPrivacy);
        expect(fn).toBe("get_my_game_privacy_settings");
        expect(args).toBeUndefined();
        return { data: samplePrivacyDefaults(), error: null };
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const view: GamesMyPrivacySettingsView = r.value;
    expect(view).toEqual({
      share_achievements: false,
      share_best_score: false,
      share_level_or_progress: false,
      share_activity: false,
    });
    // Exact bounded return shape — preference metadata only.
    expect(Object.keys(view).sort()).toEqual(
      [
        "share_achievements",
        "share_activity",
        "share_best_score",
        "share_level_or_progress",
      ].sort()
    );
    expect(view).not.toHaveProperty("user_id");
    expect(view).not.toHaveProperty("created_at");
    expect(view).not.toHaveProperty("updated_at");
    expect(view).not.toHaveProperty("public_sharing_active");
    expect(view).not.toHaveProperty("leaderboard_exists");
    expect(view).not.toHaveProperty("hub_exposed");
    expect(view).not.toHaveProperty("reward_entitled");
    expect(view).not.toHaveProperty("catalog_exists");
    expect(view).not.toHaveProperty("playable");
  });

  it("succeeds with mixed boolean preferences", async () => {
    const r = await getMyGamePrivacySettingsTrusted({
      rpc: async () => ({ data: samplePrivacyMixed(), error: null }),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.share_achievements).toBe(true);
    expect(r.value.share_best_score).toBe(false);
    expect(r.value.share_level_or_progress).toBe(true);
    expect(r.value.share_activity).toBe(false);
    // True flags must not invent public-sharing / Hub / reward authority.
    expect(r.value).not.toHaveProperty("public_sharing_active");
    expect(r.value).not.toHaveProperty("feed_visible");
    expect(r.value).not.toHaveProperty("reward_entitled");
  });

  it("maps unauthenticated / denied RPC errors to privacy_rpc_failed", async () => {
    for (const message of [
      "Authentication required",
      "permission denied",
      "JWT expired",
    ]) {
      const r = await getMyGamePrivacySettingsTrusted({
        rpc: async () => ({
          data: null,
          error: { message },
        }),
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.reason).toBe("privacy_rpc_failed");
    }
  });

  it("fails closed on RPC error and thrown client exception", async () => {
    const failed = await getMyGamePrivacySettingsTrusted({
      rpc: async () => ({ data: null, error: { message: "boom" } }),
    });
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.reason).toBe("privacy_rpc_failed");

    const thrown = await getMyGamePrivacySettingsTrusted({
      rpc: async () => {
        throw new Error("network");
      },
    });
    expect(thrown.ok).toBe(false);
    if (thrown.ok) return;
    expect(thrown.reason).toBe("privacy_rpc_failed");
  });

  it("rejects null, malformed, unknown fields, and non-boolean values", async () => {
    const nullData = await getMyGamePrivacySettingsTrusted({
      rpc: async () => ({ data: null, error: null }),
    });
    expect(nullData.ok).toBe(false);
    if (nullData.ok) return;
    expect(nullData.reason).toBe("privacy_response_invalid");

    const unknownField = await getMyGamePrivacySettingsTrusted({
      rpc: async () => ({
        data: samplePrivacyDefaults({ leaderboard_public: true }),
        error: null,
      }),
    });
    expect(unknownField.ok).toBe(false);
    if (unknownField.ok) return;
    expect(unknownField.reason).toBe("privacy_response_invalid");

    const nonBoolean = await getMyGamePrivacySettingsTrusted({
      rpc: async () => ({
        data: samplePrivacyDefaults({ share_best_score: 1 }),
        error: null,
      }),
    });
    expect(nonBoolean.ok).toBe(false);
    if (nonBoolean.ok) return;
    expect(nonBoolean.reason).toBe("privacy_response_invalid");

    const malformed = await getMyGamePrivacySettingsTrusted({
      rpc: async () => ({ data: ["not", "an", "object"], error: null }),
    });
    expect(malformed.ok).toBe(false);
    if (malformed.ok) return;
    expect(malformed.reason).toBe("privacy_response_invalid");
  });

  it("lookup module path uses only authenticated RPC registry (no service-role / table)", () => {
    const src = read(MODULE);
    expect(src).toMatch(/getMyGamePrivacySettingsTrusted/);
    expect(src).toMatch(/GAMES_PUBLIC_RPCS\.getMyPrivacy/);
    expect(src).toMatch(/parseGamesMyPrivacySettingsResponse/);
    expect(src).toMatch(/get_my_game_privacy_settings/);
    expect(src).not.toMatch(/createServiceRole|service_role|serviceRole/i);
    expect(src).not.toMatch(/\.from\(\s*['"]game_privacy_settings['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]game_player_profiles['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]games['"]\s*\)/);
    expect(src).not.toMatch(/start_game_session|submit_game_session_result/);
    expect(src).not.toMatch(/platformSessionId/);
    expect(src).not.toMatch(/getCatalog|getMyCatalog|listCatalog/i);
    // No application-side ensure / default-row duplication.
    expect(src).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/);
    expect(src).not.toMatch(/game_ensure_player_profile\s*\(/);
    expect(src).not.toMatch(/game_ensure_privacy_settings\s*\(/);
  });

  it("documents ensure-on-read side effects (not side-effect free)", () => {
    const src = read(MODULE);
    const docs = read(LOOKUP_DOCS);
    const sql = read(FOUNDATION_SQL);

    expect(src).toMatch(/NOT side-effect free/);
    expect(src).toMatch(/ensure-on-read/);
    expect(src).toMatch(/game_ensure_privacy_settings/);
    expect(src).toMatch(/game_ensure_player_profile/);
    expect(src).toMatch(/ON CONFLICT DO NOTHING/);
    expect(src).toMatch(/game_player_profiles/);
    expect(src).toMatch(/game_privacy_settings/);

    expect(docs).toMatch(/ensure-on-read/);
    expect(docs).toMatch(/game_ensure_privacy_settings/);
    expect(docs).toMatch(/game_ensure_player_profile/);
    expect(docs).toMatch(/ON CONFLICT \(user_id\) DO NOTHING/);
    expect(docs).toMatch(/game_player_profiles/);
    expect(docs).toMatch(/game_privacy_settings/);
    expect(docs).toMatch(/idempotent/i);
    expect(docs).toMatch(/not side-effect free/i);
    expect(docs).not.toMatch(/Helper is side-effect free/i);
    expect(docs).not.toMatch(/is side-effect free \/ read-only/i);

    // SQL source of truth for ensure chain and defaults.
    expect(sql).toMatch(/create or replace function public\.get_my_game_privacy_settings\(\)/);
    expect(sql).toMatch(
      /v_row := public\.game_ensure_privacy_settings\(v_uid\);/
    );
    expect(sql).toMatch(
      /perform public\.game_ensure_player_profile\(p_user_id\);/
    );
    expect(sql).toMatch(
      /insert into public\.game_player_profiles \(user_id\)[\s\S]*?on conflict \(user_id\) do nothing;/
    );
    expect(sql).toMatch(
      /insert into public\.game_privacy_settings \(user_id\)[\s\S]*?on conflict \(user_id\) do nothing;/
    );
    expect(sql).toMatch(/share_achievements boolean not null default false/);
    expect(sql).toMatch(/share_best_score boolean not null default false/);
    expect(sql).toMatch(
      /share_level_or_progress boolean not null default false/
    );
    expect(sql).toMatch(/share_activity boolean not null default false/);
  });

  it("does not open Hub Runtime authority or populate platformSessionId", () => {
    const hub = read(HUB_RUNTIME);
    expect(hub).toMatch(/platformSessionId:\s*null/);
    expect(hub).not.toMatch(/getMyGamePrivacySettingsTrusted/);
    expect(hub).not.toMatch(/updateMyGamePrivacySettingsTrusted/);
    expect(hub).not.toMatch(/get_my_game_privacy_settings/);
    expect(hub).not.toMatch(/update_my_game_privacy_settings/);
  });

  it("does not infer public-sharing / Hub / reward / economy / playability", () => {
    const src = read(MODULE);
    expect(src).toMatch(/Privacy preference metadata only/);
    expect(src).toMatch(
      /does not imply(?: that)? public[\s\S]*sharing is active/
    );
    expect(src).not.toMatch(/public_sharing_active|leaderboard_exists|hub_exposed/);
    expect(src).not.toMatch(/reward_entitled|wallet_credit|economy_credit/);
    expect(src).not.toMatch(/runtime_eligible|can_play|is_playable/);
  });
});

describe("Games Privacy Settings Update Trusted V1 — patch validation", () => {
  it("accepts single-field and multi-field allowlisted boolean patches", () => {
    const single = validateGamesMyPrivacySettingsPatch({
      share_achievements: true,
    });
    expect(single.ok).toBe(true);
    if (!single.ok) return;
    expect(single.value).toEqual({ share_achievements: true });
    expect(Object.keys(single.value)).toEqual(["share_achievements"]);

    const multi = validateGamesMyPrivacySettingsPatch({
      share_best_score: true,
      share_activity: false,
    });
    expect(multi.ok).toBe(true);
    if (!multi.ok) return;
    expect(multi.value).toEqual({
      share_best_score: true,
      share_activity: false,
    });
    expect(Object.keys(multi.value).sort()).toEqual(
      ["share_activity", "share_best_score"].sort()
    );
  });

  it("rejects empty, unknown, non-boolean, null, array, and non-object patches", () => {
    const empty = validateGamesMyPrivacySettingsPatch({});
    expect(empty.ok).toBe(false);
    if (empty.ok) return;
    expect(empty.reason).toBe("privacy_empty");

    const unknown = validateGamesMyPrivacySettingsPatch({
      share_achievements: true,
      public_profile: true,
    });
    expect(unknown.ok).toBe(false);
    if (unknown.ok) return;
    expect(unknown.reason).toBe("privacy_unknown_field");

    const nonBool = validateGamesMyPrivacySettingsPatch({
      share_achievements: "true",
    });
    expect(nonBool.ok).toBe(false);
    if (nonBool.ok) return;
    expect(nonBool.reason).toBe("privacy_field_not_boolean");

    const nullPatch = validateGamesMyPrivacySettingsPatch(null);
    expect(nullPatch.ok).toBe(false);
    if (nullPatch.ok) return;
    expect(nullPatch.reason).toBe("privacy_not_object");

    const arrayPatch = validateGamesMyPrivacySettingsPatch([
      { share_achievements: true },
    ]);
    expect(arrayPatch.ok).toBe(false);
    if (arrayPatch.ok) return;
    expect(arrayPatch.reason).toBe("privacy_not_object");

    const stringPatch = validateGamesMyPrivacySettingsPatch("nope");
    expect(stringPatch.ok).toBe(false);
    if (stringPatch.ok) return;
    expect(stringPatch.reason).toBe("privacy_not_object");
  });
});

describe("Games Privacy Settings Update Trusted V1", () => {
  it("successful single-field partial update sends only that key", async () => {
    let capturedArgs: Record<string, unknown> | undefined;
    const r = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_PUBLIC_RPCS.updateMyPrivacy);
          expect(fn).toBe("update_my_game_privacy_settings");
          capturedArgs = args;
          return {
            data: samplePrivacyDefaults({ share_achievements: true }),
            error: null,
          };
        },
      },
      { share_achievements: true }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(capturedArgs).toEqual({
      p_patch: { share_achievements: true },
    });
    const sent = (capturedArgs as { p_patch: Record<string, unknown> }).p_patch;
    expect(Object.keys(sent)).toEqual(["share_achievements"]);
    expect(sent).not.toHaveProperty("share_best_score");
    expect(sent).not.toHaveProperty("share_level_or_progress");
    expect(sent).not.toHaveProperty("share_activity");
    expect(r.value.share_achievements).toBe(true);
    expect(r.value.share_best_score).toBe(false);
    expect(r.value.share_level_or_progress).toBe(false);
    expect(r.value.share_activity).toBe(false);
  });

  it("successful multi-field update sends only provided keys", async () => {
    let capturedArgs: Record<string, unknown> | undefined;
    const r = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_PUBLIC_RPCS.updateMyPrivacy);
          capturedArgs = args;
          return {
            data: samplePrivacyMixed({
              share_best_score: true,
              share_activity: true,
            }),
            error: null,
          };
        },
      },
      {
        share_best_score: true,
        share_activity: true,
      }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(capturedArgs).toEqual({
      p_patch: {
        share_best_score: true,
        share_activity: true,
      },
    });
    const sent = (capturedArgs as { p_patch: Record<string, unknown> }).p_patch;
    expect(Object.keys(sent).sort()).toEqual(
      ["share_activity", "share_best_score"].sort()
    );
    expect(sent).not.toHaveProperty("share_achievements");
    expect(sent).not.toHaveProperty("share_level_or_progress");
    expect(r.value).toEqual({
      share_achievements: true,
      share_best_score: true,
      share_level_or_progress: true,
      share_activity: true,
    });
  });

  it("rejects empty patch before RPC", async () => {
    let called = false;
    const r = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async () => {
          called = true;
          return { data: samplePrivacyDefaults(), error: null };
        },
      },
      {}
    );
    expect(called).toBe(false);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("privacy_empty");
  });

  it("rejects unknown field, non-boolean, null/array/non-object before RPC", async () => {
    let callCount = 0;
    const client = {
      rpc: async () => {
        callCount += 1;
        return { data: samplePrivacyDefaults(), error: null };
      },
    };

    const unknown = await updateMyGamePrivacySettingsTrusted(client, {
      share_achievements: true,
      feed_visible: true,
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.reason).toBe("privacy_unknown_field");

    const nonBool = await updateMyGamePrivacySettingsTrusted(client, {
      share_achievements: 1,
    });
    expect(nonBool.ok).toBe(false);
    if (!nonBool.ok) expect(nonBool.reason).toBe("privacy_field_not_boolean");

    const nullPatch = await updateMyGamePrivacySettingsTrusted(client, null);
    expect(nullPatch.ok).toBe(false);
    if (!nullPatch.ok) expect(nullPatch.reason).toBe("privacy_not_object");

    const arrayPatch = await updateMyGamePrivacySettingsTrusted(client, [
      true,
    ]);
    expect(arrayPatch.ok).toBe(false);
    if (!arrayPatch.ok) expect(arrayPatch.reason).toBe("privacy_not_object");

    expect(callCount).toBe(0);
  });

  it("maps unauthenticated / denied RPC errors to privacy_rpc_failed", async () => {
    for (const message of [
      "Authentication required",
      "permission denied",
      "JWT expired",
    ]) {
      const r = await updateMyGamePrivacySettingsTrusted(
        {
          rpc: async () => ({
            data: null,
            error: { message },
          }),
        },
        { share_activity: true }
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.reason).toBe("privacy_rpc_failed");
    }
  });

  it("fails closed on RPC error and thrown client exception", async () => {
    const failed = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async () => ({ data: null, error: { message: "boom" } }),
      },
      { share_level_or_progress: false }
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.reason).toBe("privacy_rpc_failed");

    const thrown = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async () => {
          throw new Error("network");
        },
      },
      { share_level_or_progress: false }
    );
    expect(thrown.ok).toBe(false);
    if (thrown.ok) return;
    expect(thrown.reason).toBe("privacy_rpc_failed");
  });

  it("rejects null or malformed response and enforces bounded shape", async () => {
    const nullData = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async () => ({ data: null, error: null }),
      },
      { share_achievements: true }
    );
    expect(nullData.ok).toBe(false);
    if (nullData.ok) return;
    expect(nullData.reason).toBe("privacy_response_invalid");

    const unknownField = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async () => ({
          data: samplePrivacyDefaults({ public_sharing_active: true }),
          error: null,
        }),
      },
      { share_achievements: true }
    );
    expect(unknownField.ok).toBe(false);
    if (unknownField.ok) return;
    expect(unknownField.reason).toBe("privacy_response_invalid");

    const nonBoolean = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async () => ({
          data: samplePrivacyDefaults({ share_activity: "yes" }),
          error: null,
        }),
      },
      { share_activity: true }
    );
    expect(nonBoolean.ok).toBe(false);
    if (nonBoolean.ok) return;
    expect(nonBoolean.reason).toBe("privacy_response_invalid");

    const malformed = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async () => ({ data: ["not", "object"], error: null }),
      },
      { share_activity: true }
    );
    expect(malformed.ok).toBe(false);
    if (malformed.ok) return;
    expect(malformed.reason).toBe("privacy_response_invalid");

    const ok = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async () => ({
          data: samplePrivacyDefaults({ share_achievements: true }),
          error: null,
        }),
      },
      { share_achievements: true }
    );
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    const view: GamesMyPrivacySettingsView = ok.value;
    expect(Object.keys(view).sort()).toEqual(
      [
        "share_achievements",
        "share_activity",
        "share_best_score",
        "share_level_or_progress",
      ].sort()
    );
    expect(view).not.toHaveProperty("user_id");
    expect(view).not.toHaveProperty("created_at");
    expect(view).not.toHaveProperty("updated_at");
    expect(view).not.toHaveProperty("public_sharing_active");
    expect(view).not.toHaveProperty("hub_exposed");
    expect(view).not.toHaveProperty("reward_entitled");
    expect(view).not.toHaveProperty("playable");
  });

  it("reuses parseGamesMyPrivacySettingsResponse as sole response boundary", async () => {
    const src = read(MODULE);
    expect(src).toMatch(/parseGamesMyPrivacySettingsResponse/);
    expect(src).toMatch(/updateMyGamePrivacySettingsTrusted/);
    expect(src).toMatch(
      /parseGamesMyPrivacySettingsRpcResponse[\s\S]*parseGamesMyPrivacySettingsResponse/
    );
    // Update path collapses parse failures the same way as lookup.
    const r = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async () => ({
          data: samplePrivacyDefaults({ extra: true }),
          error: null,
        }),
      },
      { share_achievements: false }
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("privacy_response_invalid");
  });

  it("update module path uses only authenticated RPC registry (no service-role / table write)", () => {
    const src = read(MODULE);
    expect(src).toMatch(/updateMyGamePrivacySettingsTrusted/);
    expect(src).toMatch(/GAMES_PUBLIC_RPCS\.updateMyPrivacy/);
    expect(src).toMatch(/update_my_game_privacy_settings/);
    expect(src).toMatch(/validateGamesMyPrivacySettingsPatch/);
    expect(src).toMatch(/validatePrivacySettingsPatch/);
    expect(src).toMatch(/p_patch/);
    expect(src).not.toMatch(/createServiceRole|service_role|serviceRole/i);
    expect(src).not.toMatch(/\.from\(\s*['"]game_privacy_settings['"]\s*\)/);
    expect(src).not.toMatch(/\.from\(\s*['"]game_player_profiles['"]\s*\)/);
    expect(src).not.toMatch(/\.insert\(|\.upsert\(|\.update\(/);
    expect(src).not.toMatch(/game_ensure_player_profile\s*\(/);
    expect(src).not.toMatch(/game_ensure_privacy_settings\s*\(/);
    expect(src).not.toMatch(/start_game_session|submit_game_session_result/);
  });

  it("documents ensure-on-write side effects and partial-update semantics", () => {
    const src = read(MODULE);
    const docs = read(UPDATE_DOCS);
    const sql = read(FOUNDATION_SQL);

    expect(src).toMatch(/ensure-on-write/);
    expect(src).toMatch(/game_ensure_player_profile/);
    expect(src).toMatch(/ON CONFLICT DO NOTHING/);
    expect(src).toMatch(/CASE WHEN p_patch \? key/);

    expect(docs).toMatch(/ensure-on-write/);
    expect(docs).toMatch(/game_ensure_player_profile/);
    expect(docs).toMatch(/ON CONFLICT \(user_id\) DO NOTHING/);
    expect(docs).toMatch(/partial/i);
    expect(docs).toMatch(/omitted/i);
    expect(docs).toMatch(/idempotent/i);
    expect(docs).toMatch(/not side-effect free/i);
    expect(docs).toMatch(/privacy_empty/);
    expect(docs).toMatch(/must never be treated as/);
    expect(docs).toMatch(/public sharing \/ public visibility is active/);
    expect(docs).not.toMatch(/true flags? (?:enable|imply|activate) public sharing/i);

    expect(sql).toMatch(
      /create or replace function public\.update_my_game_privacy_settings\(p_patch jsonb\)/
    );
    expect(sql).toMatch(
      /perform public\.game_ensure_player_profile\(v_uid\);/
    );
    expect(sql).toMatch(
      /when p_patch \? 'share_achievements'[\s\S]*?else share_achievements/
    );
    expect(sql).toMatch(
      /insert into public\.game_player_profiles \(user_id\)[\s\S]*?on conflict \(user_id\) do nothing;/
    );
    expect(sql).toMatch(
      /insert into public\.game_privacy_settings \(user_id\)[\s\S]*?on conflict \(user_id\) do nothing;/
    );
  });

  it("does not infer public-sharing / Hub / reward / economy / playability from true flags", async () => {
    const r = await updateMyGamePrivacySettingsTrusted(
      {
        rpc: async () => ({
          data: {
            share_achievements: true,
            share_best_score: true,
            share_level_or_progress: true,
            share_activity: true,
          },
          error: null,
        }),
      },
      {
        share_achievements: true,
        share_best_score: true,
        share_level_or_progress: true,
        share_activity: true,
      }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.share_achievements).toBe(true);
    expect(r.value).not.toHaveProperty("public_sharing_active");
    expect(r.value).not.toHaveProperty("feed_visible");
    expect(r.value).not.toHaveProperty("leaderboard_public");
    expect(r.value).not.toHaveProperty("hub_exposed");
    expect(r.value).not.toHaveProperty("reward_entitled");
    expect(r.value).not.toHaveProperty("wallet_credit");
    expect(r.value).not.toHaveProperty("playable");

    const src = read(MODULE);
    expect(src).toMatch(
      /do not imply public[\s\S]*visibility/
    );
    expect(src).not.toMatch(/public_sharing_active|leaderboard_exists|hub_exposed/);
    expect(src).not.toMatch(/reward_entitled|wallet_credit|economy_credit/);
    expect(src).not.toMatch(/runtime_eligible|can_play|is_playable/);
  });
});
