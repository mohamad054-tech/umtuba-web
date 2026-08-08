#!/usr/bin/env npx tsx
/**
 * Dual-read OBSERVE readiness preflight (zero remote writes).
 *
 * Offline harness (fake transports only — default):
 *   npx tsx scripts/translation/dualReadObservePreflight.ts --offline
 *   npm run translation:dual-read-preflight
 *
 * Live read-only preflight (operator GO later; still ZERO writes):
 *   npx tsx scripts/translation/dualReadObservePreflight.ts --preflight
 *
 * Never enables observe. Never mutates Studio JSON. Never prints secrets.
 */

import {
  buildDualReadObserveReadinessReport,
  DUAL_READ_OBSERVE_ROLLBACK_STEPS,
  runDualReadObserveZeroWriteHarness,
  getDualReadObservationBreaker,
} from "../../lib/translationStudio";

function parseArgs(argv: string[]) {
  const preflight =
    argv.includes("--preflight") || argv.includes("--live-read");
  const offlineExplicit =
    argv.includes("--offline") || argv.includes("--harness");
  // Default: offline harness. --preflight alone → local readiness report (zero RPC).
  return {
    offline: offlineExplicit || !preflight,
    preflight,
  };
}

async function main() {
  const { offline, preflight } = parseArgs(process.argv.slice(2));

  if (offline) {
    const harness = await runDualReadObserveZeroWriteHarness();
    const readiness = buildDualReadObserveReadinessReport({
      env: process.env,
      readTransportAvailable: false,
      breaker: getDualReadObservationBreaker(),
    });
    const out = {
      mode: "offline_harness",
      activationSafe: readiness.activationSafe,
      persistenceMode: readiness.persistenceMode,
      authority: "json",
      composition: readiness.composition,
      observeFlagRequested: readiness.observeFlagRequested,
      breaker: readiness.breaker,
      baselineParity: readiness.baselineParity,
      blockers: readiness.blockers,
      preferredComposition: readiness.preferredComposition,
      mayScheduleAutomaticObserve: readiness.mayScheduleAutomaticObserve,
      providerCalls: 0,
      remoteWrites: 0,
      harnessVerdict: harness.verdict,
      harnessCases: harness.cases,
      rollback: [...DUAL_READ_OBSERVE_ROLLBACK_STEPS],
      note: "Observe remains OFF by default. This command does not enable dual_read.",
    };
    console.log(JSON.stringify(out, null, 2));
    process.exit(harness.verdict === "HARNESS_PASS" ? 0 : 1);
  }

  // Live-read preflight: report readiness only; do not call remote unless
  // operator later wires an authenticated transport under a separate GO.
  // This path intentionally makes ZERO remote calls in-repo default.
  const readiness = buildDualReadObserveReadinessReport({
    env: process.env,
    readTransportAvailable: false,
    breaker: getDualReadObservationBreaker(),
  });
  const out = {
    mode: "preflight_local_only",
    activationSafe: readiness.activationSafe,
    persistenceMode: readiness.persistenceMode,
    authority: "json",
    composition: readiness.composition,
    observeFlagRequested: readiness.observeFlagRequested,
    breaker: readiness.breaker,
    baselineParity: readiness.baselineParity,
    blockers: readiness.blockers,
    preferredComposition: readiness.preferredComposition,
    mayScheduleAutomaticObserve: readiness.mayScheduleAutomaticObserve,
    providerCalls: 0,
    remoteWrites: 0,
    paritySummary: {
      note: "No live remote read executed in this preflight entrypoint (zero writes / zero RPC by default).",
    },
    rollback: [...DUAL_READ_OBSERVE_ROLLBACK_STEPS],
    laterLiveReadCommand:
      "Use admin dual-read diagnostics / authenticated schedule only under a separate operator GO after shadow observation PASS.",
    note: "Observe remains OFF by default. This command does not enable dual_read.",
  };
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: err instanceof Error ? err.message.slice(0, 200) : "preflight_failed",
      providerCalls: 0,
      remoteWrites: 0,
    })
  );
  process.exit(1);
});
