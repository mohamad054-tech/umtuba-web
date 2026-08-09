#!/usr/bin/env npx tsx
/**
 * Offline Jinn video pilot ingest precheck CLI.
 *
 *   npx tsx scripts/jinn/videoPilotIngestPrecheck.ts --offline
 *   npm run jinn:video-pilot-ingest-precheck
 *
 * Deterministic. Zero uploads / ingests / DB writes / storage creates / paid AI.
 * Does not invent HTTPS URLs or lesson UUIDs.
 */

import {
  evaluateVideoPilotIngestPrecheck,
  PILOT_JA07_M02_L01_CURRENT_EVIDENCE,
  type VideoPilotIngestPrecheckEvidence,
  type VideoPilotIngestPrecheckResult,
} from "../../lib/jinnMedia";
import { readFileSync } from "node:fs";

function parseArgs(argv: string[]) {
  const evidenceIdx = argv.indexOf("--evidence");
  const evidencePath =
    evidenceIdx >= 0 && argv[evidenceIdx + 1]
      ? argv[evidenceIdx + 1]
      : null;
  return {
    offline: argv.includes("--offline") || evidencePath == null,
    evidencePath,
    json: argv.includes("--json"),
  };
}

function loadEvidence(path: string): VideoPilotIngestPrecheckEvidence {
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (raw == null || typeof raw !== "object") {
    throw new Error("evidence JSON must be an object");
  }
  return raw as VideoPilotIngestPrecheckEvidence;
}

function printHuman(result: VideoPilotIngestPrecheckResult) {
  console.log(`TASK_ID=${result.taskId}`);
  console.log(`MODE=${result.mode}`);
  console.log(`VERDICT=${result.verdict}`);
  console.log(`VIDEO=${result.videoBasename}`);
  console.log(`LESSON=${result.lessonExternalId}`);
  for (const [flag, ok] of Object.entries(result.flags)) {
    console.log(`${flag}=${ok ? "YES" : "NO"}`);
  }
  console.log(
    `BLOCKING_REASONS=${
      result.blockingReasons.length === 0
        ? "NONE"
        : result.blockingReasons.join(",")
    }`
  );
  console.log(
    `SAFETY remoteWrites=${result.remoteWrites} uploads=${result.uploads} ingests=${result.ingests} dbMutations=${result.dbMutations} paidAiCalls=${result.paidAiCalls}`
  );
}

function main() {
  const { evidencePath, json } = parseArgs(process.argv.slice(2));
  const evidence = evidencePath
    ? loadEvidence(evidencePath)
    : PILOT_JA07_M02_L01_CURRENT_EVIDENCE;
  const result = evaluateVideoPilotIngestPrecheck(evidence);

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printHuman(result);
  }

  // Exit 0 always for report generation; Central parses VERDICT / blockers.
  // Non-zero only on hard tool failure (caught below).
  process.exitCode = 0;
}

try {
  main();
} catch (err) {
  console.error(
    err instanceof Error ? err.message : "videoPilotIngestPrecheck failed"
  );
  process.exitCode = 1;
}
