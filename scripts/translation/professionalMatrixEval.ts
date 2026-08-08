#!/usr/bin/env npx tsx
/**
 * Generator × reviewer matrix evaluation helper.
 *
 * Offline:
 *   npx tsx scripts/translation/professionalMatrixEval.ts --offline
 *   npx tsx scripts/translation/professionalMatrixEval.ts --offline --comparison
 *
 * Live preflight (zero provider calls; explicit cells required):
 *   npx tsx scripts/translation/professionalMatrixEval.ts --preflight --cell openai/gpt-4o-mini|openai/gpt-4o-mini
 *   npx tsx scripts/translation/professionalMatrixEval.ts --preflight --cell A --cell B
 *   npx tsx scripts/translation/professionalMatrixEval.ts --preflight --plan-file path/to/plan.json
 *
 * Live paid run (requires --go + readiness + explicit cells; not used in implementation):
 *   npx tsx scripts/translation/professionalMatrixEval.ts --go --cell openai/gpt-4o-mini|openai/gpt-4o-mini
 *
 * Cell format: generatorProvider/generatorModel|reviewerProvider/reviewerModel
 * Quote --cell values on Windows PowerShell (pipe is special).
 * Never mutates Studio. Never prints secrets. Does not auto-expand cells.
 */

import { readFileSync } from "node:fs";
import {
  defaultOfflineComparisonMatrixPlan,
  defaultOfflineGeneratorReviewerMatrixPlan,
  type GeneratorReviewerMatrixPlan,
} from "../../lib/translationStudio/professionalQuality/generatorReviewerMatrix";
import {
  buildExplicitLiveMatrixPlan,
  buildLiveMatrixPreflight,
  collectLiveMatrixCellArgs,
  createLiveMatrixTransportsForPlan,
  parseLiveMatrixCellArgs,
  parseLiveMatrixPlanJson,
  resolveLiveMatrixEffectiveMaxCalls,
  toSanitizedLiveMatrixPreflight,
} from "../../lib/translationStudio/professionalQuality/generatorReviewerMatrixLivePlan";
import {
  runGeneratorReviewerMatrixEvaluation,
  toSanitizedMatrixEvalReport,
} from "../../lib/translationStudio/professionalQuality/generatorReviewerMatrixRunner";

function parseArgs(argv: string[]) {
  const offline = argv.includes("--offline") || argv.includes("--prep");
  const comparison = argv.includes("--comparison");
  const preflight =
    argv.includes("--preflight") ||
    argv.includes("--dry-run") ||
    argv.includes("--dryrun");
  const explicitGo =
    argv.includes("--go") ||
    process.env.UMTUBA_PROFESSIONAL_MATRIX_EXPLICIT_GO === "1" ||
    process.env.UMTUBA_PROFESSIONAL_MATRIX_EXPLICIT_GO === "true";
  const cellArgs = collectLiveMatrixCellArgs(argv);
  let planFile: string | undefined;
  const planFileEnv = process.env.UMTUBA_PROFESSIONAL_MATRIX_PLAN_FILE?.trim();
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--plan-file" && i + 1 < argv.length) {
      planFile = argv[i + 1];
      i += 1;
    } else if (a?.startsWith("--plan-file=")) {
      planFile = a.slice("--plan-file=".length);
    }
  }
  if (!planFile && planFileEnv) planFile = planFileEnv;

  let maxCalls: number | undefined;
  const maxCallsEnv = process.env.UMTUBA_PROFESSIONAL_MATRIX_MAX_CALLS;
  if (maxCallsEnv && Number.isFinite(Number(maxCallsEnv))) {
    maxCalls = Number(maxCallsEnv);
  }
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--max-calls" && i + 1 < argv.length) {
      maxCalls = Number(argv[i + 1]);
      i += 1;
    } else if (a?.startsWith("--max-calls=")) {
      maxCalls = Number(a.slice("--max-calls=".length));
    }
  }

  return {
    offline,
    comparison,
    preflight,
    explicitGo,
    cellArgs,
    planFile,
    maxCalls:
      typeof maxCalls === "number" && Number.isFinite(maxCalls)
        ? maxCalls
        : undefined,
  };
}

function loadExplicitLivePlan(args: {
  cellArgs: string[];
  planFile?: string;
}):
  | { ok: true; plan: GeneratorReviewerMatrixPlan }
  | { ok: false; reason: string; details?: string[] } {
  if (args.planFile && args.cellArgs.length > 0) {
    return { ok: false, reason: "cell_and_plan_file_mutually_exclusive" };
  }

  let specsResult:
    | ReturnType<typeof parseLiveMatrixCellArgs>
    | ReturnType<typeof parseLiveMatrixPlanJson>;

  if (args.planFile) {
    let rawText: string;
    try {
      rawText = readFileSync(args.planFile, "utf8");
    } catch {
      return { ok: false, reason: "plan_file_unreadable" };
    }
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      return { ok: false, reason: "plan_json_parse_failed" };
    }
    specsResult = parseLiveMatrixPlanJson(parsedJson);
  } else {
    specsResult = parseLiveMatrixCellArgs(args.cellArgs);
  }

  if (!specsResult.ok) {
    return {
      ok: false,
      reason: specsResult.reason,
      details: specsResult.details,
    };
  }
  const built = buildExplicitLiveMatrixPlan(specsResult.specs);
  if (!built.ok) {
    return { ok: false, reason: built.reason, details: built.details };
  }
  return { ok: true, plan: built.plan };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Offline path unchanged — never paid.
  if (args.offline || (!args.explicitGo && !args.preflight && args.cellArgs.length === 0 && !args.planFile)) {
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

  const loaded = loadExplicitLivePlan(args);
  if (!loaded.ok) {
    console.log(
      JSON.stringify(
        {
          type: "live_matrix_refusal",
          ok: false,
          refusalReason: loaded.reason,
          details: loaded.details ?? [],
          secretsPresent: false,
          mutatedStudio: false,
          providerCallsAttempted: 0,
        },
        null,
        2
      )
    );
    process.exitCode = 2;
    return;
  }

  const plan = loaded.plan;

  // Preflight / dry-run: zero provider calls.
  if (args.preflight || !args.explicitGo) {
    const preflight = buildLiveMatrixPreflight({
      plan,
      explicitGo: args.explicitGo,
      operatorMaxCalls: args.maxCalls,
    });
    console.log(
      JSON.stringify(toSanitizedLiveMatrixPreflight(preflight), null, 2)
    );
    process.exitCode = preflight.ok ? 0 : 2;
    return;
  }

  // Live paid path — still gated; implementation milestone must not invoke casually.
  const preflight = buildLiveMatrixPreflight({
    plan,
    explicitGo: true,
    operatorMaxCalls: args.maxCalls,
  });
  if (!preflight.ok) {
    console.log(
      JSON.stringify(toSanitizedLiveMatrixPreflight(preflight), null, 2)
    );
    process.exitCode = 2;
    return;
  }

  const maxResolved = resolveLiveMatrixEffectiveMaxCalls({
    planCeiling: plan.callBudget.totalCallCeiling,
    operatorMaxCalls: args.maxCalls,
  });
  if (!maxResolved.ok) {
    console.log(
      JSON.stringify(
        {
          type: "live_matrix_refusal",
          ok: false,
          refusalReason: maxResolved.reason,
          secretsPresent: false,
          mutatedStudio: false,
          providerCallsAttempted: 0,
          callBudget: plan.callBudget,
        },
        null,
        2
      )
    );
    process.exitCode = 2;
    return;
  }

  const transportsByCellId = await createLiveMatrixTransportsForPlan({ plan });
  const report = await runGeneratorReviewerMatrixEvaluation({
    plan,
    explicitGo: true,
    forceOffline: false,
    transportsByCellId,
    maxCalls: maxResolved.effectiveMaxCalls,
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
