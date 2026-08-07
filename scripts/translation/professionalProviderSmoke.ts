#!/usr/bin/env npx tsx
/**
 * Server-only professional provider small-smoke helper.
 *
 * Usage:
 *   npx tsx scripts/translation/professionalProviderSmoke.ts --phase small
 *   npx tsx scripts/translation/professionalProviderSmoke.ts --phase small --offline
 *
 * Live paid execution requires UMTUBA_PROFESSIONAL_SMOKE_EXPLICIT_GO=1 AND
 * LIVE_BENCHMARK_READY — deferred to execution milestone. Never mutates Studio.
 * Never prints secret values.
 */

import {
  prepareSmallSmokeExecution,
  refuseLiveSmallSmokeIfNotReady,
  runSmallSmokePhase,
} from "../../lib/translationStudio/professionalQuality/smallSmokeRunner";

function parseArgs(argv: string[]) {
  const phase =
    argv.includes("--phase") && argv[argv.indexOf("--phase") + 1]
      ? argv[argv.indexOf("--phase") + 1]
      : "small";
  const offline = argv.includes("--offline") || argv.includes("--prep");
  const explicitGo =
    argv.includes("--go") ||
    process.env.UMTUBA_PROFESSIONAL_SMOKE_EXPLICIT_GO === "1" ||
    process.env.UMTUBA_PROFESSIONAL_SMOKE_EXPLICIT_GO === "true";
  const maxCallsRaw = process.env.UMTUBA_PROFESSIONAL_SMOKE_MAX_CALLS;
  const maxCalls = maxCallsRaw ? Number(maxCallsRaw) : undefined;
  return { phase, offline, explicitGo, maxCalls };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.phase !== "small") {
    console.error(
      JSON.stringify({
        ok: false,
        error: "unsupported_phase",
        message: "Only --phase small is supported in this milestone.",
      })
    );
    process.exitCode = 2;
    return;
  }

  const prep = prepareSmallSmokeExecution();
  console.log(
    JSON.stringify(
      {
        type: "small_smoke_preflight",
        readiness: {
          overall: prep.readiness.overall,
          generator: prep.readiness.generator.state,
          reviewer: prep.readiness.reviewer.state,
          sensitiveReviewer: prep.readiness.sensitiveReviewer.state,
          activated: prep.readiness.activated,
          secretsExposed: prep.readiness.secretsExposed,
        },
        caseCount: prep.package.caseCount,
        caseIds: prep.package.cases.map((c) => c.caseId),
        callBudget: prep.callBudget,
        privacy: prep.privacy.status,
        liveExecutionAllowed: prep.liveExecutionAllowed,
        requiresExplicitGo: prep.requiresExplicitGo,
        configVariableNames: prep.configVariableNames,
      },
      null,
      2
    )
  );

  if (args.offline || !args.explicitGo) {
    const report = await runSmallSmokePhase({
      forceOffline: true,
      maxCalls: args.maxCalls,
    });
    console.log(
      JSON.stringify(
        {
          type: "small_smoke_offline_report",
          verdict: report.verdict,
          mode: report.mode,
          mutatedStudio: report.mutatedStudio,
          secretsPresent: report.secretsPresent,
          providerCallsAttempted: report.providerCallsAttempted,
          successCriteria: report.successCriteria,
          cases: report.cases.map((c) => ({
            smokeIndex: c.smokeIndex,
            caseId: c.caseId,
            locale: c.locale,
            recommendation: c.recommendation,
            humanReviewEnforced: c.humanReviewEnforced,
            placeholderIntact: c.placeholderIntact,
            blindId: c.blindHumanReview.blindId,
            // provider labels omitted from default CLI surface
          })),
        },
        null,
        2
      )
    );
    process.exitCode = report.verdict === "SMOKE_PASS" ? 0 : 1;
    return;
  }

  const gate = refuseLiveSmallSmokeIfNotReady({
    readiness: prep.readiness,
    explicitGo: args.explicitGo,
    maxCalls: args.maxCalls ?? prep.callBudget.normalCalls,
    callCeiling: prep.callBudget.totalCallCeiling,
  });
  if (!gate.ok) {
    console.log(
      JSON.stringify({
        type: "small_smoke_live_refused",
        reason: gate.reason,
        readinessOverall: prep.readiness.overall,
      })
    );
    process.exitCode = 2;
    return;
  }

  const deferred = await runSmallSmokePhase({
    explicitGo: true,
    forceOffline: false,
    maxCalls: args.maxCalls,
  });
  console.log(
    JSON.stringify({
      type: "small_smoke_live_deferred",
      refusalReason: deferred.refusalReason,
      message:
        "Live paid smoke is deferred to TRANSLATION_STUDIO_LIVE_AI_PROVIDER_SMALL_SMOKE_EXECUTION_V1",
    })
  );
  process.exitCode = 3;
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: "small_smoke_helper_failed",
      message: err instanceof Error ? err.message : String(err),
    })
  );
  process.exitCode = 1;
});
