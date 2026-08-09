import { describe, expect, it } from "vitest";
import {
  evaluateVideoPilotIngestPrecheck,
  isValidLessonUuid,
  PILOT_JA07_M02_L01_CURRENT_EVIDENCE,
  runCurrentPilotIngestPrecheck,
  VIDEO_PILOT_INGEST_PRECHECK_FLAGS,
  VIDEO_PILOT_INGEST_PRECHECK_TASK_ID,
  type VideoPilotIngestPrecheckEvidence,
} from "./videoPilotIngestPrecheck";

const READY_EVIDENCE: VideoPilotIngestPrecheckEvidence = {
  videoBasename: "4. ChatBot with GPT API.mp4",
  lessonExternalId: "JA-07:M02-L01",
  expectedSha256:
    "f20b9a8e1350eb0b18bc873dbac99f7ec52ea615daa9712725a72f63ce3ef1a9",
  observedSha256:
    "f20b9a8e1350eb0b18bc873dbac99f7ec52ea615daa9712725a72f63ce3ef1a9",
  videoFilePresent: true,
  videoBrowserCompatible: true,
  hostingTargetSelected: true,
  storageTargetConfigured: true,
  lessonMappingConfirmed: true,
  lessonUuid: "27778f84-e7f0-4b0f-9578-5b68438e4a27",
  uploadAuthorized: true,
  ingestAuthorized: true,
};

describe("videoPilotIngestPrecheck — identity / safety", () => {
  it("uses stable TASK_ID and nine flags", () => {
    expect(VIDEO_PILOT_INGEST_PRECHECK_TASK_ID).toBe(
      "JINN_AI_ACADEMY_VIDEO_PILOT_INGEST_PRECHECK_AUTOMATION_V1"
    );
    expect(VIDEO_PILOT_INGEST_PRECHECK_FLAGS).toHaveLength(9);
  });

  it("never invents READY from current Desktop evidence", () => {
    const result = runCurrentPilotIngestPrecheck();
    expect(result.verdict).toBe("NOT_READY");
    expect(result.mode).toBe("offline_deterministic");
    expect(result.remoteWrites).toBe(0);
    expect(result.uploads).toBe(0);
    expect(result.ingests).toBe(0);
    expect(result.dbMutations).toBe(0);
    expect(result.paidAiCalls).toBe(0);
  });
});

describe("videoPilotIngestPrecheck — UUID guard", () => {
  it("rejects null, empty, and RESOLVE_LIVE sentinel", () => {
    expect(isValidLessonUuid(null)).toBe(false);
    expect(isValidLessonUuid("")).toBe(false);
    expect(isValidLessonUuid("RESOLVE_LIVE")).toBe(false);
    expect(isValidLessonUuid("not-a-uuid")).toBe(false);
  });

  it("accepts canonical UUID", () => {
    expect(
      isValidLessonUuid("27778f84-e7f0-4b0f-9578-5b68438e4a27")
    ).toBe(true);
  });
});

describe("videoPilotIngestPrecheck — READY path", () => {
  it("returns READY only when all nine flags pass", () => {
    const result = evaluateVideoPilotIngestPrecheck(READY_EVIDENCE);
    expect(result.verdict).toBe("READY");
    expect(result.blockingReasons).toEqual([]);
    for (const flag of VIDEO_PILOT_INGEST_PRECHECK_FLAGS) {
      expect(result.flags[flag]).toBe(true);
    }
  });
});

describe("videoPilotIngestPrecheck — current Pilot #1 snapshot", () => {
  it("matches frozen evidence contract for JA-07:M02-L01", () => {
    expect(PILOT_JA07_M02_L01_CURRENT_EVIDENCE.videoBasename).toBe(
      "4. ChatBot with GPT API.mp4"
    );
    expect(PILOT_JA07_M02_L01_CURRENT_EVIDENCE.lessonExternalId).toBe(
      "JA-07:M02-L01"
    );
    expect(PILOT_JA07_M02_L01_CURRENT_EVIDENCE.lessonUuid).toBeNull();
    expect(PILOT_JA07_M02_L01_CURRENT_EVIDENCE.hostingTargetSelected).toBe(
      false
    );
    expect(PILOT_JA07_M02_L01_CURRENT_EVIDENCE.storageTargetConfigured).toBe(
      false
    );
    expect(PILOT_JA07_M02_L01_CURRENT_EVIDENCE.uploadAuthorized).toBe(false);
    expect(PILOT_JA07_M02_L01_CURRENT_EVIDENCE.ingestAuthorized).toBe(false);
  });

  it("emits exact machine-readable blockers for current gates", () => {
    const result = runCurrentPilotIngestPrecheck();
    expect(result.flags.VIDEO_FILE_PRESENT).toBe(true);
    expect(result.flags.SHA256_MATCH).toBe(true);
    expect(result.flags.VIDEO_BROWSER_COMPATIBLE).toBe(true);
    expect(result.flags.LESSON_MAPPING_CONFIRMED).toBe(true);
    expect(result.flags.HOSTING_TARGET_SELECTED).toBe(false);
    expect(result.flags.STORAGE_TARGET_CONFIGURED).toBe(false);
    expect(result.flags.LESSON_UUID_AVAILABLE).toBe(false);
    expect(result.flags.UPLOAD_AUTHORIZED).toBe(false);
    expect(result.flags.INGEST_AUTHORIZED).toBe(false);
    expect(result.blockingReasons).toEqual([
      "HOSTING_TARGET_NOT_SELECTED",
      "STORAGE_TARGET_NOT_CONFIGURED",
      "LESSON_UUID_UNAVAILABLE",
      "UPLOAD_NOT_AUTHORIZED",
      "INGEST_NOT_AUTHORIZED",
    ]);
  });
});

describe("videoPilotIngestPrecheck — failure isolation", () => {
  it("reports SHA256_NOT_OBSERVED when hash missing", () => {
    const result = evaluateVideoPilotIngestPrecheck({
      ...READY_EVIDENCE,
      observedSha256: null,
    });
    expect(result.verdict).toBe("NOT_READY");
    expect(result.flags.SHA256_MATCH).toBe(false);
    expect(result.blockingReasons).toContain("SHA256_NOT_OBSERVED");
    expect(result.blockingReasons).not.toContain("SHA256_MISMATCH");
  });

  it("reports SHA256_MISMATCH when digests differ", () => {
    const result = evaluateVideoPilotIngestPrecheck({
      ...READY_EVIDENCE,
      observedSha256:
        "0000000000000000000000000000000000000000000000000000000000000000",
    });
    expect(result.blockingReasons).toContain("SHA256_MISMATCH");
  });

  it("treats RESOLVE_LIVE as LESSON_UUID_UNAVAILABLE", () => {
    const result = evaluateVideoPilotIngestPrecheck({
      ...READY_EVIDENCE,
      lessonUuid: "RESOLVE_LIVE",
    });
    expect(result.flags.LESSON_UUID_AVAILABLE).toBe(false);
    expect(result.blockingReasons).toContain("LESSON_UUID_UNAVAILABLE");
  });

  it("blocks independently on missing video file", () => {
    const result = evaluateVideoPilotIngestPrecheck({
      ...READY_EVIDENCE,
      videoFilePresent: false,
      observedSha256: null,
    });
    expect(result.flags.VIDEO_FILE_PRESENT).toBe(false);
    expect(result.blockingReasons).toContain("VIDEO_FILE_MISSING");
    // Missing file also fails SHA match via not-observed path.
    expect(result.blockingReasons).toContain("SHA256_NOT_OBSERVED");
  });
});
