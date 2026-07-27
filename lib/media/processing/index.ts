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
export {
  createTempWorkspace,
  uploadFile,
  downloadToFile,
  downloadHttpOrStorage,
  safeCleanupPath,
} from "./adapters/storageAdapter";
export {
  createArticleTeaserProcessor,
  processArticleTeaserJob,
} from "./processors/articleTeaserProcessor";
