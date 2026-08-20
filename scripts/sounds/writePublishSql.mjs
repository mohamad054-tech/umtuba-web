#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST = join(ROOT, "scripts/sounds/catalog.v1.json");
const SQL_OUT = join(ROOT, "scripts/sounds/publishCatalog.v1.sql");

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const assets = manifest.assets || [];
const values = assets.map(
  (asset) => `    (
      ${sqlLiteral(asset.id)}::uuid,
      ${sqlLiteral(asset.title)},
      ${sqlLiteral(asset.storagePath)},
      ${Number(asset.durationMs)}
    )`
);
const sql = `-- Additive Sound Library V1 catalog publish. No 20260931.
-- Owner = oldest platform_admins.user_id. Idempotent on id.
-- UPDATE in place for existing rows (titles + storage_path + duration).
with owner as (
  select user_id
  from public.platform_admins
  order by created_at asc
  limit 1
),
payload(id, title, storage_path, duration_ms) as (
  values
${values.join(",\n")}
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
  ${sqlLiteral(manifest.confirmation)},
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
writeFileSync(SQL_OUT, sql, "utf8");
console.log(JSON.stringify({ STATUS: "SQL_WRITTEN", COUNT: assets.length, SQL_OUT }));
