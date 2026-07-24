import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GAMES_CATALOG_ADMIN_RPCS,
  GAMES_CATALOG_AVAILABILITIES,
  GAMES_CATALOG_CATEGORIES,
  GAMES_CATALOG_FEATURE_FLAG_DEFAULTS,
  GAMES_CATALOG_FEATURE_FLAG_KEYS,
  GAMES_CATALOG_INTERNAL_HELPERS,
  GAMES_CATALOG_PUBLIC_RPCS,
  GAMES_CATALOG_VISIBILITIES,
  canTransitionCatalogStatus,
  isCatalogPlayable,
  isCatalogVisibleToAuthenticated,
  listGamesCatalogTrusted,
  parseGamesCatalogEntryView,
  parseGamesCatalogListResponse,
  upsertGamesCatalogEntryTrusted,
  validateCatalogFeatureFlags,
  validateCatalogPlatforms,
  validateGamesCatalogDefinition,
  validateLifecyclePatch,
} from "./gamesCatalog";
import { GAMES_UM_POINTS_DENYLIST } from "./gamesFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260847_games_catalog_foundation_v1.sql";
const PLATFORM_MIGRATION =
  "supabase/migrations/20260846_games_platform_foundation_v1.sql";
const DOC = "docs/games/implementation/GAMES_CATALOG_FOUNDATION_V1.md";
const MODULE = "lib/games/gamesCatalog.ts";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function stripSqlComments(s: string) {
  return s.replace(/--[^\n]*/g, "");
}

function fnBody(sql: string, name: string) {
  const fnStarts = [
    ...sql.matchAll(/create or replace function public\.(\w+)/g),
  ];
  const idx = fnStarts.findIndex((m) => m[1] === name);
  if (idx < 0) throw new Error(`function ${name} not found`);
  const start = fnStarts[idx].index ?? 0;
  const end =
    idx + 1 < fnStarts.length
      ? (fnStarts[idx + 1].index ?? sql.length)
      : sql.length;
  return sql.slice(start, end);
}

const validDef = {
  game_key: "kick_blast",
  slug: "kick-blast",
  name: "Kick Blast",
  status: "draft",
  availability: "coming_soon",
  visibility: "hidden",
  category: "action",
  difficulty: "medium",
  min_players: 1,
  max_players: 1,
  platforms: ["web"],
  catalog_version: 1,
} as const;

describe("Games Catalog Foundation V1 — files", () => {
  it("ships migration, module, docs; does not edit Platform migration", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, MODULE))).toBe(true);
    expect(existsSync(join(ROOT, PLATFORM_MIGRATION))).toBe(true);
    expect(MIGRATION > PLATFORM_MIGRATION).toBe(true);
    const platform = read(PLATFORM_MIGRATION);
    expect(platform).not.toMatch(/short_blurb/);
    expect(platform).not.toMatch(/upsert_game_catalog_entry/);
  });

  it("uses unique 20260847 version", () => {
    const hits = readdirSync(join(ROOT, "supabase/migrations")).filter((f) =>
      f.startsWith("20260847")
    );
    expect(hits).toEqual(["20260847_games_catalog_foundation_v1.sql"]);
  });
});

describe("Games Catalog Foundation V1 — definition validation", () => {
  it("accepts a valid catalog definition", () => {
    const r = validateGamesCatalogDefinition(validDef);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.game_key).toBe("kick_blast");
      expect(r.value.feature_flags).toEqual(GAMES_CATALOG_FEATURE_FLAG_DEFAULTS);
    }
  });

  it("rejects unknown definition fields", () => {
    expect(
      validateGamesCatalogDefinition({ ...validDef, economy_hook: true }).ok
    ).toBe(false);
  });

  it("rejects invalid game_key and category", () => {
    expect(
      validateGamesCatalogDefinition({ ...validDef, game_key: "Kick" }).ok
    ).toBe(false);
    expect(
      validateGamesCatalogDefinition({ ...validDef, category: "fps" }).ok
    ).toBe(false);
  });

  it("rejects invalid player ranges and platforms", () => {
    expect(
      validateGamesCatalogDefinition({
        ...validDef,
        min_players: 3,
        max_players: 1,
      }).ok
    ).toBe(false);
    expect(validateCatalogPlatforms(["web", "web"]).ok).toBe(false);
    expect(validateCatalogPlatforms(["web", "console"]).ok).toBe(false);
    expect(validateCatalogPlatforms(["web", "ios"]).ok).toBe(true);
  });

  it("rejects unknown feature flags", () => {
    expect(
      validateCatalogFeatureFlags({ sessions_enabled: true, um_points: true })
        .ok
    ).toBe(false);
    expect([...GAMES_CATALOG_FEATURE_FLAG_KEYS]).not.toContain("um_points");
  });
});

describe("Games Catalog Foundation V1 — lifecycle & visibility", () => {
  it("lists catalog enums", () => {
    expect(GAMES_CATALOG_VISIBILITIES).toContain("hidden");
    expect(GAMES_CATALOG_AVAILABILITIES).toContain("maintenance");
    expect(GAMES_CATALOG_CATEGORIES).toContain("cards");
  });

  it("validates lifecycle patches", () => {
    expect(
      validateLifecyclePatch({ status: "active", availability: "available" })
        .ok
    ).toBe(true);
    expect(validateLifecyclePatch({ foo: 1 }).ok).toBe(false);
    expect(validateLifecyclePatch({}).ok).toBe(false);
  });

  it("status transitions are constrained", () => {
    expect(canTransitionCatalogStatus("draft", "active")).toBe(true);
    expect(canTransitionCatalogStatus("archived", "active")).toBe(true);
  });

  it("playable requires active + available + sessions flag", () => {
    expect(
      isCatalogPlayable({
        status: "active",
        availability: "available",
        feature_flags: { sessions_enabled: true },
      })
    ).toBe(true);
    expect(
      isCatalogPlayable({
        status: "active",
        availability: "maintenance",
        feature_flags: { sessions_enabled: true },
      })
    ).toBe(false);
    expect(
      isCatalogPlayable({
        status: "active",
        availability: "available",
        feature_flags: { sessions_enabled: false },
      })
    ).toBe(false);
  });

  it("hidden catalog entries are not player-visible", () => {
    expect(
      isCatalogVisibleToAuthenticated({
        status: "active",
        visibility: "hidden",
        availability: "available",
      })
    ).toBe(false);
    expect(
      isCatalogVisibleToAuthenticated({
        status: "active",
        visibility: "authenticated",
        availability: "available",
      })
    ).toBe(true);
  });
});

const SAMPLE_ENTRY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function sampleRpcEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: SAMPLE_ENTRY_ID,
    game_key: "kick_blast",
    slug: "kick-blast",
    name: "Kick Blast",
    description: "Catalog sample",
    short_blurb: "Short",
    status: "active",
    availability: "available",
    visibility: "listed",
    category: "action",
    difficulty: "medium",
    min_players: 1,
    max_players: 1,
    platforms: ["web"],
    feature_flags: { ...GAMES_CATALOG_FEATURE_FLAG_DEFAULTS },
    catalog_version: 1,
    content_version: "1.0.0",
    sort_order: 10,
    is_featured: false,
    result_validation_mode: "fail_closed",
    session_ttl_seconds: 3600,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    ...overrides,
  };
}

describe("Games Catalog Foundation V1 — trusted list parsing", () => {
  it("parses a valid RPC entry view", () => {
    const r = parseGamesCatalogEntryView(sampleRpcEntry());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.id).toBe(SAMPLE_ENTRY_ID);
    expect(r.value.game_key).toBe("kick_blast");
    expect(r.value.visibility).toBe("listed");
  });

  it("rejects malformed and unknown-field entries", () => {
    expect(parseGamesCatalogEntryView(null).ok).toBe(false);
    expect(parseGamesCatalogEntryView("x").ok).toBe(false);
    expect(
      parseGamesCatalogEntryView(sampleRpcEntry({ id: "not-a-uuid" })).ok
    ).toBe(false);
    expect(
      parseGamesCatalogEntryView(
        sampleRpcEntry({ economy_hook: true })
      ).ok
    ).toBe(false);
    expect(
      parseGamesCatalogEntryView(sampleRpcEntry({ category: "fps" })).ok
    ).toBe(false);
  });

  it("parses list envelope and drops hidden / malformed rows", () => {
    const r = parseGamesCatalogListResponse({
      games: [
        sampleRpcEntry(),
        sampleRpcEntry({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          game_key: "hidden_game",
          slug: "hidden-game",
          visibility: "hidden",
        }),
        sampleRpcEntry({
          id: "bad",
          game_key: "broken",
        }),
        { not: "an entry" },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(1);
    expect(r.value[0]?.game_key).toBe("kick_blast");
  });

  it("fails closed on malformed list envelopes", () => {
    expect(parseGamesCatalogListResponse(null).ok).toBe(false);
    expect(parseGamesCatalogListResponse([]).ok).toBe(false);
    expect(parseGamesCatalogListResponse({ games: {} }).ok).toBe(false);
    expect(
      parseGamesCatalogListResponse({ games: [], extra: true }).ok
    ).toBe(false);
  });

  it("returns empty success for trusted empty games array", () => {
    const r = parseGamesCatalogListResponse({ games: [] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual([]);
  });

  it("listGamesCatalogTrusted calls list_games_catalog and maps payload", async () => {
    const client = {
      rpc: async (fn: string) => {
        expect(fn).toBe(GAMES_CATALOG_PUBLIC_RPCS.listCatalog);
        return {
          data: { games: [sampleRpcEntry()] },
          error: null,
        };
      },
    };
    const r = await listGamesCatalogTrusted(client);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(1);
  });

  it("listGamesCatalogTrusted fails closed on RPC error", async () => {
    const r = await listGamesCatalogTrusted({
      rpc: async () => ({ data: null, error: { message: "boom" } }),
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("catalog_rpc_failed");
  });

  it("upsertGamesCatalogEntryTrusted calls admin upsert and parses EntryView", async () => {
    const r = await upsertGamesCatalogEntryTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_CATALOG_ADMIN_RPCS.upsert);
          expect(args).toEqual(
            expect.objectContaining({
              p_def: expect.objectContaining({ game_key: "kick_blast" }),
            })
          );
          return { data: sampleRpcEntry(), error: null };
        },
      },
      { ...validDef, status: "active", visibility: "authenticated" }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.game_key).toBe("kick_blast");
  });

  it("upsertGamesCatalogEntryTrusted fails closed on RPC error and bad response", async () => {
    const failed = await upsertGamesCatalogEntryTrusted(
      { rpc: async () => ({ data: null, error: { message: "boom" } }) },
      validDef
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.reason).toBe("catalog_upsert_rpc_failed");

    const badShape = await upsertGamesCatalogEntryTrusted(
      {
        rpc: async () => ({
          data: { game_key: "kick_blast", extra: true },
          error: null,
        }),
      },
      validDef
    );
    expect(badShape.ok).toBe(false);
    if (badShape.ok) return;
    expect(badShape.reason).toBe("catalog_upsert_response_invalid");
  });
});

describe("Games Catalog Foundation V1 — SQL security contracts", () => {
  const sql = read(MIGRATION);
  const code = stripSqlComments(sql);

  it("adds catalog columns and indexes without dropping games table", () => {
    expect(sql).toMatch(/add column if not exists availability/);
    expect(sql).toMatch(/add column if not exists visibility/);
    expect(sql).toMatch(/add column if not exists feature_flags/);
    expect(sql).toMatch(/add column if not exists catalog_version/);
    expect(sql).not.toMatch(/drop table public\.games/i);
  });

  it("exposes public + admin RPCs; internals revoked from authenticated", () => {
    for (const name of Object.values(GAMES_CATALOG_PUBLIC_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`grant execute on function public\\.${name}`)
      );
    }
    for (const name of Object.values(GAMES_CATALOG_ADMIN_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`grant execute on function public\\.${name}`)
      );
      const fn = fnBody(sql, name);
      expect(fn).toMatch(/is_platform_admin/);
    }
    for (const name of Object.values(GAMES_CATALOG_INTERNAL_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(
          `revoke all on function public\\.${name}[\\s\\S]*?from public, anon, authenticated`
        )
      );
    }
  });

  it("admin upsert is fail-closed and uses validate helper", () => {
    const upsert = fnBody(sql, "upsert_game_catalog_entry");
    expect(upsert).toMatch(/game_catalog_validate_definition/);
    expect(upsert).toMatch(/on conflict \(game_key\) do update/);
  });

  it("start_game_session gates on availability and sessions_enabled", () => {
    const start = fnBody(sql, "start_game_session");
    expect(start).toMatch(/availability is distinct from 'available'/);
    expect(start).toMatch(/sessions_enabled/);
  });

  it("no UM Points / Ads / leaderboard surfaces", () => {
    expect(code).not.toMatch(/award_um_points_to_user\s*\(/);
    expect(code).not.toMatch(/insert\s+into\s+public\.um_points_ledger/i);
    expect(code).not.toMatch(/games_promo/);
    expect(code).not.toMatch(/create table[\s\S]{0,80}leaderboard/i);
    for (const banned of GAMES_UM_POINTS_DENYLIST) {
      expect(code).not.toMatch(
        new RegExp(`perform\\s+public\\.${banned}`, "i")
      );
    }
  });

  it("no gameplay / matchmaking logic", () => {
    expect(code).not.toMatch(/matchmaking/i);
    expect(code).not.toMatch(/anti_cheat/i);
    expect(code).not.toMatch(/kick_blast_score/i);
  });
});
