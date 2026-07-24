import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  GAMES_CATALOG_ADMIN_RPCS,
  type GamesCatalogEntryView,
  type GamesCatalogRpcClient,
} from "./gamesCatalog";
import {
  GAMES_CATALOG_TITLE_SEED_IDS,
  GAMES_CATALOG_TITLE_SEEDS,
  UM_KICK_BLAST_CATALOG_TITLE_SEED,
  isGamesCatalogTitleSeedId,
  registerGamesCatalogTitleSeed,
  resolveGamesCatalogTitleSeed,
} from "./gamesCatalogTitleSeed";

const ROOT = process.cwd();
const SEED_MODULE = "lib/games/gamesCatalogTitleSeed.ts";
const CATALOG_MODULE = "lib/games/gamesCatalog.ts";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function sampleUpsertResponse(
  overrides: Partial<GamesCatalogEntryView> = {}
): GamesCatalogEntryView {
  const seed = resolveGamesCatalogTitleSeed("kick_blast");
  if (!seed.ok) throw new Error("seed fixture invalid");
  return {
    id: "11111111-1111-4111-8111-111111111111",
    game_key: seed.value.game_key,
    slug: seed.value.slug,
    name: seed.value.name,
    description: seed.value.description ?? null,
    short_blurb: seed.value.short_blurb ?? null,
    status: seed.value.status,
    availability: seed.value.availability,
    visibility: seed.value.visibility,
    category: seed.value.category,
    difficulty: seed.value.difficulty,
    min_players: seed.value.min_players,
    max_players: seed.value.max_players,
    platforms: seed.value.platforms,
    feature_flags: {
      sessions_enabled: false,
      achievements_enabled: false,
      progress_enabled: false,
      privacy_settings_enabled: false,
    },
    catalog_version: seed.value.catalog_version,
    content_version: seed.value.content_version ?? null,
    sort_order: seed.value.sort_order ?? 0,
    is_featured: seed.value.is_featured ?? false,
    result_validation_mode: seed.value.result_validation_mode ?? "fail_closed",
    session_ttl_seconds: seed.value.session_ttl_seconds ?? 3600,
    created_at: "2026-07-24T00:00:00.000Z",
    updated_at: "2026-07-24T00:00:00.000Z",
    ...overrides,
  };
}

describe("Games Catalog Title Seed V1 — canonical UM Kick Blast seed", () => {
  it("exposes a single allowlisted kick_blast seed id", () => {
    expect(GAMES_CATALOG_TITLE_SEED_IDS).toEqual(["kick_blast"]);
    expect(isGamesCatalogTitleSeedId("kick_blast")).toBe(true);
    expect(isGamesCatalogTitleSeedId("unknown_title")).toBe(false);
    expect(Object.keys(GAMES_CATALOG_TITLE_SEEDS)).toEqual(["kick_blast"]);
  });

  it("validates the canonical UM Kick Blast seed metadata", () => {
    const r = resolveGamesCatalogTitleSeed("kick_blast");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.game_key).toBe("kick_blast");
    expect(r.value.slug).toBe("kick-blast");
    expect(r.value.name).toBe("UM Kick Blast");
    expect(r.value.description).toBeNull();
    expect(r.value.short_blurb).toBeNull();
    expect(r.value.status).toBe("active");
    expect(r.value.availability).toBe("coming_soon");
    expect(r.value.visibility).toBe("authenticated");
    expect(r.value.category).toBe("action");
    expect(r.value.difficulty).toBe("unset");
    expect(r.value.min_players).toBe(1);
    expect(r.value.max_players).toBe(1);
    expect(r.value.platforms).toEqual(["web"]);
    expect(r.value.catalog_version).toBe(1);
    expect(r.value.content_version).toBeNull();
    expect(r.value.sort_order).toBe(0);
    expect(r.value.is_featured).toBe(false);
    expect(UM_KICK_BLAST_CATALOG_TITLE_SEED).not.toHaveProperty("sort_order");
  });

  it("forces / validates sessions_enabled false on the seed", () => {
    const r = resolveGamesCatalogTitleSeed("kick_blast");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.feature_flags?.sessions_enabled).toBe(false);
    expect(r.value.feature_flags).toEqual({
      sessions_enabled: false,
      achievements_enabled: false,
      progress_enabled: false,
      privacy_settings_enabled: false,
    });
  });

  it("rejects unknown seed ids", () => {
    const r = resolveGamesCatalogTitleSeed("sudoku");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("seed_unknown");
  });
});

describe("Games Catalog Title Seed V1 — registration", () => {
  it("registers through the Catalog upsert abstraction when authorized", async () => {
    const rpc = vi.fn(async (fn: string, args?: Record<string, unknown>) => {
      expect(fn).toBe(GAMES_CATALOG_ADMIN_RPCS.upsert);
      expect(args).toEqual(
        expect.objectContaining({
          p_def: expect.objectContaining({
            game_key: "kick_blast",
            name: "UM Kick Blast",
            feature_flags: expect.objectContaining({
              sessions_enabled: false,
            }),
          }),
        })
      );
      return { data: sampleUpsertResponse(), error: null };
    });
    const client: GamesCatalogRpcClient = { rpc };
    const assertPlatformAdmin = vi.fn(async () => true);

    const r = await registerGamesCatalogTitleSeed(
      client,
      { assertPlatformAdmin },
      "kick_blast"
    );

    expect(assertPlatformAdmin).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.game_key).toBe("kick_blast");
    expect(r.value.name).toBe("UM Kick Blast");
    expect(r.value.feature_flags.sessions_enabled).toBe(false);
    expect(r.value.availability).toBe("coming_soon");
  });

  it("rejects unauthorized invocation", async () => {
    const rpc = vi.fn(async () => ({
      data: sampleUpsertResponse(),
      error: null,
    }));
    const r = await registerGamesCatalogTitleSeed(
      { rpc },
      { assertPlatformAdmin: async () => false },
      "kick_blast"
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("seed_unauthorized");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when auth check throws", async () => {
    const rpc = vi.fn(async () => ({
      data: sampleUpsertResponse(),
      error: null,
    }));
    const r = await registerGamesCatalogTitleSeed(
      { rpc },
      {
        assertPlatformAdmin: async () => {
          throw new Error("auth boom");
        },
      },
      "kick_blast"
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("seed_auth_failed");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects unknown seed before calling upsert", async () => {
    const rpc = vi.fn(async () => ({
      data: sampleUpsertResponse(),
      error: null,
    }));
    const r = await registerGamesCatalogTitleSeed(
      { rpc },
      { assertPlatformAdmin: async () => true },
      "not_a_seed"
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("seed_unknown");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed on RPC error", async () => {
    const r = await registerGamesCatalogTitleSeed(
      {
        rpc: async () => ({
          data: null,
          error: { message: "Not allowed to manage game catalog" },
        }),
      },
      { assertPlatformAdmin: async () => true },
      "kick_blast"
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("catalog_upsert_rpc_failed");
  });

  it("rejects unexpected RPC response shapes", async () => {
    const r = await registerGamesCatalogTitleSeed(
      {
        rpc: async () => ({
          data: { game_key: "kick_blast", unexpected: true },
          error: null,
        }),
      },
      { assertPlatformAdmin: async () => true },
      "kick_blast"
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("catalog_upsert_response_invalid");
  });
});

describe("Games Catalog Title Seed V1 — security boundaries", () => {
  it("has no service-role or direct table write path", () => {
    const seedSrc = read(SEED_MODULE);
    const catalogSrc = read(CATALOG_MODULE);
    for (const src of [seedSrc, catalogSrc]) {
      expect(src).not.toMatch(/service_role/i);
      expect(src).not.toMatch(/SERVICE_ROLE/);
      expect(src).not.toMatch(/\.from\(\s*["']games["']\s*\)/);
      expect(src).not.toMatch(/insert\s+into\s+public\.games/i);
      expect(src).not.toMatch(/createClient\([^)]*service/i);
    }
    expect(seedSrc).toMatch(/upsertGamesCatalogEntryTrusted/);
    expect(seedSrc).toMatch(/assertPlatformAdmin/);
    expect(catalogSrc).toMatch(/upsert_game_catalog_entry/);
  });
});
