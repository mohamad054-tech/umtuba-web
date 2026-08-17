/**
 * Media Processing Foundation V1 — public surface.
 */

export * from "./types";
export * from "./processor";
export * from "./processorRegistry";
export * from "./retryPolicy";
export * from "./progress";
export * from "./logging";
export * from "./metrics";
export * from "./runtime";
export * from "./registerBuiltinProcessors";
export { runFfmpeg, validateFfmpegArgs, mapFfmpegExitCode } from "./adapters/ffmpegAdapter";
export { runFfprobe, resolveFfprobeBinary } from "./adapters/ffprobeAdapter";
export {
  createTempWorkspace,
  uploadFile,
  downloadToFile,
  downloadHttpOrStorage,
  safeCleanupPath,
} from "./adapters/storageAdapter";
export {
  DEFAULT_MEDIA_WORK_DIR,
  MEDIA_MIN_FREE_BYTES,
  MEDIA_WORKER_CONCURRENCY,
  acquireMediaWorkerLock,
  assertMediaWorkFreeSpace,
  resolveMediaWorkRoot,
} from "./adapters/mediaWorkIsolation";
export {
  createArticleTeaserProcessor,
  processArticleTeaserJob,
} from "./processors/articleTeaserProcessor";
export {
  createUgcVideoProcessor,
  processUgcVideoJob,
  isClaimableUgcPost,
} from "./processors/ugcVideoProcessor";
