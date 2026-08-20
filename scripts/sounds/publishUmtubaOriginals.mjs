#!/usr/bin/env node
/**
 * Upload generated UMTUBA originals to the private social-sounds bucket
 * and insert platform_licensed social_sounds rows.
 *
 * Credentials: env only. Never printed.
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional --env-file=PATH (KEY=VALUE lines; values not logged)
 *
 * Usage:
 *   node scripts/sounds/publishUmtubaOriginals.mjs --phase=1 --dry-run
 *   node scripts/sounds/publishUmtubaOriginals.mjs --phase=all
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFEST = join(ROOT, "scripts/sounds/catalog.v1.json");
const PHASES = { 1: [0, 20], 2: [20, 50], 3: [50, 100], all: [0, 100] };

function argValue(name, fallback = "") {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function loadEnvFile(path) {
  if (!path || !existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function resolveUrlAndKey() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    "";
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env");
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.replace(/\/$/, ""))) {
    // Accept also custom host but require https.
    if (!url.startsWith("https://")) {
      throw new Error("SUPABASE_URL must be https");
    }
  }
  return { url: url.replace(/\/$/, ""), key };
}

function mimeForPath(storagePath) {
  if (storagePath.endsWith(".m4a")) return "audio/mp4";
  if (storagePath.endsWith(".mp3")) return "audio/mpeg";
  if (storagePath.endsWith(".wav")) return "audio/wav";
  if (storagePath.endsWith(".aac")) return "audio/aac";
  throw new Error(`Unsupported codec path: ${storagePath}`);
}

async function resolveOwnerId(admin) {
  const forced = process.env.UMTUBA_SOUND_PLATFORM_OWNER_ID || "";
  if (forced) {
    if (!/^[0-9a-f-]{36}$/i.test(forced)) {
      throw new Error("UMTUBA_SOUND_PLATFORM_OWNER_ID is not a uuid");
    }
    return forced;
  }
  const { data, error } = await admin
    .from("platform_admins")
    .select("user_id")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`platform_admins lookup failed: ${error.message}`);
  const id = data?.[0]?.user_id;
  if (!id) throw new Error("No platform_admins row; cannot own platform sounds");
  return id;
}

async function main() {
  const envFile = argValue("env-file");
  if (envFile) loadEnvFile(resolve(envFile));
  const phaseKey = argValue("phase", "all");
  const range = PHASES[phaseKey];
  if (!range) throw new Error("Use --phase=1|2|3|all");
  const dryRun = hasFlag("dry-run");
  if (!existsSync(MANIFEST)) {
    throw new Error("Run generateUmtubaOriginals.mjs first");
  }
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const assets = (manifest.assets || []).slice(range[0], range[1]);
  if (assets.length === 0) {
    throw new Error("No assets in selected phase");
  }

  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          STATUS: "DRY_RUN",
          PHASE: phaseKey,
          ASSETS: assets.length,
          FIRST: assets[0]?.title,
          LAST: assets[assets.length - 1]?.title,
        },
        null,
        2
      )
    );
    return;
  }

  const { url, key } = resolveUrlAndKey();
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ownerUserId = await resolveOwnerId(admin);
  const confirmedAt = new Date().toISOString();
  let uploaded = 0;
  let inserted = 0;
  let skipped = 0;

  for (const asset of assets) {
    const generatedDir = join(ROOT, "tmp-sound-catalog-v1");
    const localPath = existsSync(join(generatedDir, `${asset.slug}.m4a`))
      ? join(generatedDir, `${asset.slug}.m4a`)
      : join(generatedDir, `${asset.slug}.wav`);
    if (!existsSync(localPath)) {
      throw new Error(`Missing local file for ${asset.slug}`);
    }
    const bytes = readFileSync(localPath);
    const contentType = mimeForPath(asset.storagePath);
    const { error: upError } = await admin.storage
      .from("social-sounds")
      .upload(asset.storagePath, bytes, {
        contentType,
        upsert: true,
      });
    if (upError) throw new Error(`upload ${asset.slug}: ${upError.message}`);
    uploaded += 1;

    const row = {
      id: asset.id,
      owner_user_id: ownerUserId,
      source_type: "platform",
      title: asset.title,
      storage_bucket: "social-sounds",
      storage_path: asset.storagePath,
      duration_ms: asset.durationMs,
      visibility: "public_reusable",
      reuse_permission: "public",
      rights_status: "platform_licensed",
      rights_confirmed_at: confirmedAt,
      rights_confirmation_text: manifest.confirmation,
      moderation_status: "clean",
      usage_count: 0,
    };

    const { data: existing, error: existError } = await admin
      .from("social_sounds")
      .select("id,rights_status")
      .eq("id", asset.id)
      .maybeSingle();
    if (existError) throw new Error(`select ${asset.slug}: ${existError.message}`);
    if (existing) {
      const { error: updError } = await admin
        .from("social_sounds")
        .update({
          title: row.title,
          storage_path: row.storage_path,
          duration_ms: row.duration_ms,
          visibility: row.visibility,
          reuse_permission: row.reuse_permission,
          rights_status: row.rights_status,
          rights_confirmed_at: row.rights_confirmed_at,
          rights_confirmation_text: row.rights_confirmation_text,
          moderation_status: row.moderation_status,
        })
        .eq("id", asset.id)
        .neq("rights_status", "takedown");
      if (updError) throw new Error(`update ${asset.slug}: ${updError.message}`);
      skipped += 1;
      continue;
    }

    const { error: insError } = await admin.from("social_sounds").insert(row);
    if (insError) throw new Error(`insert ${asset.slug}: ${insError.message}`);
    inserted += 1;
  }

  const { data: rpcRows, error: rpcError } = await admin.rpc(
    "search_social_sounds",
    { p_query: "UMTUBA", p_limit: 50 }
  );
  if (rpcError) throw new Error(`search_social_sounds: ${rpcError.message}`);

  const { count, error: countError } = await admin
    .from("social_sounds")
    .select("id", { count: "exact", head: true })
    .eq("source_type", "platform")
    .eq("rights_status", "platform_licensed")
    .eq("visibility", "public_reusable");
  if (countError) throw new Error(`count: ${countError.message}`);

  console.log(
    JSON.stringify(
      {
        STATUS: "PUBLISHED",
        PHASE: phaseKey,
        UPLOADED: uploaded,
        INSERTED: inserted,
        UPDATED_EXISTING: skipped,
        RPC_UMTUBA_HITS: Array.isArray(rpcRows) ? rpcRows.length : 0,
        ACTIVE_PRODUCTION_SOUNDS: count ?? null,
        OWNER_RESOLVED: "platform_admins",
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "publish failed");
  process.exit(1);
});
