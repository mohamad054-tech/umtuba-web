import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  MEDIA_MIN_FREE_BYTES,
  MEDIA_WORKER_CONCURRENCY,
  acquireMediaWorkerLock,
  getMediaMinFreeBytes,
  resolveMediaWorkRoot,
} from "./mediaWorkIsolation";

const scratch = join(tmpdir(), `umtuba-iso-test-${Date.now()}`);

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("media worker isolation", () => {
  it("prefers MEDIA_WORK_DIR then the data-volume path", () => {
    expect(resolveMediaWorkRoot({ MEDIA_WORK_DIR: "D:/media-work" })).toBe(
      "D:/media-work"
    );
    expect(resolveMediaWorkRoot({ UMTUBA_MEDIA_WORK_DIR: "/data/work" })).toBe(
      "/data/work"
    );
    const fallback = resolveMediaWorkRoot({});
    expect(fallback === tmpdir() || fallback.endsWith("/media/work")).toBe(true);
  });

  it("defaults the free-space guard to 20 GiB", () => {
    expect(MEDIA_MIN_FREE_BYTES).toBe(20 * 1024 * 1024 * 1024);
    expect(getMediaMinFreeBytes({})).toBe(MEDIA_MIN_FREE_BYTES);
    expect(getMediaMinFreeBytes({ UMTUBA_MEDIA_MIN_FREE_BYTES: "1048576" })).toBe(
      1_048_576
    );
  });

  it("enforces concurrency=1 via an exclusive lockfile", () => {
    expect(MEDIA_WORKER_CONCURRENCY).toBe(1);
    mkdirSync(scratch, { recursive: true });
    const first = acquireMediaWorkerLock(scratch);
    expect(first.ok).toBe(true);
    const second = acquireMediaWorkerLock(scratch);
    expect(second.ok).toBe(false);
    if (second.ok === false) expect(second.code).toBe("worker_busy");
    if (first.ok) first.lock.release();
    const third = acquireMediaWorkerLock(scratch);
    expect(third.ok).toBe(true);
    if (third.ok) third.lock.release();
    expect(existsSync(join(scratch, "ugc-video.worker.lock"))).toBe(false);
  });

  it("does not treat a leftover file without exclusive create as a new lock", () => {
    mkdirSync(scratch, { recursive: true });
    writeFileSync(join(scratch, "ugc-video.worker.lock"), "held");
    const locked = acquireMediaWorkerLock(scratch);
    expect(locked.ok).toBe(false);
  });
});
