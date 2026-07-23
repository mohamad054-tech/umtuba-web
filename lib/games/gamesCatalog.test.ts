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
  validateCatalogFeatureFlags,
  validateCatalogPlatforms,
  validateGamesCatalogDefinition,
  validateLifecyclePatch,
} from "./gamesCatalog";
import { GAMES_UM_POINTS_DENYLIST } from "./gamesFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260843_games_catalog_foundation_v1.sql";
const PLATFORM_MIGRATION =
  "supabase/migrations/20260842_games_platform_foundation_v1.sql";
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

  it("uses unique 20260843 version", () => {
    const hits = readdirSync(join(ROOT, "supabase/migrations")).filter((f) =>
      f.startsWith("20260843")
    );
    expect(hits).toEqual(["20260843_games_catalog_foundation_v1.sql"]);
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
