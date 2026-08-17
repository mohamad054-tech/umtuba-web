import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PRODUCT_CATALOG_LOCALES,
  WAVE2_CATALOG_LOCALES,
  isCatalogLocale,
  type CatalogLocaleMap,
} from "./catalogLocales";

export const WORLD_CATALOG_PILOT_MANIFEST =
  "data/world/catalog/pilot-v1.json";

export const WORLD_CATALOG_EXPANSION_MANIFEST =
  "data/world/catalog/expansion-v2.json";

export const DUPLICATE_POLICY =
  "Natural keys: world_countries.country_code, world_cities.slug. Insert if missing. Countries never rename on conflict. Cities update coordinates/timezone/name/overview only while profile_status=draft and verification_status in (unverified, pending). Published or verified rows are left untouched unless an explicit publish/unpublish visibility command or null-only overview enrich is used.";

export const PROVENANCE_POLICY =
  "Every city must cite umtuba_project_evidence or a public_geographic_fact with source + citation. Provenance lives in the versioned manifest (cities have no provenance columns). Do not invent businesses, ratings, hours, reviews, prices, or photos. world_places.owner_user_id is NOT NULL and references auth.users; platform landmarks stay out until a curated-place model is applied.";

export const LOCALIZATION_MODEL =
  "English overview uses existing world_cities.overview. Localized city names and descriptions live in the versioned manifest locale map (ar,en,fr,es,de,pt required when overview is present; tr,id,zh,hi,ja,ru reserved). UI chrome stays on existing World i18n catalogs. Do not machine-translate proper nouns.";

export const MEDIA_POLICY =
  "No catalog media in V2. Cover paths stay null unless a later batch has documented rights, provenance, attribution, and a replaceable hosted asset. No hotlinked third-party images.";

export type CatalogProvenanceKind =
  | "umtuba_project_evidence"
  | "public_geographic_fact";

export type CatalogProvenance = {
  kind: CatalogProvenanceKind;
  source: string;
  citation: string;
};

export type CatalogCountry = {
  country_code: string;
  name: string;
  slug: string;
};

export type CatalogDiscoveryMeta = {
  region: string;
  categories: string[];
};

export type CatalogCity = {
  slug: string;
  city_name: string;
  country_code: string;
  center_latitude: number;
  center_longitude: number;
  timezone_name?: string;
  overview?: string;
  name_i18n?: CatalogLocaleMap;
  overview_i18n?: CatalogLocaleMap;
  discovery?: CatalogDiscoveryMeta;
  provenance: CatalogProvenance;
};

export type CatalogPlace = {
  slug: string;
  name: string;
  city_slug: string;
  category: string;
  place_kind: string;
  latitude: number;
  longitude: number;
  owner_user_id: string;
  provenance: CatalogProvenance;
  description?: string;
};

export type WorldCatalogManifest = {
  id: string;
  version: string;
  publication: "draft" | "published";
  notes?: string;
  countries: CatalogCountry[];
  cities: CatalogCity[];
  places: CatalogPlace[];
};

export type CatalogValidation =
  | { ok: true; manifest: WorldCatalogManifest }
  | { ok: false; errors: string[] };

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function parseLocaleMap(
  value: unknown,
  label: string,
  errors: string[],
  requiredProductLocales: readonly string[]
): CatalogLocaleMap | undefined {
  if (value == null) {
    if (requiredProductLocales.length) {
      errors.push(`${label} locale map is required`);
    }
    return undefined;
  }
  if (!isRecord(value)) {
    errors.push(`${label} locale map must be an object`);
    return undefined;
  }
  const map: CatalogLocaleMap = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!isCatalogLocale(key)) {
      errors.push(`${label} has unsupported locale ${key}`);
      continue;
    }
    const text = asString(raw);
    if (!text) {
      errors.push(`${label}.${key} must be non-empty when present`);
      continue;
    }
    if (text.length > 10000) {
      errors.push(`${label}.${key} is too long`);
      continue;
    }
    map[key] = text;
  }
  for (const locale of requiredProductLocales) {
    if (!map[locale as keyof CatalogLocaleMap]) {
      errors.push(`${label}.${locale} is required`);
    }
  }
  return map;
}

function parseDiscovery(
  value: unknown,
  label: string,
  errors: string[]
): CatalogDiscoveryMeta | undefined {
  if (value == null) return undefined;
  if (!isRecord(value)) {
    errors.push(`${label} discovery must be an object`);
    return undefined;
  }
  const region = asString(value.region);
  if (!region || region.length > 40) {
    errors.push(`${label} discovery.region is invalid`);
  }
  if (!Array.isArray(value.categories) || value.categories.length === 0) {
    errors.push(`${label} discovery.categories must be a non-empty array`);
    return region ? { region, categories: [] } : undefined;
  }
  const categories: string[] = [];
  for (const [index, item] of value.categories.entries()) {
    const category = asString(item);
    if (!category || category.length > 40) {
      errors.push(`${label} discovery.categories[${index}] is invalid`);
      continue;
    }
    categories.push(category);
  }
  return region ? { region, categories } : undefined;
}

function parseProvenance(value: unknown, label: string, errors: string[]) {
  if (!isRecord(value)) {
    errors.push(`${label} provenance is required`);
    return null;
  }
  const kind = asString(value.kind);
  const source = asString(value.source);
  const citation = asString(value.citation);
  if (
    kind !== "umtuba_project_evidence" &&
    kind !== "public_geographic_fact"
  ) {
    errors.push(`${label} provenance.kind is invalid`);
  }
  if (!source) errors.push(`${label} provenance.source is required`);
  if (!citation) errors.push(`${label} provenance.citation is required`);
  if (
    (kind === "umtuba_project_evidence" ||
      kind === "public_geographic_fact") &&
    source &&
    citation
  ) {
    return { kind, source, citation } satisfies CatalogProvenance;
  }
  return null;
}

export function parseWorldCatalogManifest(value: unknown): CatalogValidation {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { ok: false, errors: ["Catalog manifest must be an object"] };
  }

  const id = asString(value.id);
  const version = asString(value.version);
  const publication = asString(value.publication);
  if (!id) errors.push("id is required");
  if (!version) errors.push("version is required");
  if (publication !== "draft" && publication !== "published") {
    errors.push("publication must be draft or published");
  }
  if (!Array.isArray(value.countries) || value.countries.length === 0) {
    errors.push("countries must be a non-empty array");
  }
  if (!Array.isArray(value.cities) || value.cities.length === 0) {
    errors.push("cities must be a non-empty array");
  }
  if (!Array.isArray(value.places)) {
    errors.push("places must be an array (empty is allowed)");
  }

  const countries: CatalogCountry[] = [];
  const countryCodes = new Set<string>();
  const countrySlugs = new Set<string>();
  const countryRows = Array.isArray(value.countries) ? value.countries : [];
  for (const [index, row] of countryRows.entries()) {
    if (!isRecord(row)) {
      errors.push(`countries[${index}] is invalid`);
      continue;
    }
    const country_code = asString(row.country_code)?.toUpperCase() ?? "";
    const name = asString(row.name) ?? "";
    const slug = asString(row.slug) ?? "";
    if (!COUNTRY_RE.test(country_code)) {
      errors.push(`countries[${index}].country_code is invalid`);
    }
    if (name.length < 2 || name.length > 120) {
      errors.push(`countries[${index}].name is invalid`);
    }
    if (!SLUG_RE.test(slug)) {
      errors.push(`countries[${index}].slug is invalid`);
    }
    if (countryCodes.has(country_code)) {
      errors.push(`duplicate country_code ${country_code}`);
    }
    if (countrySlugs.has(slug)) {
      errors.push(`duplicate country slug ${slug}`);
    }
    countryCodes.add(country_code);
    countrySlugs.add(slug);
    countries.push({ country_code, name, slug });
  }

  const cities: CatalogCity[] = [];
  const citySlugs = new Set<string>();
  const cityRows = Array.isArray(value.cities) ? value.cities : [];
  for (const [index, row] of cityRows.entries()) {
    if (!isRecord(row)) {
      errors.push(`cities[${index}] is invalid`);
      continue;
    }
    const slug = asString(row.slug) ?? "";
    const city_name = asString(row.city_name) ?? "";
    const country_code = asString(row.country_code)?.toUpperCase() ?? "";
    const center_latitude = asNumber(row.center_latitude);
    const center_longitude = asNumber(row.center_longitude);
    const timezone_name = asString(row.timezone_name) ?? undefined;
    const overview = asString(row.overview) ?? undefined;
    if (overview && overview.length > 10000) {
      errors.push(`cities[${index}].overview is too long`);
    }
    const name_i18n = parseLocaleMap(
      row.name_i18n,
      `cities[${index}].name_i18n`,
      errors,
      overview ? PRODUCT_CATALOG_LOCALES.filter((locale) => locale !== "en") : []
    );
    const overview_i18n = parseLocaleMap(
      row.overview_i18n,
      `cities[${index}].overview_i18n`,
      errors,
      overview
        ? PRODUCT_CATALOG_LOCALES.filter((locale) => locale !== "en")
        : []
    );
    const discovery = parseDiscovery(row.discovery, `cities[${index}]`, errors);
    if (!SLUG_RE.test(slug)) errors.push(`cities[${index}].slug is invalid`);
    if (city_name.length < 2 || city_name.length > 120) {
      errors.push(`cities[${index}].city_name is invalid`);
    }
    if (!countryCodes.has(country_code)) {
      errors.push(`cities[${index}] country_code ${country_code} is unknown`);
    }
    if (
      center_latitude == null ||
      center_latitude < -90 ||
      center_latitude > 90
    ) {
      errors.push(`cities[${index}].center_latitude is invalid`);
    }
    if (
      center_longitude == null ||
      center_longitude < -180 ||
      center_longitude > 180
    ) {
      errors.push(`cities[${index}].center_longitude is invalid`);
    }
    if (timezone_name && timezone_name.length > 80) {
      errors.push(`cities[${index}].timezone_name is too long`);
    }
    if (citySlugs.has(slug)) errors.push(`duplicate city slug ${slug}`);
    citySlugs.add(slug);
    const provenance = parseProvenance(row.provenance, `cities[${index}]`, errors);
    if (
      provenance &&
      SLUG_RE.test(slug) &&
      city_name.length >= 2 &&
      countryCodes.has(country_code) &&
      center_latitude != null &&
      center_longitude != null
    ) {
      cities.push({
        slug,
        city_name,
        country_code,
        center_latitude,
        center_longitude,
        timezone_name,
        overview,
        name_i18n,
        overview_i18n,
        discovery,
        provenance,
      });
    }
  }

  const places: CatalogPlace[] = [];
  const placeSlugs = new Set<string>();
  const placeRows = Array.isArray(value.places) ? value.places : [];
  for (const [index, row] of placeRows.entries()) {
    if (!isRecord(row)) {
      errors.push(`places[${index}] is invalid`);
      continue;
    }
    const slug = asString(row.slug) ?? "";
    const name = asString(row.name) ?? "";
    const city_slug = asString(row.city_slug) ?? "";
    const category = asString(row.category) ?? "";
    const place_kind = asString(row.place_kind) ?? "";
    const latitude = asNumber(row.latitude);
    const longitude = asNumber(row.longitude);
    const owner = asString(row.owner_user_id);
    const description = asString(row.description) ?? undefined;
    if (!SLUG_RE.test(slug)) errors.push(`places[${index}].slug is invalid`);
    if (name.length < 2 || name.length > 160) {
      errors.push(`places[${index}].name is invalid`);
    }
    if (!citySlugs.has(city_slug)) {
      errors.push(`places[${index}] city_slug ${city_slug} is unknown`);
    }
    if (!category) errors.push(`places[${index}].category is required`);
    if (!place_kind) errors.push(`places[${index}].place_kind is required`);
    if (latitude == null || latitude < -90 || latitude > 90) {
      errors.push(`places[${index}].latitude is invalid`);
    }
    if (longitude == null || longitude < -180 || longitude > 180) {
      errors.push(`places[${index}].longitude is invalid`);
    }
    if (!owner || !UUID_RE.test(owner)) {
      errors.push(
        `places[${index}] requires a real owner_user_id; do not invent a catalog owner`
      );
    }
    if (description) {
      errors.push(
        `places[${index}].description must be omitted unless a sourced description is added in a later batch`
      );
    }
    if (placeSlugs.has(slug)) errors.push(`duplicate place slug ${slug}`);
    placeSlugs.add(slug);
    const provenance = parseProvenance(row.provenance, `places[${index}]`, errors);
    if (
      provenance &&
      owner &&
      UUID_RE.test(owner) &&
      SLUG_RE.test(slug) &&
      citySlugs.has(city_slug) &&
      latitude != null &&
      longitude != null &&
      !description
    ) {
      places.push({
        slug,
        name,
        city_slug,
        category,
        place_kind,
        latitude,
        longitude,
        owner_user_id: owner,
        provenance,
      });
    }
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    manifest: {
      id: id!,
      version: version!,
      publication: publication as "draft" | "published",
      notes: asString(value.notes) ?? undefined,
      countries,
      cities,
      places,
    },
  };
}

export function loadWorldCatalogManifest(
  rootDir: string,
  relativePath = WORLD_CATALOG_PILOT_MANIFEST
): CatalogValidation {
  const raw = JSON.parse(readFileSync(resolve(rootDir, relativePath), "utf8"));
  return parseWorldCatalogManifest(raw);
}

export function citySlugsSqlList(manifest: WorldCatalogManifest): string {
  return manifest.cities.map((city) => sqlLiteral(city.slug)).join(", ");
}

export function buildDraftUpsertSql(manifest: WorldCatalogManifest): string {
  const countryValues = manifest.countries
    .map(
      (country) =>
        `  (${sqlLiteral(country.country_code)}, ${sqlLiteral(country.name)}, ${sqlLiteral(country.slug)}, true)`
    )
    .join(",\n");

  const cityValues = manifest.cities
    .map((city) => {
      const timezone = city.timezone_name
        ? sqlLiteral(city.timezone_name)
        : "null";
      const overview = city.overview ? sqlLiteral(city.overview) : "null";
      return `  (${sqlLiteral(city.slug)}, ${sqlLiteral(city.city_name)}, ${sqlLiteral(city.country_code)}, ${sqlNumber(city.center_latitude)}, ${sqlNumber(city.center_longitude)}, ${timezone}, ${overview})`;
    })
    .join(",\n");

  return `-- UMTUBA World catalog ingest — DRAFT upsert
-- Idempotent. Does not overwrite published/verified curated cities.
-- Rollback = unpublish, not DROP. No schema migration.

begin;

insert into public.world_countries (country_code, name, slug, is_active)
values
${countryValues}
on conflict (country_code) do update
set is_active = true
where public.world_countries.is_active is distinct from true;

insert into public.world_cities (
  slug,
  city_name,
  country_code,
  country_name,
  country_id,
  center_latitude,
  center_longitude,
  timezone_name,
  overview,
  is_active,
  profile_status,
  verification_status
)
select
  v.slug,
  v.city_name,
  c.country_code,
  c.name,
  c.id,
  v.center_latitude,
  v.center_longitude,
  v.timezone_name,
  v.overview,
  true,
  'draft',
  'unverified'
from (
  values
${cityValues}
) as v(slug, city_name, country_code, center_latitude, center_longitude, timezone_name, overview)
join public.world_countries c on c.country_code = v.country_code
on conflict (slug) do update
set
  city_name = excluded.city_name,
  country_code = excluded.country_code,
  country_name = excluded.country_name,
  country_id = excluded.country_id,
  center_latitude = excluded.center_latitude,
  center_longitude = excluded.center_longitude,
  timezone_name = excluded.timezone_name,
  overview = excluded.overview,
  updated_at = timezone('utc', now())
where public.world_cities.profile_status = 'draft'
  and public.world_cities.verification_status in ('unverified', 'pending');

commit;
`;
}

export function buildOverviewEnrichSql(manifest: WorldCatalogManifest): string {
  const rows = manifest.cities.filter((city) => city.overview);
  if (!rows.length) {
    return `-- No overviews to enrich\nselect 0 as enriched_overviews;\n`;
  }
  const values = rows
    .map((city) => `  (${sqlLiteral(city.slug)}, ${sqlLiteral(city.overview!)})`)
    .join(",\n");
  return `-- UMTUBA World catalog ingest — OVERVIEW enrich
-- Fills empty overview only. Does not change published coordinates, names, or visibility.

begin;

update public.world_cities c
set
  overview = v.overview,
  updated_at = timezone('utc', now())
from (
  values
${values}
) as v(slug, overview)
where c.slug = v.slug
  and (c.overview is null or btrim(c.overview) = '');

commit;
`;
}

export function buildPublishSql(manifest: WorldCatalogManifest): string {
  return `-- UMTUBA World catalog pilot ingest — PUBLISH verified geo skeleton
-- Visibility only. Does not DROP. Does not invent places or media.

begin;

update public.world_cities
set
  profile_status = 'published',
  verification_status = 'verified',
  is_active = true,
  updated_at = timezone('utc', now())
where slug in (${citySlugsSqlList(manifest)})
  and profile_status in ('draft', 'published')
  and is_active;

commit;
`;
}

export function buildUnpublishSql(manifest: WorldCatalogManifest): string {
  return `-- UMTUBA World catalog pilot ingest — UNPUBLISH (rollback)
-- Visibility only. Rows remain. No DROP.

begin;

update public.world_cities
set
  profile_status = 'draft',
  updated_at = timezone('utc', now())
where slug in (${citySlugsSqlList(manifest)});

commit;
`;
}

export function summarizeCatalog(manifest: WorldCatalogManifest) {
  return {
    id: manifest.id,
    version: manifest.version,
    countries: manifest.countries.map((country) => country.country_code),
    cities: manifest.cities.map((city) => city.slug),
    places: manifest.places.map((place) => place.slug),
    countryCount: manifest.countries.length,
    cityCount: manifest.cities.length,
    placeCount: manifest.places.length,
    citiesWithOverview: manifest.cities.filter((city) => city.overview).length,
    reservedWave2Locales: [...WAVE2_CATALOG_LOCALES],
  };
}
