/**
 * Jinn AI Academy — video pilot ingest precheck (OFFLINE, deterministic).
 *
 * Pure evaluation over operator-supplied evidence. Never uploads, ingests,
 * creates storage, mutates DB, invents HTTPS URLs/UUIDs, or calls paid AI.
 */

export const VIDEO_PILOT_INGEST_PRECHECK_TASK_ID =
  "JINN_AI_ACADEMY_VIDEO_PILOT_INGEST_PRECHECK_AUTOMATION_V1" as const;

export const VIDEO_PILOT_INGEST_PRECHECK_FLAGS = [
  "VIDEO_FILE_PRESENT",
  "SHA256_MATCH",
  "VIDEO_BROWSER_COMPATIBLE",
  "HOSTING_TARGET_SELECTED",
  "STORAGE_TARGET_CONFIGURED",
  "LESSON_MAPPING_CONFIRMED",
  "LESSON_UUID_AVAILABLE",
  "UPLOAD_AUTHORIZED",
  "INGEST_AUTHORIZED",
] as const;

export type VideoPilotIngestPrecheckFlag =
  (typeof VIDEO_PILOT_INGEST_PRECHECK_FLAGS)[number];

export type VideoPilotIngestPrecheckVerdict = "READY" | "NOT_READY";

/** Machine-readable blocking reason codes (stable for Central parsers). */
export type VideoPilotIngestPrecheckBlocker =
  | "VIDEO_FILE_MISSING"
  | "SHA256_MISMATCH"
  | "SHA256_NOT_OBSERVED"
  | "VIDEO_NOT_BROWSER_COMPATIBLE"
  | "HOSTING_TARGET_NOT_SELECTED"
  | "STORAGE_TARGET_NOT_CONFIGURED"
  | "LESSON_MAPPING_NOT_CONFIRMED"
  | "LESSON_UUID_UNAVAILABLE"
  | "UPLOAD_NOT_AUTHORIZED"
  | "INGEST_NOT_AUTHORIZED";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHA256_RE = /^[0-9a-f]{64}$/i;

export type VideoPilotIngestPrecheckEvidence = {
  /** Pilot basename (informational). */
  videoBasename: string;
  /** Target lesson external_id (informational), e.g. JA-07:M02-L01. */
  lessonExternalId: string;
  /** Expected SHA256 from SHA256SUMS / prior verified probe. */
  expectedSha256: string;
  /** Observed SHA256 from this-pass hash, or null if not hashed. */
  observedSha256: string | null;
  videoFilePresent: boolean;
  /** From local playback / codec validation evidence. */
  videoBrowserCompatible: boolean;
  /** Central has selected an authorized hosting target (not merely recommended). */
  hostingTargetSelected: boolean;
  /** Authorized progressive-MP4 storage/CDN resource is provisioned. */
  storageTargetConfigured: boolean;
  /** Curriculum mapping confirmed HIGH / 1:1 for this pilot. */
  lessonMappingConfirmed: boolean;
  /**
   * Live lesson UUID when resolved. Null / empty / non-UUID ⇒ unavailable.
   * Must never be fabricated by this module.
   */
  lessonUuid: string | null;
  /** Explicit Central GO for first host upload. */
  uploadAuthorized: boolean;
  /** Explicit Central GO for Learning content-block create/ingest. */
  ingestAuthorized: boolean;
};

export type VideoPilotIngestPrecheckResult = {
  taskId: typeof VIDEO_PILOT_INGEST_PRECHECK_TASK_ID;
  mode: "offline_deterministic";
  remoteWrites: 0;
  uploads: 0;
  ingests: 0;
  dbMutations: 0;
  paidAiCalls: 0;
  videoBasename: string;
  lessonExternalId: string;
  verdict: VideoPilotIngestPrecheckVerdict;
  flags: Record<VideoPilotIngestPrecheckFlag, boolean>;
  blockingReasons: VideoPilotIngestPrecheckBlocker[];
};

function normalizeSha(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed;
}

export function isValidLessonUuid(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Explicit sentinel from prior Desktop packets — not a live UUID.
  if (trimmed.toUpperCase() === "RESOLVE_LIVE") return false;
  return UUID_RE.test(trimmed);
}

export function evaluateVideoPilotIngestPrecheck(
  evidence: VideoPilotIngestPrecheckEvidence
): VideoPilotIngestPrecheckResult {
  const expected = normalizeSha(evidence.expectedSha256);
  const observed = normalizeSha(evidence.observedSha256);

  const videoFilePresent = evidence.videoFilePresent === true;
  const expectedOk = expected != null && SHA256_RE.test(expected);
  const sha256Match =
    videoFilePresent &&
    expectedOk &&
    observed != null &&
    SHA256_RE.test(observed) &&
    observed === expected;
  const videoBrowserCompatible = evidence.videoBrowserCompatible === true;
  const hostingTargetSelected = evidence.hostingTargetSelected === true;
  const storageTargetConfigured = evidence.storageTargetConfigured === true;
  const lessonMappingConfirmed = evidence.lessonMappingConfirmed === true;
  const lessonUuidAvailable = isValidLessonUuid(evidence.lessonUuid);
  const uploadAuthorized = evidence.uploadAuthorized === true;
  const ingestAuthorized = evidence.ingestAuthorized === true;

  const flags: Record<VideoPilotIngestPrecheckFlag, boolean> = {
    VIDEO_FILE_PRESENT: videoFilePresent,
    SHA256_MATCH: sha256Match,
    VIDEO_BROWSER_COMPATIBLE: videoBrowserCompatible,
    HOSTING_TARGET_SELECTED: hostingTargetSelected,
    STORAGE_TARGET_CONFIGURED: storageTargetConfigured,
    LESSON_MAPPING_CONFIRMED: lessonMappingConfirmed,
    LESSON_UUID_AVAILABLE: lessonUuidAvailable,
    UPLOAD_AUTHORIZED: uploadAuthorized,
    INGEST_AUTHORIZED: ingestAuthorized,
  };

  const blockingReasons: VideoPilotIngestPrecheckBlocker[] = [];
  if (!flags.VIDEO_FILE_PRESENT) blockingReasons.push("VIDEO_FILE_MISSING");
  if (!flags.SHA256_MATCH) {
    if (observed == null || !SHA256_RE.test(observed ?? "")) {
      blockingReasons.push("SHA256_NOT_OBSERVED");
    } else {
      blockingReasons.push("SHA256_MISMATCH");
    }
  }
  if (!flags.VIDEO_BROWSER_COMPATIBLE) {
    blockingReasons.push("VIDEO_NOT_BROWSER_COMPATIBLE");
  }
  if (!flags.HOSTING_TARGET_SELECTED) {
    blockingReasons.push("HOSTING_TARGET_NOT_SELECTED");
  }
  if (!flags.STORAGE_TARGET_CONFIGURED) {
    blockingReasons.push("STORAGE_TARGET_NOT_CONFIGURED");
  }
  if (!flags.LESSON_MAPPING_CONFIRMED) {
    blockingReasons.push("LESSON_MAPPING_NOT_CONFIRMED");
  }
  if (!flags.LESSON_UUID_AVAILABLE) {
    blockingReasons.push("LESSON_UUID_UNAVAILABLE");
  }
  if (!flags.UPLOAD_AUTHORIZED) blockingReasons.push("UPLOAD_NOT_AUTHORIZED");
  if (!flags.INGEST_AUTHORIZED) blockingReasons.push("INGEST_NOT_AUTHORIZED");

  const verdict: VideoPilotIngestPrecheckVerdict =
    blockingReasons.length === 0 ? "READY" : "NOT_READY";

  return {
    taskId: VIDEO_PILOT_INGEST_PRECHECK_TASK_ID,
    mode: "offline_deterministic",
    remoteWrites: 0,
    uploads: 0,
    ingests: 0,
    dbMutations: 0,
    paidAiCalls: 0,
    videoBasename: evidence.videoBasename,
    lessonExternalId: evidence.lessonExternalId,
    verdict,
    flags,
    blockingReasons,
  };
}

/** Frozen Pilot #1 evidence derived from completed Desktop reports (2026-08-09). */
export const PILOT_JA07_M02_L01_CURRENT_EVIDENCE: VideoPilotIngestPrecheckEvidence =
  {
    videoBasename: "4. ChatBot with GPT API.mp4",
    lessonExternalId: "JA-07:M02-L01",
    expectedSha256:
      "f20b9a8e1350eb0b18bc873dbac99f7ec52ea615daa9712725a72f63ce3ef1a9",
    // This-pass Desktop original hash (Get-FileHash) + prior playback probe.
    observedSha256:
      "f20b9a8e1350eb0b18bc873dbac99f7ec52ea615daa9712725a72f63ce3ef1a9",
    videoFilePresent: true,
    videoBrowserCompatible: true,
    hostingTargetSelected: false,
    storageTargetConfigured: false,
    lessonMappingConfirmed: true,
    lessonUuid: null,
    uploadAuthorized: false,
    ingestAuthorized: false,
  };

export function runCurrentPilotIngestPrecheck(): VideoPilotIngestPrecheckResult {
  return evaluateVideoPilotIngestPrecheck(PILOT_JA07_M02_L01_CURRENT_EVIDENCE);
}
