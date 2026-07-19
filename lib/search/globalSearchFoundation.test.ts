import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { isProtectedPath } from "../env/supabaseAuthGate";
import {
  buildSearchHref,
  SEARCH_TAB_LABELS,
  SEARCH_V1_ACTIVE_ENTITIES,
  SEARCH_V1_RESERVED_ENTITIES,
} from "./contracts";
import {
  filterResultsByTab,
  groupResultsByTab,
  isSearchableProductRow,
  isSearchableStoryRow,
  isSearchableVideoRow,
} from "./filters";
import {
  composeSearchScore,
  rankCandidates,
  scoreActivity,
  scoreMatchFields,
} from "./ranking";
import type { RankableCandidate, SearchResultItem } from "./types";
import {
  normalizeSearchQuery,
  parseSearchTab,
  quotedIlikePattern,
  sanitizeSearchTerm,
  validateSearchQuery,
} from "./validation";

const ROOT = process.cwd();

function readRepoFile(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const MIGRATION = "supabase/migrations/20260804_global_search_foundation_v1.sql";

describe("search validation", () => {
  it("rejects empty/short queries and sanitizes wildcards", () => {
    expect(validateSearchQuery("")).toMatchObject({ ok: false, empty: true });
    expect(validateSearchQuery("   ")).toMatchObject({ ok: false, empty: true });
    expect(validateSearchQuery("a")).toMatchObject({ ok: false, empty: true });
    expect(validateSearchQuery("%_")).toMatchObject({ ok: false });
    expect(validateSearchQuery("um")).toMatchObject({ ok: true, normalized: "um" });
    expect(sanitizeSearchTerm("%admin_")).toBe("admin");
    expect(normalizeSearchQuery("  hello   world  ")).toBe("hello world");
    expect(quotedIlikePattern("um")).toBe('"%um%"');
    expect(quotedIlikePattern('um"x')).toBe('"%umx%"');
  });

  it("parses tabs and builds search hrefs", () => {
    expect(parseSearchTab("videos")).toBe("videos");
    expect(parseSearchTab("nope")).toBe("all");
    expect(buildSearchHref({ q: "umtuba", tab: "people" })).toBe(
      "/search?q=umtuba&tab=people"
    );
    expect(buildSearchHref()).toBe("/search");
  });
});

describe("search ranking", () => {
  it("scores exact and prefix matches higher than loose contains", () => {
    expect(scoreMatchFields("umi", ["umi"])).toBeGreaterThan(
      scoreMatchFields("umi", ["team umi"])
    );
    expect(scoreMatchFields("umi", ["umiya"])).toBeGreaterThan(
      scoreMatchFields("umi", ["around umi city"])
    );
  });

  it("prefers fresher activity", () => {
    const now = Date.parse("2026-07-19T12:00:00.000Z");
    const recent = scoreActivity("2026-07-18T12:00:00.000Z", now);
    const older = scoreActivity("2026-06-01T12:00:00.000Z", now);
    expect(recent).toBeGreaterThan(older);
  });

  it("ranks mixed candidates by composite score", () => {
    const candidates: RankableCandidate[] = [
      {
        id: "1",
        entityType: "person",
        title: "Other",
        subtitle: null,
        href: "/profile/other",
        imageUrl: null,
        badge: null,
        matchFields: ["other"],
        activityAt: "2026-07-19T00:00:00.000Z",
        qualityPrior: 0.9,
      },
      {
        id: "2",
        entityType: "person",
        title: "UMI",
        subtitle: "@umi",
        href: "/profile/umi",
        imageUrl: null,
        badge: null,
        matchFields: ["umi", "UMI"],
        activityAt: "2026-07-10T00:00:00.000Z",
        qualityPrior: 0.5,
      },
    ];
    const ranked = rankCandidates(
      "umi",
      candidates,
      Date.parse("2026-07-19T12:00:00.000Z")
    );
    expect(ranked[0]?.id).toBe("2");
    expect(ranked[0]?.score).toBeGreaterThan(ranked[1]?.score ?? 0);
    expect(
      composeSearchScore({
        matchScore: 1,
        activityScore: 1,
        qualityScore: 1,
      })
    ).toBe(100);
  });
});

describe("search filters and permissions helpers", () => {
  it("filters by tab and groups results", () => {
    const items: SearchResultItem[] = [
      {
        id: "p1",
        entityType: "person",
        title: "A",
        subtitle: null,
        href: "/profile/a",
        imageUrl: null,
        badge: null,
        score: 10,
        matchScore: 1,
        activityScore: 1,
        qualityScore: 1,
      },
      {
        id: "v1",
        entityType: "video",
        title: "Clip",
        subtitle: null,
        href: "/discover?post=1",
        imageUrl: null,
        badge: null,
        score: 9,
        matchScore: 1,
        activityScore: 1,
        qualityScore: 1,
      },
    ];
    expect(filterResultsByTab(items, "people")).toHaveLength(1);
    expect(groupResultsByTab(items).find((g) => g.tab === "videos")?.items).toHaveLength(1);
  });

  it("enforces video/product/story visibility contracts", () => {
    expect(
      isSearchableVideoRow({
        post_type: "video",
        media_status: "ready",
        video_path: "u/a.mp4",
      })
    ).toBe(true);
    expect(
      isSearchableVideoRow({
        post_type: "video",
        media_status: "processing",
        video_path: "u/a.mp4",
      })
    ).toBe(false);
    expect(
      isSearchableProductRow({
        status: "active",
        moderation_status: "approved",
        store_status: "active",
      })
    ).toBe(true);
    expect(
      isSearchableProductRow({
        status: "draft",
        moderation_status: "approved",
        store_status: "active",
      })
    ).toBe(false);
    expect(
      isSearchableStoryRow(
        { expires_at: "2026-07-20T00:00:00.000Z" },
        Date.parse("2026-07-19T00:00:00.000Z")
      )
    ).toBe(true);
    expect(
      isSearchableStoryRow(
        { expires_at: "2026-07-18T00:00:00.000Z" },
        Date.parse("2026-07-19T00:00:00.000Z")
      )
    ).toBe(false);
  });
});

describe("search migration contracts", () => {
  const sql = readRepoFile(MIGRATION);

  it("creates recent searches with owner-only RLS and entity registry", () => {
    expect(sql).toMatch(/create table if not exists public\.search_recent_queries/);
    expect(sql).toMatch(/create table if not exists public\.search_entity_types/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/"Users read own recent searches"/);
    expect(sql).toMatch(/"Users delete own recent searches"/);
    expect(sql).toMatch(/search_recent_queries_enforce_owner/);
    expect(sql).toMatch(/new\.user_id := auth\.uid\(\)/);
    expect(sql).toMatch(/revoke all on table public\.search_recent_queries from anon/);
    expect(sql).toMatch(/pg_trgm/);
    expect(sql).toMatch(/profiles_username_trgm_idx/);
    expect(sql).toMatch(/posts_content_trgm_idx/);
    expect(sql).toMatch(/stories_caption_trgm_idx/);
    expect(sql).toMatch(/stores_name_trgm_idx/);
    expect(sql).toMatch(/store_products_title_trgm_idx/);
  });

  it("reserves live/hashtags/places for later phases", () => {
    expect(sql).toMatch(/'live'/);
    expect(sql).toMatch(/'hashtags'/);
    expect(sql).toMatch(/'places'/);
    expect(SEARCH_V1_RESERVED_ENTITIES).toEqual(["live", "hashtags", "places"]);
    expect(SEARCH_V1_ACTIVE_ENTITIES).toContain("stories");
  });
});

describe("search application contracts", () => {
  it("exposes required server actions without service_role", () => {
    const actions = readRepoFile("app/actions/search.ts");
    expect(actions).toMatch(/export async function globalSearchAction/);
    expect(actions).toMatch(/export async function recentSearchesAction/);
    expect(actions).toMatch(/export async function clearRecentSearchesAction/);
    expect(actions).toMatch(/getServerUser/);
    expect(actions).not.toMatch(/service_role/);
  });

  it("does not select story media_path or video_path in queries", () => {
    const queries = readRepoFile("lib/search/queries.ts");
    expect(queries).toMatch(/Never select media_path/);
    expect(queries).not.toMatch(/\.select\([^)]*media_path/);
    expect(queries).not.toMatch(/video_path,/);
    expect(queries).toMatch(/\.not\("video_path", "is", null\)/);
    expect(queries).toMatch(/\.eq\("media_status", "ready"\)/);
    expect(queries).toMatch(/quotedIlikePattern/);
    expect(queries).toMatch(/viewerId/);
    expect(queries).toMatch(/rememberRecentSearch/);
    expect(queries).toMatch(/clearRecentSearches/);
  });

  it("keeps /search public and wires AppTopNav", () => {
    expect(APP_ROUTES.search).toBe("/search");
    expect(isProtectedPath("/search")).toBe(false);
    const top = readRepoFile("app/components/AppTopNav.tsx");
    expect(top).toMatch(/APP_ROUTES\.search/);
    const page = readRepoFile("app/search/page.tsx");
    expect(page).toMatch(/SearchExperience/);
    const ui = readRepoFile("app/search/SearchExperience.tsx");
    expect(ui).toMatch(/SEARCH_TABS/);
    expect(ui).toMatch(/Recent/);
    expect(Object.keys(SEARCH_TAB_LABELS)).toEqual([
      "all",
      "people",
      "videos",
      "stories",
      "stores",
      "products",
    ]);
  });
});

describe("search documentation", () => {
  it("ships foundation docs", () => {
    const docs = readRepoFile("docs/search/GLOBAL_SEARCH_FOUNDATION_V1.md");
    expect(docs).toMatch(/Architecture/i);
    expect(docs).toMatch(/Database/i);
    expect(docs).toMatch(/Ranking/i);
    expect(docs).toMatch(/Security/i);
    expect(docs).toMatch(/Limitations/i);
    expect(docs).toMatch(/Next phases/i);
  });
});
