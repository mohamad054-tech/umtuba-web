import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { slugifyCity } from "../../app/lib/journey/handoff";
import { LIVING_CITIES } from "../../app/components/landing/living-earth/livingEarthData";
import { demoVideos } from "../../app/data/videos";
import {
  DUPLICATE_POLICY,
  LOCALIZATION_MODEL,
  MEDIA_POLICY,
  PLACE_OWNERSHIP_POLICY,
  PROVENANCE_POLICY,
  WORLD_CATALOG_CURATED_PLACES_MANIFEST,
  WORLD_CATALOG_PILOT_MANIFEST,
  buildDraftUpsertSql,
  buildPlaceDraftUpsertSql,
  buildPlacePublishSql,
  buildPlaceUnpublishSql,
  buildPublishSql,
  buildUnpublishSql,
  loadWorldCatalogManifest,
  parseWorldCatalogManifest,
} from "./catalogIngest";
import { buildExpansionV2Manifest } from "../../scripts/world/expansionV2Data";

const ROOT = process.cwd();

describe("World catalog pilot ingest", () => {
  const parsed = loadWorldCatalogManifest(ROOT);

  it("loads a valid provenance-aware pilot manifest", () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.manifest.id).toBe("world-catalog-pilot-v1");
    expect(parsed.manifest.countries).toHaveLength(8);
    expect(parsed.manifest.cities).toHaveLength(8);
    expect(parsed.manifest.places).toHaveLength(0);
    expect(parsed.manifest.publication).toBe("draft");
  });

  it("covers Living Earth cities and Cairo from demo video evidence", () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const slugs = new Set(parsed.manifest.cities.map((city) => city.slug));
    for (const city of LIVING_CITIES) {
      expect(slugs.has(slugifyCity(city.name))).toBe(true);
    }
    expect(demoVideos.some((video) => video.location.city === "Cairo")).toBe(
      true
    );
    expect(slugs.has("cairo")).toBe(true);
    expect(slugs.has("amman")).toBe(true);
  });

  it("keeps Explore This City slugs aligned with city names", () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    for (const city of parsed.manifest.cities) {
      expect(city.slug).toBe(slugifyCity(city.city_name));
    }
  });

  it("rejects invented places without a real owner", () => {
    const raw = JSON.parse(
      readFileSync(join(ROOT, WORLD_CATALOG_PILOT_MANIFEST), "utf8")
    );
    raw.places = [
      {
        slug: "fake-pyramid",
        name: "Fake Pyramid",
        city_slug: "cairo",
        category: "attraction",
        place_kind: "attraction",
        latitude: 29.9792,
        longitude: 31.1342,
        provenance: {
          kind: "public_geographic_fact",
          source: "none",
          citation: "invented",
        },
      },
    ];
    const result = parseWorldCatalogManifest(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toMatch(/curated_by|owner_user_id/);
  });

  it("rejects a fake owner UUID on a platform place", () => {
    const raw = JSON.parse(
      readFileSync(join(ROOT, WORLD_CATALOG_PILOT_MANIFEST), "utf8")
    );
    raw.places = [
      {
        slug: "fake-owned-pyramid",
        name: "Fake Owned Pyramid",
        city_slug: "cairo",
        category: "attraction",
        place_kind: "attraction",
        latitude: 29.9792,
        longitude: 31.1342,
        curated_by: "platform",
        source_type: "platform",
        owner_user_id: "00000000-0000-4000-8000-000000000001",
        provenance: {
          kind: "public_geographic_fact",
          source: "https://en.wikipedia.org/wiki/Cairo",
          citation: "invented owner",
        },
      },
    ];
    const result = parseWorldCatalogManifest(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(" ")).toMatch(/omit owner_user_id/);
  });

  it("generates idempotent draft SQL that will not overwrite published rows", () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const sql = buildDraftUpsertSql(parsed.manifest);
    expect(sql).toMatch(/on conflict \(country_code\) do update/);
    expect(sql).toMatch(/on conflict \(slug\) do update/);
    expect(sql).toMatch(/profile_status = 'draft'/);
    expect(sql).toMatch(
      /where public\.world_cities\.profile_status = 'draft'/
    );
    expect(sql).toMatch(/verification_status in \('unverified', 'pending'\)/);
    expect(sql).not.toMatch(/drop table/i);
    expect(sql).not.toMatch(/nearby_places_enabled',\s*true/);
  });

  it("publish and unpublish are visibility-only", () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const publish = buildPublishSql(parsed.manifest);
    const unpublish = buildUnpublishSql(parsed.manifest);
    expect(publish).toMatch(/profile_status = 'published'/);
    expect(publish).toMatch(/slug in \('jerusalem'/);
    expect(unpublish).toMatch(/profile_status = 'draft'/);
    expect(unpublish).not.toMatch(/delete from public\.world_cities/i);
    expect(DUPLICATE_POLICY).toMatch(/Published or verified rows are left untouched/);
    expect(PROVENANCE_POLICY).toMatch(/Provenance lives in the versioned manifest/);
    expect(LOCALIZATION_MODEL).toMatch(/Do not machine-translate proper nouns/);
  });
});

describe("World catalog expansion v2", () => {
  const parsed = parseWorldCatalogManifest(buildExpansionV2Manifest());

  it("loads a verified expansion batch without places or media", () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.manifest.id).toBe("world-catalog-expansion-v2");
    expect(parsed.manifest.cities.length).toBeGreaterThanOrEqual(40);
    expect(parsed.manifest.places).toHaveLength(0);
    expect(parsed.manifest.cities.every((city) => city.overview)).toBe(true);
    expect(parsed.manifest.cities.every((city) => city.overview_i18n?.ar)).toBe(
      true
    );
    expect(
      parsed.manifest.cities.every((city) => !("cover_media_path" in city))
    ).toBe(true);
  });

  it("keeps expansion slugs aligned with Explore This City", () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    for (const city of parsed.manifest.cities) {
      expect(city.slug).toBe(slugifyCity(city.city_name));
    }
  });
});

describe("World curated places pilot v1", () => {
  const parsed = loadWorldCatalogManifest(
    ROOT,
    WORLD_CATALOG_CURATED_PLACES_MANIFEST
  );

  it("loads 13 platform-curated places with provenance and no owners", () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.manifest.id).toBe("world-catalog-curated-places-pilot-v1");
    expect(parsed.manifest.places).toHaveLength(13);
    expect(
      parsed.manifest.places.every(
        (place) =>
          place.curated_by === "platform" &&
          place.source_type === "platform" &&
          !place.owner_user_id &&
          place.provenance.kind === "public_geographic_fact"
      )
    ).toBe(true);
    expect(PLACE_OWNERSHIP_POLICY).toMatch(/never creates auth.users/i);
    expect(MEDIA_POLICY).toMatch(/No catalog media/);
  });

  it("generates GUC-gated reversible place SQL without fake users or media", () => {
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const draft = buildPlaceDraftUpsertSql(parsed.manifest);
    const publish = buildPlacePublishSql(parsed.manifest);
    const unpublish = buildPlaceUnpublishSql(parsed.manifest);
    expect(draft).toMatch(/umtuba\.world_catalog_ingest/);
    expect(draft).toMatch(/curated_by = 'platform'/);
    expect(draft).toMatch(/owner_user_id is null/);
    expect(draft).not.toMatch(/insert into auth\.users/i);
    expect(draft).not.toMatch(/cover_media/);
    expect(publish).toMatch(/profile_status = 'published'/);
    expect(publish).toMatch(/moderation_status = 'approved'/);
    expect(unpublish).toMatch(/profile_status = 'draft'/);
    expect(unpublish).not.toMatch(/delete from public\.world_places/i);
    expect(unpublish).not.toMatch(/drop table/i);
    expect(draft).not.toMatch(/nearby_places_enabled',\s*true/);
  });
});
