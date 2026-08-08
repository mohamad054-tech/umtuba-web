#!/usr/bin/env npx tsx
/**
 * Generator × reviewer matrix evaluation helper.
 *
 * Usage:
 *   npx tsx scripts/translation/professionalMatrixEval.ts --offline
 *   npx tsx scripts/translation/professionalMatrixEval.ts --offline --comparison
 *   npx tsx scripts/translation/professionalMatrixEval.ts --go
 *
 * Live paid matrix requires --go (or UMTUBA_PROFESSIONAL_MATRIX_EXPLICIT_GO=1)
 * and LIVE_BENCHMARK_READY. Never mutates Studio. Never prints secrets.
 */

import { loadProfessionalLiveModelPolicy } from "../../lib/translationStudio/professionalQuality/liveProviderConfig";
import {
  buildGeneratorReviewerMatrixPlan,
  defaultOfflineComparisonMatrixPlan,
  defaultOfflineGeneratorReviewerMatrixPlan,
} from "../../lib/translationStudio/professionalQuality/generatorReviewerMatrix";
import {
  runGeneratorReviewerMatrixEvaluation,
  toSanitizedMatrixEvalReport,
} from "../../lib/translationStudio/professionalQuality/generatorReviewerMatrixRunner";
import {
  createDefaultLiveProfessionalSmokeTransport,
  resolveSmallSmokeProviderModels,
} from "../../lib/translationStudio/professionalQuality/smallSmokeRunner";

function parseArgs(argv: string[]) {
  const offline = argv.includes("--offline") || argv.includes("--prep");
  const comparison = argv.includes("--comparison");
  const explicitGo =
    argv.includes("--go") ||
    process.env.UMTUBA_PROFESSIONAL_MATRIX_EXPLICIT_GO === "1" ||
    process.env.UMTUBA_PROFESSIONAL_MATRIX_EXPLICIT_GO === "true";
  const maxCallsRaw = process.env.UMTUBA_PROFESSIONAL_MATRIX_MAX_CALLS;
  const maxCalls = maxCallsRaw ? Number(maxCallsRaw) : undefined;
  return { offline, comparison, explicitGo, maxCalls };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.offline || !args.explicitGo) {
    const plan = args.comparison
      ? defaultOfflineComparisonMatrixPlan()
      : defaultOfflineGeneratorReviewerMatrixPlan();
    const report = await runGeneratorReviewerMatrixEvaluation({
      plan,
      forceOffline: true,
      maxCalls: args.maxCalls,
    });
    console.log(JSON.stringify(toSanitizedMatrixEvalReport(report), null, 2));
    process.exitCode = report.verdict === "MATRIX_PASS" ? 0 : 1;
    return;
  }

  const policy = loadProfessionalLiveModelPolicy();
  const resolved = resolveSmallSmokeProviderModels(policy);
  // Minimal live matrix: single configured generator×reviewer cell.
  // Operators can expand later under the cell cap.
  const plan = buildGeneratorReviewerMatrixPlan({
    cells: [
      {
        cellId: "live_configured_pair",
        generator: {
          providerId:
            resolved.generatorProviderId === "unset"
              ? "openai"
              : resolved.generatorProviderId,
          modelId: resolved.generatorModelId,
        },
        reviewer: {
          providerId:
            resolved.reviewerProviderId === "unset"
              ? "openai"
              : resolved.reviewerProviderId,
          modelId: resolved.reviewerModelId,
        },
      },
    ],
  });

  const transport = await createDefaultLiveProfessionalSmokeTransport({
    resolvedRoute: resolved,
  });

  const report = await runGeneratorReviewerMatrixEvaluation({
    plan,
    explicitGo: true,
    forceOffline: false,
    transport,
    maxCalls: args.maxCalls,
  });

  console.log(JSON.stringify(toSanitizedMatrixEvalReport(report), null, 2));
  process.exitCode =
    report.verdict === "MATRIX_PASS"
      ? 0
      : report.mode === "live_refused"
        ? 2
        : 1;
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: "matrix_eval_helper_failed",
      message: err instanceof Error ? err.message : String(err),
    })
  );
  process.exitCode = 1;
});
