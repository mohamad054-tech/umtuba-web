/**
 * Media-worker isolation helpers. Flag-off safe: only used when a worker runs.
 * Do not enable UGC_VIDEO_TRANSCODE from this module.
 */

import { closeSync, existsSync, mkdirSync, openSync, unlinkSync } from "node:fs";
import { statfs } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const DEFAULT_MEDIA_WORK_DIR = "/mnt/umtuba-data/media/work";
export const MEDIA_MIN_FREE_BYTES = 20 * 1024 * 1024 * 1024;
export const MEDIA_WORKER_CONCURRENCY = 1;

export function resolveMediaWorkRoot(
  env: NodeJS.ProcessEnv = process.env
): string {
  const fromEnv = (env.MEDIA_WORK_DIR || env.UMTUBA_MEDIA_WORK_DIR || "").trim();
  if (fromEnv) return fromEnv;
  if (existsSync(DEFAULT_MEDIA_WORK_DIR) || existsSync("/mnt/umtuba-data")) {
    return DEFAULT_MEDIA_WORK_DIR;
  }
  return tmpdir();
}

export function getMediaMinFreeBytes(
  env: NodeJS.ProcessEnv = process.env
): number {
  const raw = (env.UMTUBA_MEDIA_MIN_FREE_BYTES || "").trim();
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return MEDIA_MIN_FREE_BYTES;
}

export async function assertMediaWorkFreeSpace(
  root: string,
  minBytes = getMediaMinFreeBytes()
): Promise<
  { ok: true; freeBytes: number } | { ok: false; code: string; freeBytes: number }
> {
  try {
    mkdirSync(root, { recursive: true });
    const stats = await statfs(root);
    const freeBytes = Number(stats.bavail) * Number(stats.bsize);
    if (!Number.isFinite(freeBytes)) {
      return { ok: false, code: "work_space_unknown", freeBytes: -1 };
    }
    if (freeBytes < minBytes) {
      return { ok: false, code: "work_space_low", freeBytes };
    }
    return { ok: true, freeBytes };
  } catch {
    return { ok: false, code: "work_space_unknown", freeBytes: -1 };
  }
}

export type MediaWorkerLock = {
  release: () => void;
};

export function acquireMediaWorkerLock(
  root: string
): { ok: true; lock: MediaWorkerLock } | { ok: false; code: "worker_busy" } {
  mkdirSync(root, { recursive: true });
  const lockPath = join(root, "ugc-video.worker.lock");
  try {
    const fd = openSync(lockPath, "wx");
    return {
      ok: true,
      lock: {
        release: () => {
          try {
            closeSync(fd);
          } catch {
            // ignore
          }
          try {
            unlinkSync(lockPath);
          } catch {
            // ignore
          }
        },
      },
    };
  } catch {
    return { ok: false, code: "worker_busy" };
  }
}
