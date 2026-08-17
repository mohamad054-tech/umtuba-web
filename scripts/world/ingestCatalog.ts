import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  WORLD_CATALOG_EXPANSION_MANIFEST,
  WORLD_CATALOG_PILOT_MANIFEST,
  buildDraftUpsertSql,
  buildOverviewEnrichSql,
  buildPublishSql,
  buildUnpublishSql,
  loadWorldCatalogManifest,
  summarizeCatalog,
} from "../../lib/world/catalogIngest";
import {
  WORLD_CITY_COPY_V2,
  buildCityCopyEnrichSql,
  loadCityCopyBundle,
} from "../../lib/world/cityCatalogCopy";

type Mode = "dry-run" | "write-sql" | "apply-draft" | "publish" | "unpublish";

function parseMode(argv: string[]): Mode {
  const raw = argv.find((arg) => arg.startsWith("--mode="))?.slice(7) ?? "dry-run";
  if (
    raw === "dry-run" ||
    raw === "write-sql" ||
    raw === "apply-draft" ||
    raw === "publish" ||
    raw === "unpublish"
  ) {
    return raw;
  }
  throw new Error(
    "Invalid --mode. Use dry-run | write-sql | apply-draft | publish | unpublish"
  );
}

function parseManifestPath(argv: string[]): string {
  return (
    argv.find((arg) => arg.startsWith("--manifest="))?.slice(11) ??
    WORLD_CATALOG_EXPANSION_MANIFEST
  );
}

function sqlPrefix(manifestId: string): string {
  if (manifestId.includes("pilot")) return "pilot_v1";
  if (manifestId.includes("expansion")) return "expansion_v2";
  return manifestId.replace(/[^a-z0-9]+/g, "_");
}

function writeSqlFiles(root: string, files: Record<string, string>) {
  const dir = join(root, "supabase", "world_catalog");
  mkdirSync(dir, { recursive: true });
  for (const [name, sql] of Object.entries(files)) {
    writeFileSync(join(dir, name), sql, "utf8");
  }
}

async function main() {
  const root = resolve(process.cwd());
  const argv = process.argv.slice(2);
  const mode = parseMode(argv);
  const manifestPath = parseManifestPath(argv);
  const parsed = loadWorldCatalogManifest(root, manifestPath);
  if (!parsed.ok) {
    console.error("WORLD_CATALOG_INVALID");
    for (const error of parsed.errors) console.error(`- ${error}`);
    process.exit(1);
  }

  const prefix = sqlPrefix(parsed.manifest.id);
  const copyBundle = loadCityCopyBundle(root, WORLD_CITY_COPY_V2);
  const files = {
    [`${prefix}_upsert_draft.sql`]: buildDraftUpsertSql(parsed.manifest),
    [`${prefix}_publish.sql`]: buildPublishSql(parsed.manifest),
    [`${prefix}_unpublish.sql`]: buildUnpublishSql(parsed.manifest),
    [`${prefix}_overview_enrich.sql`]: buildOverviewEnrichSql(parsed.manifest),
    "city_copy_v2_overview_enrich.sql": buildCityCopyEnrichSql(copyBundle),
  };
  writeSqlFiles(root, files);

  const summary = summarizeCatalog(parsed.manifest);
  console.log(
    JSON.stringify(
      {
        ok: true,
        mode,
        manifest: manifestPath,
        fallbackPilotManifest: WORLD_CATALOG_PILOT_MANIFEST,
        ...summary,
        sqlFiles: Object.keys(files).map((name) => `supabase/world_catalog/${name}`),
        applyHint:
          "Apply with: supabase db query --linked --file supabase/world_catalog/<file>.sql",
      },
      null,
      2
    )
  );

  if (mode === "dry-run" || mode === "write-sql") return;

  console.error(
    `Mode ${mode} writes SQL only from this script. Apply the matching file with supabase db query --linked (no secrets printed).`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "ingest failed");
  process.exit(1);
});
