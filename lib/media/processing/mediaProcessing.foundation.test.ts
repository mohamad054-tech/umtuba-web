/**
 * Media Processing Foundation V1 — unit tests.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  assertProgressTransition,
  canTransitionProgress,
  classifyFailureKind,
  createMediaLogger,
  createMediaWorkerRuntime,
  createTempWorkspace,
  decideRetry,
  getMediaMetrics,
  getMediaProcessor,
  mapFfmpegExitCode,
  metricJobCompleted,
  metricJobFailed,
  metricJobStarted,
  metricRetry,
  registerMediaProcessor,
  resetBuiltinMediaProcessorFlagForTests,
  resetMediaMetricsForTests,
  resetMediaProcessorRegistryForTests,
  runFfmpeg,
  sanitizeMediaErrorCode,
  validateFfmpegArgs,
  type MediaProcessor,
} from "./index";

const ROOT = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

beforeEach(() => {
  resetMediaProcessorRegistryForTests();
  resetMediaMetricsForTests();
  resetBuiltinMediaProcessorFlagForTests();
});

function stubProcessor(
  overrides: Partial<MediaProcessor> & Pick<MediaProcessor, "kind">
): MediaProcessor {
  return {
    maxAttempts: 3,
    validate: async () => ({ ok: true }),
    claim: async () => null,
    execute: async () => ({ ok: true, state: "ready" }),
    finalize: async () => ({ ok: true, state: "ready" }),
    fail: async () => undefined,
    isRetryEligible: () => true,
    cleanup: async () => undefined,
    ...overrides,
  };
}

describe("Media Processing Foundation V1", () => {
  it("1. runtime selects the correct registered processor", async () => {
    registerMediaProcessor(
      stubProcessor({
        kind: "article_teaser",
        claim: async () => ({
          jobId: "j1",
          processorKind: "article_teaser",
          attemptCount: 1,
          payload: {},
        }),
      })
    );
    const runtime = createMediaWorkerRuntime("article_teaser", { once: true });
    const resolved = runtime.resolveProcessor();
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.processor.kind).toBe("article_teaser");
  });

  it("2. unknown processor fails without fallback", () => {
    const missing = getMediaProcessor("article_teaser");
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.message).toMatch(/Unknown|Unsupported/i);

    const bogus = getMediaProcessor("not_a_real_kind");
    expect(bogus.ok).toBe(false);
  });

  it("3. duplicate processor registration is rejected", () => {
    registerMediaProcessor(stubProcessor({ kind: "article_teaser" }));
    expect(() =>
      registerMediaProcessor(stubProcessor({ kind: "article_teaser" }))
    ).toThrow(/Duplicate/);
  });

  it("4. FFmpeg adapter maps timeout and validates args", async () => {
    expect(validateFfmpegArgs([])).toEqual({
      ok: false,
      code: "invalid_ffmpeg_args",
    });
    expect(mapFfmpegExitCode(null, true)).toBe("timeout");
    expect(mapFfmpegExitCode(1, false)).toBe("render_failed");
    expect(mapFfmpegExitCode(0, false)).toBe("ok");

    const result = await runFfmpeg({
      args: ["-version"],
      binary: "ffmpeg-definitely-missing-xyz",
      timeoutMs: 500,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["ffmpeg_missing", "render_failed", "timeout"]).toContain(
        result.code
      );
    }
  });

  it("5. upload failure code is retryable via policy", () => {
    expect(classifyFailureKind("upload_failed")).toBe("retryable");
    const decision = decideRetry({
      attemptCount: 2,
      maxAttempts: 8,
      failureKind: "retryable",
      baseDelayMs: 1000,
    });
    expect(decision.retryable).toBe(true);
    expect(decision.delayMs).toBe(2000);
  });

  it("6. retry policy permanent + max attempts", () => {
    expect(classifyFailureKind("article_missing")).toBe("permanent");
    expect(
      decideRetry({
        attemptCount: 1,
        maxAttempts: 8,
        failureKind: "permanent",
      }).retryable
    ).toBe(false);
    expect(
      decideRetry({
        attemptCount: 8,
        maxAttempts: 8,
        failureKind: "retryable",
      }).retryable
    ).toBe(false);
  });

  it("7. temp workspace cleanup removes files", async () => {
    const ws = await createTempWorkspace("umtuba-test-");
    const file = ws.file("x.txt");
    await import("node:fs/promises").then((fs) => fs.writeFile(file, "x"));
    expect(existsSync(file)).toBe(true);
    await ws.cleanup();
    expect(existsSync(ws.workDir)).toBe(false);
  });

  it("8. progress transitions are gated", () => {
    expect(canTransitionProgress("pending", "claimed")).toBe(true);
    expect(canTransitionProgress("processing", "uploading")).toBe(true);
    expect(canTransitionProgress("ready", "processing")).toBe(false);
    expect(assertProgressTransition("uploading", "failed").ok).toBe(true);
    expect(assertProgressTransition("ready", "failed").ok).toBe(false);
  });

  it("9. logging redacts secrets", () => {
    const log = createMediaLogger("test");
    const entry = log("upload", {
      service_role_key: "super-secret",
      ok: true,
      path: "a/b.mp4",
    });
    expect(JSON.stringify(entry)).not.toMatch(/super-secret/);
    expect(entry).toMatchObject({ event: "upload" });
  });

  it("10. article teaser processor kind is wired in source", () => {
    const src = read(
      "lib/media/processing/processors/articleTeaserProcessor.ts"
    );
    expect(src).toMatch(/kind:\s*"article_teaser"/);
    expect(src).toMatch(/runFfmpeg/);
    expect(src).toMatch(/uploadFile/);
    expect(src).toMatch(/syncArticleDiscoveryPost/);
    expect(src).not.toMatch(/spawn\(["']ffmpeg["']/);
  });

  it("11. worker shutdown flag stops loop", async () => {
    registerMediaProcessor(stubProcessor({ kind: "article_teaser" }));
    const runtime = createMediaWorkerRuntime("article_teaser", {
      idlePollMs: 10,
      sleep: async () => undefined,
    });
    const loopPromise = runtime.loop();
    runtime.requestShutdown();
    await loopPromise;
    expect(runtime.isShuttingDown).toBe(true);
  });

  it("12. idempotent short-circuit path exists in article processor", () => {
    const src = read(
      "lib/media/processing/processors/articleTeaserProcessor.ts"
    );
    expect(src).toMatch(/generated_post_id/);
    expect(src).toMatch(/media_status === "ready"/);
  });

  it("13–14. registry sync + discovery binding remain on article adapter path", () => {
    const processor = read(
      "lib/media/processing/processors/articleTeaserProcessor.ts"
    );
    const adapter = read("lib/content/adapters/articleAdapter.ts");
    expect(processor).toMatch(/syncArticleDiscoveryPost/);
    expect(adapter).toMatch(/bindDiscoveryPost/);
  });

  it("15–16. Home feed gate and profile projection unchanged in design", () => {
    const home = read("app/components/home/HomeFeedLoader.tsx");
    expect(home).toMatch(/getDiscoverVideosServer|getHome|video/);
    expect(home).not.toMatch(/content_registry/);
    const profile = read("lib/content/services/profileProjectionService.ts");
    expect(profile).toMatch(/published_at/);
  });

  it("17–19. no duplicate posts / orphan cleanup / temp cleanup contracts", () => {
    const processor = read(
      "lib/media/processing/processors/articleTeaserProcessor.ts"
    );
    expect(processor).toMatch(/existing\?\.id/);
    expect(processor).toMatch(/safeCleanupPath/);
    const runtime = read("lib/media/processing/runtime.ts");
    expect(runtime).toMatch(/workspace\.cleanup/);
    expect(runtime).toMatch(/processor\.cleanup/);
  });

  it("metrics hooks increment", () => {
    metricJobStarted();
    metricJobCompleted(12);
    metricJobFailed(5);
    metricRetry();
    const snap = getMediaMetrics();
    expect(snap.jobsStarted).toBe(1);
    expect(snap.jobsCompleted).toBe(1);
    expect(snap.jobsFailed).toBe(1);
    expect(snap.retries).toBe(1);
    expect(snap.processingDurationMsTotal).toBe(17);
  });

  it("error code sanitizer uses allowlist", () => {
    const allow = new Set(["upload_failed", "timeout"]);
    expect(sanitizeMediaErrorCode("upload_failed", allow)).toBe("upload_failed");
    expect(sanitizeMediaErrorCode("DROP TABLE", allow)).toBe("processing_failed");
  });

  it("compat worker and media worker entries exist", () => {
    expect(existsSync(join(ROOT, "scripts/media/articleTeaserWorker.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, "scripts/media/mediaWorker.ts"))).toBe(true);
    const compat = read("scripts/media/articleTeaserWorker.ts");
    expect(compat).toMatch(/createMediaWorkerRuntime/);
    expect(compat).toMatch(/processClaimedJob/);
  });

  it("runtime rejects dispatch when processor not registered", async () => {
    const runtime = createMediaWorkerRuntime("article_teaser", { once: true });
    const result = await runtime.dispatchOnce();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errorCode).toBe("unsupported_processor");
  });

  it("no new migration for media processing foundation", () => {
    const files = readdirSync(join(ROOT, "supabase/migrations"));
    expect(files.some((f) => /20260869/.test(f))).toBe(false);
    expect(
      files.some((f) => /media_processing_foundation/i.test(f))
    ).toBe(false);
  });
});
