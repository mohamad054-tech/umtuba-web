import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WORLD_LAYER_KEYS,
  sanitizeWorldSearchRequest,
  sanitizeWorldSlug,
} from "./domain";
import {
  createExactReturnContext,
  isValidExactReturnContext,
} from "./exactContext";
import { sanitizeDiscoveryRequest } from "./discovery";
import {
  parseWorldCityProfile,
  parseWorldPlaceProfile,
} from "./profiles";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260826_world_discovery_domain_phase2.sql";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("World Phase 2 additive domain migration", () => {
  it("extends Foundation V1 with the next migration", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(
      existsSync(
        join(
          ROOT,
          "supabase/migrations/20260825_world_discovery_hello_city_foundation_v1.sql"
        )
      )
    ).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/alter table public\.world_cities/);
    expect(sql).toMatch(/alter table public\.world_places/);
  });

  it("normalizes country, region and district without duplicating city/place", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.world_countries/);
    expect(sql).toMatch(/create table if not exists public\.world_regions/);
    expect(sql).toMatch(/create table if not exists public\.world_districts/);
    expect(sql).not.toMatch(
      /create table if not exists public\.world_(hotels|restaurants|stores|attractions)/
    );
    for (const kind of [
      "point_of_interest",
      "business",
      "attraction",
      "hotel",
      "restaurant",
      "store",
      "local_service",
    ]) {
      expect(sql).toContain(`'${kind}'`);
    }
  });

  it("provides unified place profile readiness", () => {
    const sql = read(MIGRATION);
    const foundation = read(
      "supabase/migrations/20260825_world_discovery_hello_city_foundation_v1.sql"
    );
    for (const object of [
      "world_place_media",
      "world_place_links",
      "world_place_post_links",
      "world_place_live_links",
      "world_place_opening_hours",
      "world_business_profiles",
      "world_place_reviews",
      "world_place_ai_summaries",
    ]) {
      expect(sql).toContain(object);
    }
    expect(sql).toMatch(/get_world_place_profile/);
    expect(foundation).toMatch(/references public\.stores \(id\)/);
    expect(sql).toMatch(/public\.posts \(id\)/);
    expect(sql).toMatch(/public\.live_rooms \(id\)/);
  });

  it("supports hierarchical extensible categories with cycle protection", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /parent_id uuid references public\.world_place_categories/
    );
    expect(sql).toMatch(/prevent_world_category_cycle/);
    expect(sql).toMatch(/world_place_category_assignments/);
    for (const category of [
      "fast-food",
      "cafe",
      "fine-dining",
      "clothing",
      "electronics",
      "grocery",
      "luxury-hotel",
      "budget-hotel",
      "resort",
    ]) {
      expect(sql).toContain(`'${category}'`);
    }
  });

  it("keeps all layers modular and independently configurable", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.world_layers/);
    expect(sql).toMatch(/public\.world_city_layers/);
    expect(sql).toMatch(/public\.world_place_layers/);
    expect(sql).toMatch(/world_layer_enabled/);
    for (const layer of WORLD_LAYER_KEYS) expect(sql).toContain(`'${layer}'`);
    expect(sql).toMatch(/'community', false/);
    expect(sql).toMatch(/'events', false/);
    expect(sql).toMatch(/'ai', false/);
  });

  it("links Journey, Community, Hello City and Events without precise user geo", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.world_journeys/);
    expect(sql).toMatch(/public\.world_journey_posts/);
    expect(sql).toMatch(/public\.world_city_communities/);
    expect(sql).toMatch(/public\.world_local_events/);
    const eventTable = sql.slice(
      sql.indexOf("create table if not exists public.world_local_events"),
      sql.indexOf("create index if not exists world_journeys_public_idx")
    );
    expect(eventTable).not.toMatch(/\blatitude\b|\blongitude\b/);
    expect(sql).toMatch(/helloCityEnabled/);
  });

  it("searches only safe published entities and leaves AI/global search off", () => {
    const sql = read(MIGRATION);
    const search = sql.slice(
      sql.indexOf("create or replace function public.search_world_entities")
    );
    expect(search).toMatch(/world_feature_enabled\('world_discovery_enabled'\)/);
    expect(search).toMatch(/public\.is_public_world_place\(p\.id\)/);
    expect(search).toMatch(/c\.profile_status = 'published'/);
    expect(search).toMatch(/greatest\(1, least\(coalesce\(p_limit, 20\), 50\)\)/);
    expect(search).toMatch(/set search_path = public, extensions/);
    expect(search).not.toMatch(/openai|embedding|vector/i);
    expect(sql).toMatch(/reserved `places` type disabled/i);
  });

  it("uses FORCE RLS and fixed SECURITY DEFINER search paths", () => {
    const sql = read(MIGRATION);
    for (const table of [
      "world_place_media",
      "world_place_reviews",
      "world_journeys",
      "world_local_events",
      "world_city_communities",
    ]) {
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table} force row level security`)
      );
    }
    for (const fn of [
      "can_manage_world_place",
      "is_public_world_place",
      "world_layer_enabled",
      "get_world_place_profile",
      "get_world_city_profile",
      "search_world_entities",
    ]) {
      const section = sql.slice(
        sql.indexOf(`create or replace function public.${fn}`)
      );
      expect(section).toMatch(/security definer/);
      expect(section).toMatch(/set search_path = public/);
    }
  });

  it("prevents owner self-publication and audits admin moderation", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /create or replace function public\.protect_world_place_authority[\s\S]*new\.profile_status := 'draft'[\s\S]*new\.moderation_status := 'pending'/
    );
    expect(sql).toMatch(
      /create or replace function public\.protect_world_journey_authority[\s\S]*new\.moderation_status := old\.moderation_status/
    );
    expect(sql).toMatch(/create table if not exists public\.world_moderation_events/);
    expect(sql).toMatch(/admin_review_world_place/);
    expect(sql).toMatch(/admin_review_world_city/);
    expect(sql).toMatch(/admin_review_world_journey/);
  });

  it("retires unsafe V1 discovery and gates reviews and linked media", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /revoke execute on function public\.discover_world_places[\s\S]*from anon, authenticated/
    );
    expect(sql).toMatch(/world_place_reviews_enabled/);
    expect(sql).toMatch(/p\.reviews_status = 'enabled'/);
    expect(sql).toMatch(/is_video_post_publicly_visible/);
    const cityLayerPolicy = sql.slice(
      sql.indexOf('create policy "World city layers are public"'),
      sql.indexOf('drop policy if exists "World place layers are visible"')
    );
    expect(cityLayerPolicy).toMatch(/profile_status = 'published'/);
    expect(cityLayerPolicy).not.toMatch(/using \(true\)/);
  });
});

describe("World Phase 2 input and context contracts", () => {
  it("validates slugs and unified search filters", () => {
    expect(sanitizeWorldSlug("Berlin-Center")).toBe("berlin-center");
    expect(sanitizeWorldSlug("https://evil.example")).toBeNull();
    expect(
      sanitizeWorldSearchRequest({
        query: "  fine   dining ",
        entityTypes: ["restaurant", "category"],
      })
    ).toMatchObject({
      ok: true,
      value: { query: "fine dining" },
    });
    expect(
      sanitizeWorldSearchRequest({ query: "x", entityTypes: ["hotel"] }).ok
    ).toBe(false);
    expect(
      sanitizeWorldSearchRequest({
        query: "hotel",
        entityTypes: ["unsupported"],
      }).ok
    ).toBe(false);
  });

  it("accepts hierarchical category IDs for discovery", () => {
    const result = sanitizeDiscoveryRequest({
      destinationCityId: "11111111-1111-4111-8111-111111111111",
      categoryId: "22222222-2222-4222-8222-222222222222",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.categoryId).toBe(
        "22222222-2222-4222-8222-222222222222"
      );
    }
  });

  it("captures and validates exact place/city/journey/search context", () => {
    const context = createExactReturnContext({
      internalPath: "/world/place/example",
      selectedTab: "media",
      selectedFilters: { category: "cafe", city: "berlin" },
      openPlaceId: "11111111-1111-4111-8111-111111111111",
      openCityId: "22222222-2222-4222-8222-222222222222",
      currentJourneyId: "33333333-3333-4333-8333-333333333333",
      currentSearch: "best coffee",
      video: { videoId: "post-42", playbackTimeSeconds: 19.5 },
    });
    expect(context).toMatchObject({
      version: 2,
      selectedTab: "media",
      currentSearch: "best coffee",
    });
    expect(isValidExactReturnContext(context)).toBe(true);
  });

  it("rejects malformed restored entity IDs and search state", () => {
    const context = createExactReturnContext({
      internalPath: "/world",
      openPlaceId: "not-a-uuid",
      currentSearch: "x".repeat(100),
    });
    expect(context?.openPlaceId).toBeNull();
    expect(context?.currentSearch).toBeNull();
    expect(isValidExactReturnContext({ ...context, openCityId: "javascript:x" })).toBe(
      false
    );
  });

  it("parses safe profile RPC shapes and rejects incomplete profiles", () => {
    const layers = Object.fromEntries(WORLD_LAYER_KEYS.map((key) => [key, false]));
    expect(
      parseWorldPlaceProfile({
        id: "p",
        slug: "place",
        name: "Place",
        kind: "restaurant",
        latitude: 1,
        longitude: 2,
        city: {
          id: "c",
          slug: "city",
          name: "City",
          countryCode: "DE",
          countryName: "Germany",
        },
        categories: [],
        gallery: [],
        links: [],
        openingHours: [],
        postIds: [],
        liveRoomIds: [],
        layers,
      })
    ).not.toBeNull();
    expect(parseWorldPlaceProfile({ name: "Incomplete" })).toBeNull();
    expect(
      parseWorldCityProfile({
        id: "c",
        slug: "city",
        name: "City",
        countryCode: "DE",
        countryName: "Germany",
        centerLatitude: 1,
        centerLongitude: 2,
        layers,
      })
    ).not.toBeNull();
  });

  it("restores only after an external navigation actually departed", () => {
    const resume = read("app/components/world/ExactContextResume.tsx");
    const context = read("lib/world/exactContext.ts");
    expect(resume).toMatch(/shouldRestoreExternalNavigation/);
    expect(resume).toMatch(/markExternalNavigationDeparted/);
    expect(resume).toMatch(/window\.addEventListener\("blur"/);
    expect(context).toMatch(/departed: false/);
    expect(context).toMatch(/departed: true/);
  });

  it("has an exact-context consumer and producer for Watch video seek", () => {
    const watch = read("app/watch/WatchExperience.tsx");
    const feed = read("app/components/video/VerticalVideoFeed.tsx");
    const player = read("app/components/video/VideoPlayer.tsx");
    expect(watch).toMatch(/EXACT_CONTEXT_RESTORE_EVENT/);
    expect(watch).toMatch(/saveWatchExactContextDeparture/);
    expect(watch).toMatch(/consumeWatchVideoRestore/);
    expect(watch).toMatch(/restoreState=\{restoreVideoState\}/);
    expect(feed).toMatch(/restorePlaybackTimeSeconds/);
    expect(player).toMatch(/video\.currentTime =/);
  });
});
