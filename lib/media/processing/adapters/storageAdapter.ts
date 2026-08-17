/**
 * Unified storage adapter — processors talk paths/buckets, not transport details.
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveMediaWorkRoot } from "./mediaWorkIsolation";

export type StorageDownloadInput = {
  bucket: string;
  path: string;
  destFile: string;
};

export type StorageUploadInput = {
  bucket: string;
  path: string;
  localFile: string;
  contentType: string;
  upsert?: boolean;
};

export type TempWorkspace = {
  workDir: string;
  file: (...parts: string[]) => string;
  cleanup: () => Promise<void>;
};

export async function createTempWorkspace(prefix = "umtuba-media-"): Promise<TempWorkspace> {
  const root = resolveMediaWorkRoot();
  await fs.mkdir(root, { recursive: true });
  const workDir = await fs.mkdtemp(join(root, prefix));
  return {
    workDir,
    file: (...parts: string[]) => join(workDir, ...parts),
    cleanup: async () => {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    },
  };
}

export async function downloadToFile(
  supabase: SupabaseClient,
  input: StorageDownloadInput
): Promise<{ ok: true; path: string } | { ok: false; code: string }> {
  const path = input.path.replace(new RegExp(`^${input.bucket}/`), "");
  const { data, error } = await supabase.storage.from(input.bucket).download(path);
  if (error || !data) {
    return { ok: false, code: "download_failed" };
  }
  const buffer = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(input.destFile, buffer);
  return { ok: true, path: input.destFile };
}

export async function downloadHttpOrStorage(
  supabase: SupabaseClient,
  assetPath: string | null | undefined,
  destFile: string,
  defaultBucket: string
): Promise<string | null> {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) {
    const res = await fetch(assetPath);
    if (!res.ok) return null;
    await fs.writeFile(destFile, Buffer.from(await res.arrayBuffer()));
    return destFile;
  }
  const bucket =
    assetPath.startsWith("post-images/") || assetPath.startsWith(`${defaultBucket}/`)
      ? assetPath.split("/")[0] ?? defaultBucket
      : defaultBucket;
  const path = assetPath.replace(/^post-images\//, "").replace(new RegExp(`^${bucket}/`), "");
  const result = await downloadToFile(supabase, {
    bucket,
    path,
    destFile,
  });
  return result.ok ? result.path : null;
}

export async function uploadFile(
  supabase: SupabaseClient,
  input: StorageUploadInput
): Promise<{ ok: true; path: string } | { ok: false; code: string }> {
  const fileBuffer = await fs.readFile(input.localFile);
  const { error } = await supabase.storage.from(input.bucket).upload(input.path, fileBuffer, {
    contentType: input.contentType,
    upsert: input.upsert ?? true,
  });
  if (error) return { ok: false, code: "upload_failed" };
  return { ok: true, path: input.path };
}

export async function safeCleanupPath(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await fs.rm(path, { recursive: true, force: true }).catch(() => undefined);
}
