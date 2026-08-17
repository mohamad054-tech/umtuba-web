import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AppLocale } from "../i18n/locales";
import {
  PRODUCT_CATALOG_LOCALES,
  WAVE2_CATALOG_LOCALES,
  resolveCatalogLocaleText,
  type CatalogLocaleMap,
} from "./catalogLocales";
import { buildCityCopyV2Bundle } from "../../scripts/world/expansionV2Data";

export const WORLD_CITY_COPY_V2 = "data/world/catalog/city-copy-v2.json";

export type CityCopyRow = {
  slug: string;
  name_i18n: CatalogLocaleMap;
  overview: string;
  overview_i18n: CatalogLocaleMap;
};

export type CityCopyBundle = {
  id: string;
  version: string;
  locales: string[];
  reserved_locales: string[];
  cities: CityCopyRow[];
};

const cache = new Map<string, CityCopyBundle>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parseCityCopyBundle(value: unknown): CityCopyBundle {
  if (!isRecord(value) || !Array.isArray(value.cities)) {
    throw new Error("City copy bundle is invalid");
  }
  const cities: CityCopyRow[] = value.cities.map((row, index) => {
    if (!isRecord(row) || typeof row.slug !== "string" || typeof row.overview !== "string") {
      throw new Error(`city copy[${index}] is invalid`);
    }
    return {
      slug: row.slug,
      overview: row.overview,
      name_i18n: (isRecord(row.name_i18n) ? row.name_i18n : {}) as CatalogLocaleMap,
      overview_i18n: (isRecord(row.overview_i18n)
        ? row.overview_i18n
        : {}) as CatalogLocaleMap,
    };
  });
  return {
    id: String(value.id ?? "world-city-copy-v2"),
    version: String(value.version ?? "2.0.0"),
    locales: Array.isArray(value.locales)
      ? value.locales.map(String)
      : [...PRODUCT_CATALOG_LOCALES],
    reserved_locales: Array.isArray(value.reserved_locales)
      ? value.reserved_locales.map(String)
      : [...WAVE2_CATALOG_LOCALES],
    cities,
  };
}

export function bundledCityCopy(): CityCopyBundle {
  return parseCityCopyBundle(buildCityCopyV2Bundle());
}

export function loadCityCopyBundle(
  rootDir: string,
  relativePath = WORLD_CITY_COPY_V2
): CityCopyBundle {
  const key = resolve(rootDir, relativePath);
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const bundle = parseCityCopyBundle(JSON.parse(readFileSync(key, "utf8")));
    cache.set(key, bundle);
    return bundle;
  } catch {
    const bundle = bundledCityCopy();
    cache.set(key, bundle);
    return bundle;
  }
}

export function findCityCopy(
  bundle: CityCopyBundle,
  slug: string
): CityCopyRow | null {
  return bundle.cities.find((city) => city.slug === slug) ?? null;
}

export function resolveCityDisplayName(
  bundle: CityCopyBundle,
  slug: string,
  locale: AppLocale,
  fallback: string
): string {
  const row = findCityCopy(bundle, slug);
  return (
    resolveCatalogLocaleText(locale, row?.name_i18n, fallback) ?? fallback
  );
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildCityCopyEnrichSql(bundle: CityCopyBundle): string {
  const values = bundle.cities
    .map((city) => `  (${sqlLiteral(city.slug)}, ${sqlLiteral(city.overview)})`)
    .join(",\n");
  return `-- UMTUBA World catalog ingest — OVERVIEW enrich (all catalog cities)
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

export function resolveCityOverview(
  bundle: CityCopyBundle,
  slug: string,
  locale: AppLocale,
  fallback: string | null
): string | null {
  const row = findCityCopy(bundle, slug);
  return resolveCatalogLocaleText(
    locale,
    {
      en: row?.overview,
      ...row?.overview_i18n,
    },
    fallback
  );
}
