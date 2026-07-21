import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildWorldPlaceMediaPath,
  isOwnedWorldPlaceMediaPath,
  WORLD_PLACE_MEDIA_BUCKET,
} from "./media";
import { sanitizeWorldOutboundUrl } from "./safeUrl";
import {
  clearExactReturnContext,
  consumeWatchVideoRestore,
  createExactReturnContext,
  isValidExactReturnContext,
  saveExactReturnContext,
  saveWatchExactContextDeparture,
} from "./exactContext";

const ROOT = process.cwd();
const HARDENING =
  "supabase/migrations/20260827_world_discovery_security_hardening_v1.sql";
const FOUNDATION =
  "supabase/migrations/20260825_world_discovery_hello_city_foundation_v1.sql";
const PHASE2 =
  "supabase/migrations/20260826_world_discovery_domain_phase2.sql";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("World Discovery security hardening migration", () => {
  it("exists after Phase 2 with unique version", () => {
    expect(existsSync(join(ROOT, HARDENING))).toBe(true);
    expect(existsSync(join(ROOT, PHASE2))).toBe(true);
    expect(existsSync(join(ROOT, FOUNDATION))).toBe(true);
  });

  it("splits public city/category reads away from is_platform_admin for anon", () => {
    const sql = read(HARDENING);
    const foundation = read(FOUNDATION);
    const publicCityStart = foundation.indexOf(
      'create policy "Active world cities are public"'
    );
    const publicCityEnd = foundation.indexOf(
      'drop policy if exists "Platform admins read all world cities"'
    );
    const publicCity = foundation.slice(publicCityStart, publicCityEnd);
    expect(publicCity).toMatch(/using \(is_active\);/);
    expect(publicCity).not.toContain("is_platform_admin");
    expect(sql).toMatch(
      /Active world cities are public[\s\S]*using \(is_active and profile_status = 'published'\)/
    );
    expect(sql).toMatch(
      /Active world place categories are public[\s\S]*using \(is_active\)/
    );
    expect(sql).not.toMatch(/grant execute on function public\.is_platform_admin/);
  });

  it("keeps unpublished cities out of the public policy predicate", () => {
    const sql = read(HARDENING);
    const cityPolicy = sql.slice(
      sql.indexOf('create policy "Active world cities are public"'),
      sql.indexOf("-- Admin bypass already covered by \"Platform admins manage world cities\"")
    );
    expect(cityPolicy).toContain("profile_status = 'published'");
    expect(cityPolicy).not.toContain("is_platform_admin");
  });

  it("blocks place managers from enabling platform-only layers", () => {
    const sql = read(HARDENING);
    expect(sql).toMatch(/world_platform_only_layer_keys/);
    expect(sql).toMatch(/'community', 'events', 'ai'/);
    expect(sql).toMatch(/world_place_manager_layer_keys/);
    expect(sql).toMatch(/'discovery', 'media', 'commerce', 'journey', 'live'/);
    expect(sql).toMatch(/protect_world_place_layer_authority/);
    expect(sql).toMatch(/cannot be configured by place managers/);
  });

  it("backfills only Foundation-compatible public records", () => {
    const phase2 = read(PHASE2);
    const hardening = read(HARDENING);
    expect(phase2).toMatch(
      /update public\.world_cities[\s\S]*profile_status = 'published'[\s\S]*is_active[\s\S]*profile_status = 'draft'/
    );
    expect(phase2).toMatch(
      /update public\.world_places[\s\S]*location_visibility = 'public'[\s\S]*moderation_status = 'approved'[\s\S]*verification_status = 'verified'/
    );
    expect(hardening).toMatch(/profile_status compatibility backfill/i);
  });

  it("requires ownership to link posts and live rooms", () => {
    const sql = read(HARDENING);
    expect(sql).toMatch(/can_link_world_post/);
    expect(sql).toMatch(/p\.user_id = auth\.uid\(\)/);
    expect(sql).toMatch(/can_link_world_live_room/);
    expect(sql).toMatch(/r\.host_id = auth\.uid\(\)/);
    expect(sql).toMatch(/protect_world_place_post_link_authority/);
    expect(sql).toMatch(/protect_world_place_live_link_authority/);
    expect(sql).toMatch(/protect_world_journey_post_link_authority/);
    expect(sql).toMatch(/Post ownership required to link this post/);
  });

  it("creates a private world-place-media bucket with owned paths", () => {
    const sql = read(HARDENING);
    expect(sql).toMatch(/'world-place-media'/);
    expect(sql).toMatch(/public = false|public = excluded\.public/);
    expect(sql).toMatch(/places\/\{place_id\}/);
    expect(sql).toMatch(/Public may select approved world place media/);
    expect(sql).toMatch(/new\.storage_bucket := 'world-place-media'/);
  });

  it("prevents cross-city districts and cross-place covers", () => {
    const sql = read(HARDENING);
    expect(sql).toMatch(/protect_world_place_district/);
    expect(sql).toMatch(/district must belong to the same city/);
    expect(sql).toMatch(/protect_world_place_cover_media/);
    expect(sql).toMatch(/cover media must belong to the same place/);
  });

  it("forces Hello City author identity and audited admin actors", () => {
    const sql = read(HARDENING);
    expect(sql).toMatch(/protect_hello_city_post_authority/);
    expect(sql).toMatch(/new\.author_id := auth\.uid\(\)/);
    expect(sql).toMatch(
      /Audited World admin actions require an authenticated platform admin actor/
    );
  });

  it("allowlists https/tel/mailto for place links", () => {
    const sql = read(HARDENING);
    expect(sql).toMatch(/sanitize_world_place_link_url/);
    expect(sql).toMatch(/https:\/\/|tel:|mailto:/);
    expect(sql).toMatch(/must use https, tel, or mailto/);
  });
});

describe("World place media path helpers", () => {
  it("builds and validates owned paths only", () => {
    const placeId = "11111111-1111-4111-8111-111111111111";
    const path = buildWorldPlaceMediaPath(placeId, "abc", "jpg");
    expect(path).toBe(`places/${placeId}/abc.jpg`);
    expect(isOwnedWorldPlaceMediaPath(placeId, path)).toBe(true);
    expect(isOwnedWorldPlaceMediaPath(placeId, "places/other/x.jpg")).toBe(
      false
    );
    expect(isOwnedWorldPlaceMediaPath(placeId, `places/${placeId}/../x`)).toBe(
      false
    );
    expect(WORLD_PLACE_MEDIA_BUCKET).toBe("world-place-media");
  });
});

describe("World outbound URL allowlist", () => {
  it("allows https tel mailto and rejects unsafe schemes", () => {
    expect(sanitizeWorldOutboundUrl("https://example.com/x")).toContain(
      "https://example.com/x"
    );
    expect(sanitizeWorldOutboundUrl("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(sanitizeWorldOutboundUrl("tel:+15551212")).toBe("tel:+15551212");
    expect(sanitizeWorldOutboundUrl("http://example.com")).toBeNull();
    expect(sanitizeWorldOutboundUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeWorldOutboundUrl("data:text/html,hi")).toBeNull();
  });
});

describe("Watch Exact Context producer", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        sessionStorage: {
          getItem: (key: string) => memory.get(key) ?? null,
          setItem: (key: string, value: string) => {
            memory.set(key, value);
          },
          removeItem: (key: string) => {
            memory.delete(key);
          },
        },
      },
    });
  });

  afterEach(() => {
    clearExactReturnContext();
    // @ts-expect-error test cleanup
    delete globalThis.window;
  });

  it("saves then restores the same video and playback position", () => {
    const saved = saveWatchExactContextDeparture({
      videoId: "video-42",
      playbackTimeSeconds: 18.5,
      feedIndex: 3,
      departure: "world",
    });
    expect(saved?.video).toEqual({
      videoId: "video-42",
      playbackTimeSeconds: 18.5,
    });
    expect(saved?.selectedFilters.feedIndex).toBe("3");
    const restored = consumeWatchVideoRestore();
    expect(restored).toEqual({
      videoId: "video-42",
      playbackTimeSeconds: 18.5,
      feedIndex: 3,
    });
    expect(consumeWatchVideoRestore()).toBeNull();
  });

  it("falls back when video is missing from the departure snapshot", () => {
    const saved = saveWatchExactContextDeparture({
      videoId: null,
      playbackTimeSeconds: 12,
      departure: "world",
    });
    expect(saved?.video).toBeNull();
    expect(consumeWatchVideoRestore()).toBeNull();
  });

  it("rejects stale or invalid restored context", () => {
    const expired = createExactReturnContext({
      internalPath: "/watch",
      video: { videoId: "v1", playbackTimeSeconds: 1 },
      now: 1,
    })!;
    expect(isValidExactReturnContext(expired, expired.expiresAt + 1)).toBe(
      false
    );
    expect(
      isValidExactReturnContext({
        ...expired,
        video: { videoId: "v1", playbackTimeSeconds: -1 },
      })
    ).toBe(false);
  });

  it("preserves prior Watch video across external directions context writes", () => {
    saveWatchExactContextDeparture({
      videoId: "watch-1",
      playbackTimeSeconds: 9,
      departure: "world",
    });
    const prior = createExactReturnContext({
      internalPath: "/world/place/example",
      video: { videoId: "watch-1", playbackTimeSeconds: 9 },
      openPlaceId: "11111111-1111-4111-8111-111111111111",
    })!;
    expect(saveExactReturnContext(prior)).toBe(true);
    expect(prior.video?.videoId).toBe("watch-1");
  });

  it("leaves non-video World context unaffected", () => {
    const worldOnly = createExactReturnContext({
      internalPath: "/world",
      selectedTab: "places",
      currentSearch: "hotel",
    })!;
    expect(worldOnly.video).toBeNull();
    expect(saveExactReturnContext(worldOnly)).toBe(true);
    expect(consumeWatchVideoRestore()).toBeNull();
  });
});