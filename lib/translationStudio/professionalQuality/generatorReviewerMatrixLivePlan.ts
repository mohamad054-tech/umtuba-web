/**
 * Explicit operator-selected LIVE generator×reviewer matrix plans.
 * No secrets. No auto-expansion of providers/models. Preflight makes zero calls.
 */

import type { ProfessionalLiveProviderId } from "./liveProviderConfig";
import {
  GENERATOR_REVIEWER_MATRIX_CONFIG_VARIABLE_NAMES,
  GENERATOR_REVIEWER_MATRIX_MAX_CELLS,
  buildGeneratorReviewerMatrixPlan,
  calculateGeneratorReviewerMatrixCallBudget,
  type GeneratorReviewerMatrixCallBudget,
  type GeneratorReviewerMatrixPlan,
  type MatrixRoleRef,
} from "./generatorReviewerMatrix";
import {
  SMALL_SMOKE_CASE_COUNT,
  SMALL_SMOKE_LOCKED_CASE_IDS,
  validateSmallSmokePrivacy,
  buildSmallSmokePackage,
} from "./smallSmokePackage";
import {
  assessLiveProfessionalProviderReadiness,
  type LiveProfessionalProviderReadinessReport,
} from "./liveProviderReadiness";
import {
  createAiServiceProfessionalTransport,
  type ProfessionalAiTransport,
} from "./providerTransport";

/** Live paid matrix cells — heuristic/unset/stub are not allowed. */
export const LIVE_MATRIX_SUPPORTED_PROVIDERS = [
  "openai",
  "gemini",
  "anthropic",
  "local",
] as const;

export type LiveMatrixSupportedProvider =
  (typeof LIVE_MATRIX_SUPPORTED_PROVIDERS)[number];

export type LiveMatrixCellSpec = {
  /** Optional operator id; deterministic id assigned if omitted. */
  cellId?: string;
  generator: MatrixRoleRef;
  reviewer: MatrixRoleRef;
};

export type LiveMatrixPlanParseError = {
  ok: false;
  reason: string;
  details?: string[];
};

export type LiveMatrixPlanParseSuccess = {
  ok: true;
  specs: LiveMatrixCellSpec[];
  /** True when operator requested more than max cells (rejected before build). */
  truncatedRequest: false;
};

export type LiveMatrixCellReadiness = {
  cellId: string;
  generator: MatrixRoleRef;
  reviewer: MatrixRoleRef;
  independent: boolean;
  generatorConfigured: boolean;
  reviewerConfigured: boolean;
  ok: boolean;
  issues: string[];
};

export type LiveMatrixPreflightReport = {
  schemaVersion: 1;
  type: "live_matrix_preflight";
  mode: "live_preflight";
  ok: boolean;
  refusalReason?: string;
  explicitGo: boolean;
  secretsPresent: false;
  mutatedStudio: false;
  providerCallsAttempted: 0;
  caseCountPerCell: typeof SMALL_SMOKE_CASE_COUNT;
  caseIds: readonly string[];
  cells: LiveMatrixCellReadiness[];
  callBudget: GeneratorReviewerMatrixCallBudget;
  operatorMaxCalls: number | null;
  effectiveMaxCalls: number | null;
  aggregate: {
    cellCount: number;
    caseCountTotal: number;
    expectedNormalCalls: number;
    totalCallCeiling: number;
  };
  overallReadiness: string;
  privacy: "PASS" | "FAIL";
  configVariableNames: readonly string[];
};

const MODEL_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:/+-]{0,127}$/;

function isLiveSupportedProvider(
  raw: string
): raw is LiveMatrixSupportedProvider {
  return (LIVE_MATRIX_SUPPORTED_PROVIDERS as readonly string[]).includes(raw);
}

export function isValidLiveMatrixModelId(modelId: string): boolean {
  const t = modelId.trim();
  if (!t || t !== modelId) return false;
  if (t.toLowerCase() === "unset") return false;
  return MODEL_ID_RE.test(t);
}

export function sanitizeLiveMatrixCellIdPart(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._+-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

export function deterministicLiveMatrixCellId(
  index: number,
  generator: MatrixRoleRef,
  reviewer: MatrixRoleRef
): string {
  const g = `${sanitizeLiveMatrixCellIdPart(generator.providerId)}_${sanitizeLiveMatrixCellIdPart(generator.modelId)}`;
  const r = `${sanitizeLiveMatrixCellIdPart(reviewer.providerId)}_${sanitizeLiveMatrixCellIdPart(reviewer.modelId)}`;
  return `live_${index + 1}_${g}__${r}`;
}

/**
 * Parse one --cell value.
 * Format: generatorProvider/generatorModel|reviewerProvider/reviewerModel
 * Example: openai/gpt-4o-mini|gemini/gemini-2.5-flash
 */
export function parseLiveMatrixCellArg(
  raw: string
):
  | { ok: true; spec: LiveMatrixCellSpec }
  | { ok: false; reason: string } {
  const text = raw.trim();
  if (!text) return { ok: false, reason: "empty_cell_arg" };
  const parts = text.split("|");
  if (parts.length !== 2) {
    return {
      ok: false,
      reason: "cell_format_invalid",
    };
  }
  const [genRaw, revRaw] = parts;
  const parseRole = (
    side: string,
    label: "generator" | "reviewer"
  ):
    | { ok: true; role: MatrixRoleRef }
    | { ok: false; reason: string } => {
    const idx = side.indexOf("/");
    if (idx <= 0 || idx === side.length - 1) {
      return { ok: false, reason: `${label}_format_invalid` };
    }
    const providerId = side.slice(0, idx).trim().toLowerCase();
    const modelId = side.slice(idx + 1).trim();
    if (!isLiveSupportedProvider(providerId)) {
      return { ok: false, reason: `${label}_provider_unsupported` };
    }
    if (!isValidLiveMatrixModelId(modelId)) {
      return { ok: false, reason: `${label}_model_invalid` };
    }
    return {
      ok: true,
      role: {
        providerId: providerId as ProfessionalLiveProviderId,
        modelId,
      },
    };
  };
  const gen = parseRole(genRaw ?? "", "generator");
  if (!gen.ok) return gen;
  const rev = parseRole(revRaw ?? "", "reviewer");
  if (!rev.ok) return rev;
  return {
    ok: true,
    spec: { generator: gen.role, reviewer: rev.role },
  };
}

/**
 * Parse operator JSON plan (no secrets). schemaVersion:1 + cells[].
 */
export function parseLiveMatrixPlanJson(
  raw: unknown
): LiveMatrixPlanParseSuccess | LiveMatrixPlanParseError {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "plan_json_invalid" };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion != null && obj.schemaVersion !== 1) {
    return { ok: false, reason: "plan_schema_unsupported" };
  }
  if (!Array.isArray(obj.cells)) {
    return { ok: false, reason: "plan_cells_required" };
  }
  if (obj.cells.length === 0) {
    return { ok: false, reason: "plan_cells_empty" };
  }
  if (obj.cells.length > GENERATOR_REVIEWER_MATRIX_MAX_CELLS) {
    return {
      ok: false,
      reason: "matrix_cell_cap_exceeded",
      details: [
        `requested=${obj.cells.length}`,
        `max=${GENERATOR_REVIEWER_MATRIX_MAX_CELLS}`,
      ],
    };
  }

  const specs: LiveMatrixCellSpec[] = [];
  const details: string[] = [];
  for (let i = 0; i < obj.cells.length; i += 1) {
    const cell = obj.cells[i];
    if (cell == null || typeof cell !== "object" || Array.isArray(cell)) {
      details.push(`cell_${i + 1}:not_object`);
      continue;
    }
    const c = cell as Record<string, unknown>;
    const generator = c.generator;
    const reviewer = c.reviewer;
    if (
      generator == null ||
      typeof generator !== "object" ||
      Array.isArray(generator) ||
      reviewer == null ||
      typeof reviewer !== "object" ||
      Array.isArray(reviewer)
    ) {
      details.push(`cell_${i + 1}:roles_required`);
      continue;
    }
    const g = generator as Record<string, unknown>;
    const r = reviewer as Record<string, unknown>;
    const gProvider = String(g.providerId ?? "")
      .trim()
      .toLowerCase();
    const rProvider = String(r.providerId ?? "")
      .trim()
      .toLowerCase();
    const gModel = String(g.modelId ?? "").trim();
    const rModel = String(r.modelId ?? "").trim();
    if (!isLiveSupportedProvider(gProvider)) {
      details.push(`cell_${i + 1}:generator_provider_unsupported`);
      continue;
    }
    if (!isLiveSupportedProvider(rProvider)) {
      details.push(`cell_${i + 1}:reviewer_provider_unsupported`);
      continue;
    }
    if (!isValidLiveMatrixModelId(gModel)) {
      details.push(`cell_${i + 1}:generator_model_invalid`);
      continue;
    }
    if (!isValidLiveMatrixModelId(rModel)) {
      details.push(`cell_${i + 1}:reviewer_model_invalid`);
      continue;
    }
    const cellId =
      typeof c.cellId === "string" && c.cellId.trim()
        ? c.cellId.trim()
        : undefined;
    specs.push({
      cellId,
      generator: {
        providerId: gProvider as ProfessionalLiveProviderId,
        modelId: gModel,
      },
      reviewer: {
        providerId: rProvider as ProfessionalLiveProviderId,
        modelId: rModel,
      },
    });
  }
  if (details.length > 0 || specs.length !== obj.cells.length) {
    return { ok: false, reason: "plan_cells_invalid", details };
  }
  return { ok: true, specs, truncatedRequest: false };
}

/** Collect repeated --cell values in argv order. */
export function collectLiveMatrixCellArgs(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--cell" && i + 1 < argv.length) {
      out.push(argv[i + 1]!);
      i += 1;
      continue;
    }
    if (a?.startsWith("--cell=")) {
      out.push(a.slice("--cell=".length));
    }
  }
  return out;
}

export function parseLiveMatrixCellArgs(
  cellArgs: string[]
): LiveMatrixPlanParseSuccess | LiveMatrixPlanParseError {
  if (cellArgs.length === 0) {
    return { ok: false, reason: "explicit_cells_required" };
  }
  if (cellArgs.length > GENERATOR_REVIEWER_MATRIX_MAX_CELLS) {
    return {
      ok: false,
      reason: "matrix_cell_cap_exceeded",
      details: [
        `requested=${cellArgs.length}`,
        `max=${GENERATOR_REVIEWER_MATRIX_MAX_CELLS}`,
      ],
    };
  }
  const specs: LiveMatrixCellSpec[] = [];
  const details: string[] = [];
  for (let i = 0; i < cellArgs.length; i += 1) {
    const parsed = parseLiveMatrixCellArg(cellArgs[i]!);
    if (!parsed.ok) {
      details.push(`cell_${i + 1}:${parsed.reason}`);
      continue;
    }
    specs.push(parsed.spec);
  }
  if (details.length > 0 || specs.length !== cellArgs.length) {
    return { ok: false, reason: "cell_args_invalid", details };
  }
  return { ok: true, specs, truncatedRequest: false };
}

function pairKey(spec: LiveMatrixCellSpec): string {
  return [
    spec.generator.providerId,
    spec.generator.modelId,
    spec.reviewer.providerId,
    spec.reviewer.modelId,
  ].join("|");
}

/**
 * Validate operator specs and build a deterministic matrix plan.
 * Fails closed on duplicates / >max / invalid ids — never auto-expands.
 */
export function buildExplicitLiveMatrixPlan(
  specs: LiveMatrixCellSpec[]
):
  | { ok: true; plan: GeneratorReviewerMatrixPlan }
  | LiveMatrixPlanParseError {
  if (specs.length === 0) {
    return { ok: false, reason: "explicit_cells_required" };
  }
  if (specs.length > GENERATOR_REVIEWER_MATRIX_MAX_CELLS) {
    return {
      ok: false,
      reason: "matrix_cell_cap_exceeded",
      details: [
        `requested=${specs.length}`,
        `max=${GENERATOR_REVIEWER_MATRIX_MAX_CELLS}`,
      ],
    };
  }

  const seenIds = new Set<string>();
  const seenPairs = new Set<string>();
  const normalized: LiveMatrixCellSpec[] = [];

  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i]!;
    if (!isLiveSupportedProvider(spec.generator.providerId)) {
      return {
        ok: false,
        reason: "generator_provider_unsupported",
        details: [`cell_${i + 1}`],
      };
    }
    if (!isLiveSupportedProvider(spec.reviewer.providerId)) {
      return {
        ok: false,
        reason: "reviewer_provider_unsupported",
        details: [`cell_${i + 1}`],
      };
    }
    if (!isValidLiveMatrixModelId(spec.generator.modelId)) {
      return {
        ok: false,
        reason: "generator_model_invalid",
        details: [`cell_${i + 1}`],
      };
    }
    if (!isValidLiveMatrixModelId(spec.reviewer.modelId)) {
      return {
        ok: false,
        reason: "reviewer_model_invalid",
        details: [`cell_${i + 1}`],
      };
    }

    const cellId =
      spec.cellId?.trim() ||
      deterministicLiveMatrixCellId(i, spec.generator, spec.reviewer);
    if (seenIds.has(cellId)) {
      return {
        ok: false,
        reason: "duplicate_cell_id",
        details: [cellId],
      };
    }
    const key = pairKey(spec);
    if (seenPairs.has(key)) {
      return {
        ok: false,
        reason: "duplicate_cell_pair",
        details: [key],
      };
    }
    seenIds.add(cellId);
    seenPairs.add(key);
    normalized.push({
      cellId,
      generator: spec.generator,
      reviewer: spec.reviewer,
    });
  }

  const plan = buildGeneratorReviewerMatrixPlan({ cells: normalized });
  // Preserve operator order and assigned ids (builder already preserves order).
  return { ok: true, plan };
}

/**
 * Operator max-calls may only reduce the plan ceiling — never raise it.
 * Attempting to set above ceiling fails closed (not silent increase).
 */
export function resolveLiveMatrixEffectiveMaxCalls(input: {
  planCeiling: number;
  operatorMaxCalls?: number | null;
}):
  | { ok: true; effectiveMaxCalls: number; reduced: boolean }
  | { ok: false; reason: "call_budget_exceeded" } {
  const ceiling = Math.max(0, Math.floor(input.planCeiling));
  if (
    input.operatorMaxCalls == null ||
    !Number.isFinite(input.operatorMaxCalls)
  ) {
    return { ok: true, effectiveMaxCalls: ceiling, reduced: false };
  }
  const requested = Math.max(0, Math.floor(input.operatorMaxCalls));
  if (requested > ceiling) {
    return { ok: false, reason: "call_budget_exceeded" };
  }
  return {
    ok: true,
    effectiveMaxCalls: requested,
    reduced: requested < ceiling,
  };
}

function providerConfigured(
  readiness: LiveProfessionalProviderReadinessReport,
  providerId: string
): boolean {
  if (providerId === "openai") return readiness.providersConfigured.openai;
  if (providerId === "gemini") return readiness.providersConfigured.gemini;
  if (providerId === "anthropic") return readiness.providersConfigured.anthropic;
  if (providerId === "local") return readiness.providersConfigured.local;
  return false;
}

export function assessLiveMatrixCellReadiness(
  cell: {
    cellId: string;
    generator: MatrixRoleRef;
    reviewer: MatrixRoleRef;
    independent: boolean;
  },
  readiness: LiveProfessionalProviderReadinessReport
): LiveMatrixCellReadiness {
  const issues: string[] = [];
  const generatorConfigured = providerConfigured(
    readiness,
    cell.generator.providerId
  );
  const reviewerConfigured = providerConfigured(
    readiness,
    cell.reviewer.providerId
  );
  if (!generatorConfigured) issues.push("generator_provider_not_configured");
  if (!reviewerConfigured) issues.push("reviewer_provider_not_configured");
  if (readiness.overall === "LIVE_PROVIDER_CONFIG_INVALID") {
    issues.push("config_invalid");
  } else if (readiness.overall !== "LIVE_BENCHMARK_READY") {
    issues.push("provider_not_configured");
  }
  return {
    cellId: cell.cellId,
    generator: cell.generator,
    reviewer: cell.reviewer,
    independent: cell.independent,
    generatorConfigured,
    reviewerConfigured,
    ok: issues.length === 0,
    issues,
  };
}

/**
 * Dry-run / preflight — never invokes providers (providerCallsAttempted=0).
 */
export function buildLiveMatrixPreflight(input: {
  plan: GeneratorReviewerMatrixPlan;
  explicitGo: boolean;
  operatorMaxCalls?: number | null;
  readiness?: LiveProfessionalProviderReadinessReport;
}): LiveMatrixPreflightReport {
  const readiness =
    input.readiness ?? assessLiveProfessionalProviderReadiness();
  const privacy = validateSmallSmokePrivacy(buildSmallSmokePackage());
  const budget =
    input.plan.callBudget ??
    calculateGeneratorReviewerMatrixCallBudget({
      cellCount: input.plan.cells.length,
    });

  const cells = input.plan.cells.map((c) =>
    assessLiveMatrixCellReadiness(c, readiness)
  );

  const maxResolved = resolveLiveMatrixEffectiveMaxCalls({
    planCeiling: budget.totalCallCeiling,
    operatorMaxCalls: input.operatorMaxCalls,
  });

  let refusalReason: string | undefined;
  if (privacy.status !== "PASS") refusalReason = "privacy_fail";
  else if (!maxResolved.ok) refusalReason = maxResolved.reason;
  else if (input.plan.cells.length === 0) refusalReason = "explicit_cells_required";
  else if (input.plan.cells.length > GENERATOR_REVIEWER_MATRIX_MAX_CELLS) {
    refusalReason = "matrix_cell_cap_exceeded";
  } else if (readiness.overall === "LIVE_PROVIDER_CONFIG_INVALID") {
    refusalReason = "config_invalid";
  } else if (readiness.overall !== "LIVE_BENCHMARK_READY") {
    refusalReason = "provider_not_configured";
  } else if (cells.some((c) => !c.ok)) {
    refusalReason = "cell_readiness_failed";
  } else if (!input.explicitGo) {
    // Preflight may run without GO; mark not-ready-to-execute.
    refusalReason = "explicit_go_required";
  }

  return {
    schemaVersion: 1,
    type: "live_matrix_preflight",
    mode: "live_preflight",
    ok: refusalReason == null,
    refusalReason,
    explicitGo: input.explicitGo,
    secretsPresent: false,
    mutatedStudio: false,
    providerCallsAttempted: 0,
    caseCountPerCell: SMALL_SMOKE_CASE_COUNT,
    caseIds: [...SMALL_SMOKE_LOCKED_CASE_IDS],
    cells,
    callBudget: budget,
    operatorMaxCalls:
      input.operatorMaxCalls == null || !Number.isFinite(input.operatorMaxCalls)
        ? null
        : Math.floor(input.operatorMaxCalls),
    effectiveMaxCalls: maxResolved.ok ? maxResolved.effectiveMaxCalls : null,
    aggregate: {
      cellCount: input.plan.cells.length,
      caseCountTotal: input.plan.cells.length * SMALL_SMOKE_CASE_COUNT,
      expectedNormalCalls: budget.normalCallsTotal,
      totalCallCeiling: budget.totalCallCeiling,
    },
    overallReadiness: readiness.overall,
    privacy: privacy.status,
    configVariableNames: [
      ...GENERATOR_REVIEWER_MATRIX_CONFIG_VARIABLE_NAMES,
      "UMTUBA_PROFESSIONAL_MATRIX_PLAN_FILE",
    ],
  };
}

export function toSanitizedLiveMatrixPreflight(
  report: LiveMatrixPreflightReport
): Record<string, unknown> {
  return {
    type: report.type,
    mode: report.mode,
    ok: report.ok,
    refusalReason: report.refusalReason,
    explicitGo: report.explicitGo,
    secretsPresent: report.secretsPresent,
    mutatedStudio: report.mutatedStudio,
    providerCallsAttempted: report.providerCallsAttempted,
    caseCountPerCell: report.caseCountPerCell,
    caseIds: report.caseIds,
    cells: report.cells.map((c) => ({
      cellId: c.cellId,
      generator: c.generator,
      reviewer: c.reviewer,
      independent: c.independent,
      generatorConfigured: c.generatorConfigured,
      reviewerConfigured: c.reviewerConfigured,
      ok: c.ok,
      issues: c.issues,
    })),
    callBudget: report.callBudget,
    operatorMaxCalls: report.operatorMaxCalls,
    effectiveMaxCalls: report.effectiveMaxCalls,
    aggregate: report.aggregate,
    overallReadiness: report.overallReadiness,
    privacy: report.privacy,
  };
}

/**
 * Build per-cell live transports for an explicit matrix plan.
 * Reuses the proven small-smoke live transport path (same operator/gateway context).
 * Does not invoke providers until completeJson is called.
 */
export async function createLiveMatrixTransportsForPlan(input: {
  plan: GeneratorReviewerMatrixPlan;
  runCapability?: Parameters<
    typeof createAiServiceProfessionalTransport
  >[0]["runCapability"];
  operatorUserId?: string;
}): Promise<Record<string, ProfessionalAiTransport>> {
  const { createDefaultLiveProfessionalSmokeTransport } = await import(
    "./smallSmokeRunner"
  );
  const out: Record<string, ProfessionalAiTransport> = {};

  for (const cell of input.plan.cells) {
    out[cell.cellId] = await createDefaultLiveProfessionalSmokeTransport({
      resolvedRoute: {
        generatorProviderId: cell.generator.providerId,
        generatorModelId: cell.generator.modelId,
        reviewerProviderId: cell.reviewer.providerId,
        reviewerModelId: cell.reviewer.modelId,
        modelResolution: "policy_explicit",
      },
      runCapability: input.runCapability,
      operatorUserId: input.operatorUserId,
    });
  }
  return out;
}
