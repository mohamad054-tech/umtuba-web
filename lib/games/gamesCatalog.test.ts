import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
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
  getGamesCatalogByIdTrusted,
  getGamesCatalogByKeyTrusted,
  isCatalogPlayable,
  isCatalogVisibleToAuthenticated,
  listGamesCatalogTrusted,
  parseGamesCatalogEntryView,
  parseGamesCatalogListResponse,
  setGamesCatalogLifecycleTrusted,
  upsertGamesCatalogEntryTrusted,
  validateCatalogEntryId,
  validateCatalogFeatureFlags,
  validateCatalogPlatforms,
  validateGameKey,
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

describe("Games Catalog Entry Lookup Trusted V1", () => {
  it("getGamesCatalogByKeyTrusted succeeds with parsed EntryView", async () => {
    const r = await getGamesCatalogByKeyTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_CATALOG_PUBLIC_RPCS.getByKey);
          expect(args).toEqual({ p_game_key: "kick_blast" });
          return { data: sampleRpcEntry(), error: null };
        },
      },
      "kick_blast"
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.game_key).toBe("kick_blast");
    expect(r.value.id).toBe(SAMPLE_ENTRY_ID);
  });

  it("getGamesCatalogByIdTrusted succeeds with parsed EntryView", async () => {
    const r = await getGamesCatalogByIdTrusted(
      {
        rpc: async (fn, args) => {
          expect(fn).toBe(GAMES_CATALOG_PUBLIC_RPCS.getById);
          expect(args).toEqual({ p_game_id: SAMPLE_ENTRY_ID });
          return { data: sampleRpcEntry(), error: null };
        },
      },
      SAMPLE_ENTRY_ID
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.id).toBe(SAMPLE_ENTRY_ID);
  });

  it("rejects invalid key before RPC", async () => {
    let called = false;
    const r = await getGamesCatalogByKeyTrusted(
      {
        rpc: async () => {
          called = true;
          return { data: null, error: null };
        },
      },
      "Kick"
    );
    expect(called).toBe(false);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("game_key_invalid");
    expect(validateGameKey("Kick").ok).toBe(false);
  });

  it("rejects invalid UUID before RPC", async () => {
    let called = false;
    const r = await getGamesCatalogByIdTrusted(
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
    expect(r.reason).toBe("entry_id_invalid");
    expect(validateCatalogEntryId("not-a-uuid").ok).toBe(false);
  });

  it("maps RPC not-found / Game not available to catalog_rpc_failed (no trusted null)", async () => {
    // SQL raise exception 'Game not available' for absence and non-visible rows —
    // never returns SQL NULL. Client must fail closed, not invent success-null.
    const byKey = await getGamesCatalogByKeyTrusted(
      {
        rpc: async () => ({
          data: null,
          error: { message: "Game not available" },
        }),
      },
      "kick_blast"
    );
    expect(byKey.ok).toBe(false);
    if (byKey.ok) return;
    expect(byKey.reason).toBe("catalog_rpc_failed");

    const byId = await getGamesCatalogByIdTrusted(
      {
        rpc: async () => ({
          data: null,
          error: { message: "Game not available" },
        }),
      },
      SAMPLE_ENTRY_ID
    );
    expect(byId.ok).toBe(false);
    if (byId.ok) return;
    expect(byId.reason).toBe("catalog_rpc_failed");
  });

  it("fails closed on RPC failure and thrown client errors", async () => {
    const failed = await getGamesCatalogByKeyTrusted(
      { rpc: async () => ({ data: null, error: { message: "boom" } }) },
      "kick_blast"
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.reason).toBe("catalog_rpc_failed");

    const thrown = await getGamesCatalogByIdTrusted(
      {
        rpc: async () => {
          throw new Error("network");
        },
      },
      SAMPLE_ENTRY_ID
    );
    expect(thrown.ok).toBe(false);
    if (thrown.ok) return;
    expect(thrown.reason).toBe("catalog_rpc_failed");
  });

  it("rejects null and malformed get responses", async () => {
    const nullData = await getGamesCatalogByKeyTrusted(
      { rpc: async () => ({ data: null, error: null }) },
      "kick_blast"
    );
    expect(nullData.ok).toBe(false);
    if (nullData.ok) return;
    expect(nullData.reason).toBe("catalog_get_response_invalid");

    const malformed = await getGamesCatalogByIdTrusted(
      {
        rpc: async () => ({
          data: sampleRpcEntry({ economy_hook: true }),
          error: null,
        }),
      },
      SAMPLE_ENTRY_ID
    );
    expect(malformed.ok).toBe(false);
    if (malformed.ok) return;
    expect(malformed.reason).toBe("catalog_get_response_invalid");

    const badStatus = await getGamesCatalogByKeyTrusted(
      {
        rpc: async () => ({
          data: sampleRpcEntry({ status: "published" }),
          error: null,
        }),
      },
      "kick_blast"
    );
    expect(badStatus.ok).toBe(false);
    if (badStatus.ok) return;
    expect(badStatus.reason).toBe("catalog_get_response_invalid");
  });

  it("hidden/draft/archived visibility remains RPC-governed (client does not invent null)", async () => {
    // Non-admin deny paths raise in SQL; trusted client only maps the error.
    for (const message of [
      "Game not available",
      "Authentication required",
    ]) {
      const r = await getGamesCatalogByKeyTrusted(
        {
          rpc: async () => ({ data: null, error: { message } }),
        },
        "kick_blast"
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.reason).toBe("catalog_rpc_failed");
    }

    // If an admin-visible draft/hidden row is returned, parser accepts metadata
    // without implying playability.
    const adminDraft = await getGamesCatalogByKeyTrusted(
      {
        rpc: async () => ({
          data: sampleRpcEntry({
            status: "draft",
            visibility: "hidden",
            availability: "unavailable",
          }),
          error: null,
        }),
      },
      "kick_blast"
    );
    expect(adminDraft.ok).toBe(true);
    if (!adminDraft.ok) return;
    expect(isCatalogPlayable(adminDraft.value)).toBe(false);
    expect(isCatalogVisibleToAuthenticated(adminDraft.value)).toBe(false);
  });

  it("lookup module path uses only authenticated RPC registry (no service-role / table)", () => {
    const src = read(MODULE);
    expect(src).toMatch(/getGamesCatalogByKeyTrusted/);
    expect(src).toMatch(/getGamesCatalogByIdTrusted/);
    expect(src).toMatch(/GAMES_CATALOG_PUBLIC_RPCS\.getByKey/);
    expect(src).toMatch(/GAMES_CATALOG_PUBLIC_RPCS\.getById/);
    expect(src).toMatch(/parseGamesCatalogEntryView/);
    expect(src).not.toMatch(/createServiceRole|service_role|serviceRole/i);
    expect(src).not.toMatch(/\.from\(\s*['"]games['"]\s*\)/);
  });
});

describe("Games Catalog Lifecycle Trusted V1", () => {
  it("succeeds with authorized lifecycle update and parsed EntryView", async () => {
    const assertPlatformAdmin = vi.fn(async () => true);
    const rpc = vi.fn(async (fn: string, args?: Record<string, unknown>) => {
      expect(fn).toBe(GAMES_CATALOG_ADMIN_RPCS.setLifecycle);
      expect(args).toEqual({
        p_game_key: "kick_blast",
        p_patch: {
          status: "active",
          availability: "coming_soon",
          visibility: "authenticated",
        },
      });
      return {
        data: sampleRpcEntry({
          status: "active",
          availability: "coming_soon",
          visibility: "authenticated",
        }),
        error: null,
      };
    });

    const r = await setGamesCatalogLifecycleTrusted(
      { rpc },
      { assertPlatformAdmin },
      "kick_blast",
      {
        status: "active",
        availability: "coming_soon",
        visibility: "authenticated",
      }
    );

    expect(assertPlatformAdmin).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.game_key).toBe("kick_blast");
    expect(r.value.status).toBe("active");
    expect(r.value.availability).toBe("coming_soon");
    expect(r.value.visibility).toBe("authenticated");
    // Metadata only — success must not imply playability.
    expect(isCatalogPlayable(r.value)).toBe(false);
  });

  it("rejects invalid game key before RPC", async () => {
    const rpc = vi.fn(async () => ({ data: sampleRpcEntry(), error: null }));
    const r = await setGamesCatalogLifecycleTrusted(
      { rpc },
      { assertPlatformAdmin: async () => true },
      "Kick",
      { status: "active" }
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("game_key_invalid");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects unauthorized invocation before mutation RPC", async () => {
    const rpc = vi.fn(async () => ({ data: sampleRpcEntry(), error: null }));
    const r = await setGamesCatalogLifecycleTrusted(
      { rpc },
      { assertPlatformAdmin: async () => false },
      "kick_blast",
      { status: "active" }
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("lifecycle_unauthorized");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when admin assertion throws", async () => {
    const rpc = vi.fn(async () => ({ data: sampleRpcEntry(), error: null }));
    const r = await setGamesCatalogLifecycleTrusted(
      { rpc },
      {
        assertPlatformAdmin: async () => {
          throw new Error("auth boom");
        },
      },
      "kick_blast",
      { status: "active" }
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("lifecycle_auth_failed");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects empty lifecycle patch before RPC", async () => {
    const rpc = vi.fn(async () => ({ data: sampleRpcEntry(), error: null }));
    const r = await setGamesCatalogLifecycleTrusted(
      { rpc },
      { assertPlatformAdmin: async () => true },
      "kick_blast",
      {}
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("lifecycle_empty");
    expect(validateLifecyclePatch({}).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects unknown lifecycle field before RPC", async () => {
    const rpc = vi.fn(async () => ({ data: sampleRpcEntry(), error: null }));
    const r = await setGamesCatalogLifecycleTrusted(
      { rpc },
      { assertPlatformAdmin: async () => true },
      "kick_blast",
      { status: "active", catalog_version: 2 }
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("lifecycle_unknown_field");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects invalid status / availability / visibility enums before RPC", async () => {
    const rpc = vi.fn(async () => ({ data: sampleRpcEntry(), error: null }));

    const badStatus = await setGamesCatalogLifecycleTrusted(
      { rpc },
      { assertPlatformAdmin: async () => true },
      "kick_blast",
      { status: "published" }
    );
    expect(badStatus.ok).toBe(false);
    if (badStatus.ok) return;
    expect(badStatus.reason).toBe("status_invalid");

    const badAvailability = await setGamesCatalogLifecycleTrusted(
      { rpc },
      { assertPlatformAdmin: async () => true },
      "kick_blast",
      { availability: "online" }
    );
    expect(badAvailability.ok).toBe(false);
    if (badAvailability.ok) return;
    expect(badAvailability.reason).toBe("availability_invalid");

    const badVisibility = await setGamesCatalogLifecycleTrusted(
      { rpc },
      { assertPlatformAdmin: async () => true },
      "kick_blast",
      { visibility: "public" }
    );
    expect(badVisibility.ok).toBe(false);
    if (badVisibility.ok) return;
    expect(badVisibility.reason).toBe("visibility_invalid");

    expect(rpc).not.toHaveBeenCalled();
  });

  it("documents that local transition enforcement is omitted (SQL sole authority)", () => {
    // canTransitionCatalogStatus is advisory only — SQL has no from→to matrix.
    // Trusted wrapper must not invent a parallel state machine.
    const src = read(MODULE);
    expect(src).toMatch(/setGamesCatalogLifecycleTrusted/);
    expect(src).toMatch(/SQL is the sole transition authority/);
    // Wrapper body must not call canTransitionCatalogStatus.
    const fnStart = src.indexOf(
      "export async function setGamesCatalogLifecycleTrusted"
    );
    expect(fnStart).toBeGreaterThan(-1);
    const fnSlice = src.slice(fnStart, fnStart + 1800);
    expect(fnSlice).not.toMatch(/canTransitionCatalogStatus\s*\(/);
    // Advisory helper still exists for UI / docs consumers.
    expect(canTransitionCatalogStatus("draft", "active")).toBe(true);
    expect(canTransitionCatalogStatus("archived", "active")).toBe(true);
  });

  it("fails closed on RPC error and thrown client exceptions", async () => {
    const failed = await setGamesCatalogLifecycleTrusted(
      {
        rpc: async () => ({
          data: null,
          error: { message: "Not allowed to manage game catalog" },
        }),
      },
      { assertPlatformAdmin: async () => true },
      "kick_blast",
      { status: "archived" }
    );
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.reason).toBe("catalog_lifecycle_rpc_failed");

    const thrown = await setGamesCatalogLifecycleTrusted(
      {
        rpc: async () => {
          throw new Error("network");
        },
      },
      { assertPlatformAdmin: async () => true },
      "kick_blast",
      { availability: "maintenance" }
    );
    expect(thrown.ok).toBe(false);
    if (thrown.ok) return;
    expect(thrown.reason).toBe("catalog_lifecycle_rpc_failed");
  });

  it("rejects null and malformed lifecycle responses", async () => {
    const nullData = await setGamesCatalogLifecycleTrusted(
      { rpc: async () => ({ data: null, error: null }) },
      { assertPlatformAdmin: async () => true },
      "kick_blast",
      { status: "active" }
    );
    expect(nullData.ok).toBe(false);
    if (nullData.ok) return;
    expect(nullData.reason).toBe("catalog_lifecycle_response_invalid");

    const malformed = await setGamesCatalogLifecycleTrusted(
      {
        rpc: async () => ({
          data: sampleRpcEntry({ economy_hook: true }),
          error: null,
        }),
      },
      { assertPlatformAdmin: async () => true },
      "kick_blast",
      { visibility: "listed" }
    );
    expect(malformed.ok).toBe(false);
    if (malformed.ok) return;
    expect(malformed.reason).toBe("catalog_lifecycle_response_invalid");
  });

  it("has no service-role or direct table-write path", () => {
    const src = read(MODULE);
    expect(src).toMatch(/setGamesCatalogLifecycleTrusted/);
    expect(src).toMatch(/GAMES_CATALOG_ADMIN_RPCS\.setLifecycle/);
    expect(src).toMatch(/assertPlatformAdmin/);
    expect(src).toMatch(/parseGamesCatalogEntryView/);
    expect(src).not.toMatch(/createServiceRole|service_role|serviceRole/i);
    expect(src).not.toMatch(/SERVICE_ROLE/);
    expect(src).not.toMatch(/\.from\(\s*['"]games['"]\s*\)/);
    expect(src).not.toMatch(/insert\s+into\s+public\.games/i);
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
