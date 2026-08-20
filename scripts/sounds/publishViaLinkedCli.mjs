#!/usr/bin/env node
/**
 * Publish generated originals using the already-linked Supabase CLI.
 * Does not read or print service-role keys.
 *
 * Usage (from any cwd; --workdir is the linked umtuba-web checkout):
 *   node scripts/sounds/publishViaLinkedCli.mjs --phase=1 --dry-run
 *   node scripts/sounds/publishViaLinkedCli.mjs --phase=all
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST = join(ROOT, "scripts/sounds/catalog.v1.json");
const GENERATED_DIR = join(ROOT, "tmp-sound-catalog-v1");
const UPLOAD_ROOT = join(ROOT, "tmp-sound-catalog-v1", "upload");
const SQL_OUT = join(ROOT, "tmp-sound-catalog-v1", "publish.sql");
const PHASES = { 1: [0, 20], 2: [20, 50], 3: [50, 100], all: [0, 100] };
const LINKED_WORKDIR = "D:\\umtuba-central\\repos\\umtuba-web";

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildSql(assets, confirmation) {
  const values = assets.map((asset) => {
    return `(
      ${sqlLiteral(asset.id)}::uuid,
      ${sqlLiteral(asset.title)},
      ${sqlLiteral(asset.storagePath)},
      ${Number(asset.durationMs)}
    )`;
  });
  return `-- Additive Sound Library V1 catalog publish. No 20260931.
-- Owner = oldest platform_admins.user_id. Idempotent on id.
with owner as (
  select user_id
  from public.platform_admins
  order by created_at asc
  limit 1
),
payload(id, title, storage_path, duration_ms) as (
  values
    ${values.join(",\n    ")}
)
insert into public.social_sounds (
  id,
  owner_user_id,
  source_type,
  title,
  storage_bucket,
  storage_path,
  duration_ms,
  visibility,
  reuse_permission,
  rights_status,
  rights_confirmed_at,
  rights_confirmation_text,
  moderation_status,
  usage_count
)
select
  p.id,
  o.user_id,
  'platform',
  p.title,
  'social-sounds',
  p.storage_path,
  p.duration_ms,
  'public_reusable',
  'public',
  'platform_licensed',
  now(),
  ${sqlLiteral(confirmation)},
  'clean',
  0
from payload p
cross join owner o
on conflict (id) do update
set
  title = excluded.title,
  storage_path = excluded.storage_path,
  duration_ms = excluded.duration_ms,
  visibility = excluded.visibility,
  reuse_permission = excluded.reuse_permission,
  rights_status = excluded.rights_status,
  rights_confirmed_at = excluded.rights_confirmed_at,
  rights_confirmation_text = excluded.rights_confirmation_text,
  moderation_status = excluded.moderation_status
where public.social_sounds.rights_status not in ('blocked', 'takedown');

select count(*)::int as published_platform_sounds
from public.social_sounds
where source_type = 'platform'
  and rights_status = 'platform_licensed'
  and visibility = 'public_reusable';
`;
}

function main() {
  const phaseKey = argValue("phase", "all");
  const range = PHASES[phaseKey];
  if (!range) throw new Error("Use --phase=1|2|3|all");
  if (!existsSync(MANIFEST)) throw new Error("Generate catalog first");
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const assets = (manifest.assets || []).slice(range[0], range[1]);
  if (!assets.length) throw new Error("No assets in phase");

  mkdirSync(UPLOAD_ROOT, { recursive: true });
  for (const asset of assets) {
    const localPath = existsSync(join(GENERATED_DIR, `${asset.slug}.m4a`))
      ? join(GENERATED_DIR, `${asset.slug}.m4a`)
      : join(GENERATED_DIR, `${asset.slug}.wav`);
    if (!existsSync(localPath)) {
      throw new Error(`Missing ${asset.slug}`);
    }
    const dest = join(UPLOAD_ROOT, asset.storagePath.replaceAll("/", "\\"));
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(localPath, dest);
  }
  writeFileSync(SQL_OUT, buildSql(assets, manifest.confirmation), "utf8");

  if (hasFlag("dry-run")) {
    console.log(
      JSON.stringify(
        {
          STATUS: "DRY_RUN",
          PHASE: phaseKey,
          ASSETS: assets.length,
          SQL_OUT,
          UPLOAD_ROOT,
        },
        null,
        2
      )
    );
    return;
  }

  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  // Destination is the bucket root. `cp -r local/sounds ss:///social-sounds`
  // yields sounds/<category>/file.m4a. Do not append /sounds or paths nest.
  // Windows: copy to a relative path first; drive-letter src is treated as a URL.
  execFileSync(
    npx,
    [
      "supabase",
      "storage",
      "cp",
      "-r",
      "--experimental",
      "--linked",
      "--workdir",
      LINKED_WORKDIR,
      "--content-type",
      "audio/mp4",
      "tmp-sound-upload/sounds",
      "ss:///social-sounds",
    ],
    { stdio: "inherit", shell: true, cwd: LINKED_WORKDIR }
  );
  execFileSync(
    npx,
    [
      "supabase",
      "db",
      "query",
      "--linked",
      "--workdir",
      LINKED_WORKDIR,
      "-f",
      SQL_OUT,
    ],
    { stdio: "inherit" }
  );
  console.log(
    JSON.stringify(
      { STATUS: "PUBLISHED_VIA_LINKED_CLI", PHASE: phaseKey, ASSETS: assets.length },
      null,
      2
    )
  );
}

main();
