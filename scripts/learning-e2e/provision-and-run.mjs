#!/usr/bin/env node
/**
 * Provision Learning E2E fixtures (when env allows), then run the live browser journey.
 *
 * Exit:
 *   0 — live journey PASS
 *   2 — BLOCKED_ENV / BLOCKED_PROD (cannot provision or run safely)
 *   1 — FAIL
 */

import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { resolveProvisionEnv } from "./provision-env.mjs";

function runNode(script, env) {
  return spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

const provisionEnv = resolveProvisionEnv();
if (!provisionEnv.ok) {
  console.error(provisionEnv.code);
  console.error(
    `Cannot provision/run Learning E2E — ${provisionEnv.missing.join(", ")}`
  );
  process.exit(2);
}

const provisionScript = resolve("scripts/learning-e2e/provision-fixtures.mjs");
const provision = runNode(provisionScript, {});
process.stdout.write(provision.stdout || "");
process.stderr.write(provision.stderr || "");
if (provision.status !== 0) {
  process.exit(provision.status ?? 1);
}

const idLines = (provision.stdout || "")
  .split(/\r?\n/)
  .filter((line) => line.startsWith("LEARNING_E2E_"));
const exported = {};
for (const line of idLines) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  exported[line.slice(0, i)] = line.slice(i + 1);
}

const runScript = resolve("scripts/learning-e2e/run-foundation.mjs");
const live = runNode(runScript, {
  LEARNING_E2E_BASE_URL: provisionEnv.config.baseUrl,
  LEARNING_E2E_EMAIL: provisionEnv.config.email,
  LEARNING_E2E_PASSWORD: provisionEnv.config.password,
  LEARNING_E2E_COURSE_ID: exported.LEARNING_E2E_COURSE_ID || "",
  LEARNING_E2E_LESSON_ID: exported.LEARNING_E2E_LESSON_ID || "",
  LEARNING_E2E_LOCKED_LESSON_ID: exported.LEARNING_E2E_LOCKED_LESSON_ID || "",
});
process.stdout.write(live.stdout || "");
process.stderr.write(live.stderr || "");
process.exit(live.status ?? 1);
