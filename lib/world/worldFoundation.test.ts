import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildExternalDirectionsUrl,
  sanitizeDirectionsText,
} from "./directions";
import {
  buildExactContextHref,
  createExactReturnContext,
  isValidExactReturnContext,
  sanitizeInternalPath,
} from "./exactContext";
import { sanitizeDiscoveryRequest } from "./discovery";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260825_world_discovery_hello_city_foundation_v1.sql";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

describe("World Discovery migration security contracts", () => {
  it("uses World foundation migration 20260825", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(MIGRATION).toContain("20260825_world_discovery_hello_city_foundation_v1");
    expect(
      existsSync(
        join(
          ROOT,
          "supabase/migrations/20260821_store_checkout_shipping_fee_ambiguous_code_fix.sql"
        )
      )
    ).toBe(true);
  });

  it("defaults discovery/GPS/Hello City/arrival off and directions on", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/'world_discovery_enabled', false/);
    expect(sql).toMatch(/'nearby_places_enabled', false/);
    expect(sql).toMatch(/'external_directions_enabled', true/);
    expect(sql).toMatch(/'hello_city_enabled', false/);
    expect(sql).toMatch(/'arrival_detection_enabled', false/);
    expect(sql).toMatch(/world_feature_flag_events/);
    expect(sql).toMatch(/require_platform_admin/);
  });

  it("returns only approved, verified, public places ordered by distance", () => {
    const sql = read(MIGRATION);
    const discover = sql.slice(
      sql.indexOf("create or replace function public.discover_world_places")
    );
    expect(discover).toMatch(/location_visibility = 'public'/);
    expect(discover).toMatch(/moderation_status = 'approved'/);
    expect(discover).toMatch(/verification_status = 'verified'/);
    expect(discover).toMatch(/p_category is null or p.category = p_category/);
    expect(discover).toMatch(/order by[\s\S]*world_distance_km/);
    expect(discover).toMatch(/least\(coalesce\(p_limit, 20\), 50\)/);
    expect(discover).toMatch(/least\(coalesce\(p_offset, 0\), 500\)/);
    expect(discover).toMatch(/world_feature_enabled\('nearby_places_enabled'\)/);
  });

  it("keeps private owner authority and coordinates out of public Hello City", () => {
    const sql = read(MIGRATION);
    const hello = sql.slice(
      sql.indexOf("create table if not exists public.hello_city_posts")
    );
    expect(hello).not.toMatch(/\blatitude\b|\blongitude\b/);
    expect(sql).toMatch(/minor_or_age_unverified boolean not null default true/);
    expect(sql).toMatch(/safe_audience := case when is_protected then 'followers'/);
    expect(sql).toMatch(/private_messages_allowed[\s\S]*false/);
    expect(sql).toMatch(/Hello City publishing rate limit reached/);
    expect(sql).toMatch(/explicitly_published/);
  });

  it("uses fixed search paths and revokes direct Hello City publication", () => {
    const sql = read(MIGRATION);
    for (const fn of [
      "discover_world_places",
      "publish_hello_city_post",
      "list_public_hello_city_posts",
      "admin_set_world_feature_flag",
    ]) {
      const slice = sql.slice(
        sql.indexOf(`create or replace function public.${fn}`)
      );
      expect(slice).toMatch(/security definer/);
      expect(slice).toMatch(/set search_path = public/);
    }
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.hello_city_posts from anon, authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.publish_hello_city_post[\s\S]*from public, anon/
    );
  });

  it("keeps public city reads free of is_platform_admin for anon", () => {
    const sql = read(MIGRATION);
    const start = sql.indexOf('create policy "Active world cities are public"');
    const end = sql.indexOf(
      'drop policy if exists "Platform admins read all world cities"'
    );
    const policy = sql.slice(start, end);
    expect(policy).toMatch(/using \(is_active\)/);
    expect(policy).not.toContain("is_platform_admin");
  });
});

describe("external Google Maps directions", () => {
  it("builds a safe universal Google Maps coordinate URL", () => {
    const url = buildExternalDirectionsUrl({
      latitude: 31.7683,
      longitude: 35.2137,
      label: "Old City",
    });
    expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\//);
    expect(url).toContain("api=1");
    expect(url).toContain("destination=31.7683%2C35.2137");
  });

  it("encodes text fallback and rejects raw URL injection", () => {
    const url = buildExternalDirectionsUrl({
      destinationText: "Cafe & Hotel, Berlin",
    });
    expect(url).toContain("Cafe+%26+Hotel%2C+Berlin");
    expect(sanitizeDirectionsText("javascript:alert(1)")).toBeNull();
    expect(sanitizeDirectionsText("https://evil.example")).toBeNull();
    expect(
      buildExternalDirectionsUrl({ destinationText: "//evil.example" })
    ).toBeNull();
  });
});

describe("Return to Exact Context", () => {
  it("supports non-video internal pages", () => {
    const context = createExactReturnContext({
      internalPath: "/store/example/product/item",
      routeParams: { tab: "details", unsafe: "drop-me" },
      scrollY: 420,
      selectedTab: "details",
    });
    expect(context?.video).toBeNull();
    expect(context?.internalPath).toBe("/store/example/product/item");
    expect(context?.routeParams).toEqual({ tab: "details" });
    expect(buildExactContextHref(context!)).toBe(
      "/store/example/product/item?tab=details"
    );
  });

  it("stores video state only when complete video state exists", () => {
    const withoutTime = createExactReturnContext({
      internalPath: "/watch",
      video: { videoId: "video-1" },
    });
    const withTime = createExactReturnContext({
      internalPath: "/watch",
      video: { videoId: "video-1", playbackTimeSeconds: 12.5 },
    });
    expect(withoutTime?.video).toBeNull();
    expect(withTime?.video).toEqual({
      videoId: "video-1",
      playbackTimeSeconds: 12.5,
    });
  });

  it("rejects external/open-redirect paths and expired contexts", () => {
    expect(sanitizeInternalPath("https://evil.example")).toBeNull();
    expect(sanitizeInternalPath("//evil.example")).toBeNull();
    expect(sanitizeInternalPath("/store/../admin")).toBeNull();
    const expired = createExactReturnContext({
      internalPath: "/search",
      now: 1,
    })!;
    expect(isValidExactReturnContext(expired, expired.expiresAt + 1)).toBe(false);
  });
});

describe("optional location and destination-only discovery", () => {
  it("allows destination discovery without GPS", () => {
    const result = sanitizeDiscoveryRequest({
      destinationCityId: "11111111-1111-1111-1111-111111111111",
      radiusKm: 25,
      category: "cafe",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.latitude).toBeNull();
      expect(result.value.destinationCityId).toBeTruthy();
    }
  });

  it("rejects partial coordinates and invalid categories", () => {
    expect(sanitizeDiscoveryRequest({ latitude: 10 }).ok).toBe(false);
    expect(
      sanitizeDiscoveryRequest({
        destinationCityId: "11111111-1111-1111-1111-111111111111",
        category: "casino",
      }).ok
    ).toBe(false);
  });

  it("exposes all permission fallback states in the client", () => {
    const client = read("app/world/WorldDiscoveryClient.tsx");
    for (const state of [
      "not_requested",
      "granted",
      "denied",
      "unavailable",
      "destination_only",
    ]) {
      expect(client).toContain(state);
    }
    expect(client).not.toMatch(/watchPosition/);
  });
});
