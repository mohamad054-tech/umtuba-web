/**
 * Create Video progress honesty helpers (Media Pipeline V1).
 * Upload percent is real; processing must not fake jumps to 100%.
 */

export type CreateProgressPhase =
  | "idle"
  | "checking-auth"
  | "ready"
  | "uploading"
  | "queued"
  | "processing"
  | "success"
  | "error";

export const CREATE_UPLOAD_COMPLETE_MESSAGE =
  "Upload complete. Publishing your video…";
export const CREATE_PROCESSING_MESSAGE = "Publishing your video…";
export const CREATE_SUCCESS_MESSAGE = "Video ready. Opening Discover…";
export const CREATE_PUBLISH_FAILED_MESSAGE =
  "The video could not be published. Please try again.";

/**
 * After storage upload finishes, processing is indeterminate until the
 * server confirms the post is ready — never invent intermediate percents.
 */
export function processingProgressAfterUpload(): {
  phase: "queued";
  uploadPercent: 100;
  processingPercent: null;
} {
  return {
    phase: "queued",
    uploadPercent: 100,
    processingPercent: null,
  };
}

export function processingProgressWhilePublishing(): {
  phase: "processing";
  processingPercent: null;
} {
  return {
    phase: "processing",
    processingPercent: null,
  };
}

export function processingProgressOnReady(): {
  phase: "success";
  processingPercent: 100;
} {
  return {
    phase: "success",
    processingPercent: 100,
  };
}
