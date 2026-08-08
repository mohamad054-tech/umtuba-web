import { describe, expect, it } from "vitest";
import {
  SMALL_SMOKE_OPERATOR_USER_ID,
  TRANSLATION_QUALITY_DIMENSIONS,
  assessLiveProfessionalProviderReadiness,
  buildExplicitLiveMatrixPlan,
  buildLiveMatrixPreflight,
  createDefaultLiveProfessionalSmokeTransport,
  createLiveMatrixTransportsForPlan,
  resolveLiveProfessionalOperatorUserId,
  runGeneratorReviewerMatrixEvaluation,
  toSanitizedMatrixEvalReport,
} from "./index";

const ALL_SCORES = Object.fromEntries(
  TRANSLATION_QUALITY_DIMENSIONS.map((d) => [d, 92])
) as Record<(typeof TRANSLATION_QUALITY_DIMENSIONS)[number], number>;

function readyReadiness() {
  const base = assessLiveProfessionalProviderReadiness();
  return {
    ...base,
    overall: "LIVE_BENCHMARK_READY" as const,
    providersConfigured: {
      openai: true,
      gemini: true,
      anthropic: false,
      local: false,
    },
  };
}

describe("live matrix transport parity with small-smoke V1", () => {
  it("reuses the same authoritative operator identity as small smoke", () => {
    expect(resolveLiveProfessionalOperatorUserId()).toBe(
      SMALL_SMOKE_OPERATOR_USER_ID
    );
    expect(resolveLiveProfessionalOperatorUserId("  custom-id  ")).toBe(
      "custom-id"
    );
  });

  it("same-provider OpenAI cell builds via smoke transport path with role routing", async () => {
    const built = buildExplicitLiveMatrixPlan([
      {
        generator: { providerId: "openai", modelId: "gpt-4o-mini" },
        reviewer: { providerId: "openai", modelId: "gpt-4o-mini" },
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const seen: Array<{
      userId?: string;
      capabilityId: string;
      preferredProviderId?: string;
      preferredModelHint?: string;
    }> = [];

    const smoke = await createDefaultLiveProfessionalSmokeTransport({
      resolvedRoute: {
        generatorProviderId: "openai",
        generatorModelId: "gpt-4o-mini",
        reviewerProviderId: "openai",
        reviewerModelId: "gpt-4o-mini",
        modelResolution: "policy_explicit",
      },
      runCapability: async (req) => {
        seen.push({
          capabilityId: req.capabilityId,
          preferredProviderId: req.preferredProviderId,
          preferredModelHint: req.preferredModelHint,
        });
        return { ok: false, error: { message: "probe_only" } };
      },
    });

    const matrixMap = await createLiveMatrixTransportsForPlan({
      plan: built.plan,
      runCapability: async (req) => {
        seen.push({
          capabilityId: req.capabilityId,
          preferredProviderId: req.preferredProviderId,
          preferredModelHint: req.preferredModelHint,
        });
        return { ok: false, error: { message: "probe_only" } };
      },
    });

    expect(Object.keys(matrixMap)).toEqual([built.plan.cells[0]!.cellId]);
    expect(smoke.kind).toBe("ai_service");
    expect(matrixMap[built.plan.cells[0]!.cellId]!.kind).toBe("ai_service");

    // Probe one generate call on each — same preferred provider/model routing.
    await smoke.completeJson({
      role: "generator",
      systemPrompt: "x",
      userPayload: { targetLocale: "ar" },
      timeoutMs: 50,
      maxRetries: 0,
    });
    await matrixMap[built.plan.cells[0]!.cellId]!.completeJson({
      role: "generator",
      systemPrompt: "x",
      userPayload: { targetLocale: "ar" },
      timeoutMs: 50,
      maxRetries: 0,
    });

    expect(seen).toHaveLength(2);
    expect(seen[0]).toMatchObject({
      preferredProviderId: "openai",
      preferredModelHint: "gpt-4o-mini",
    });
    expect(seen[1]).toMatchObject({
      preferredProviderId: "openai",
      preferredModelHint: "gpt-4o-mini",
    });
  });

  it("generator success then reviewer success counts 2 calls with exact attribution", async () => {
    const built = buildExplicitLiveMatrixPlan([
      {
        generator: { providerId: "openai", modelId: "gpt-4o-mini" },
        reviewer: { providerId: "openai", modelId: "gpt-4o-mini" },
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    let calls = 0;
    const transportsByCellId = await createLiveMatrixTransportsForPlan({
      plan: built.plan,
      runCapability: async (req) => {
        calls += 1;
        if (req.capabilityId.includes("review")) {
          return {
            ok: true,
            data: {
              result: {
                schemaVersion: 1,
                dimensionScores: ALL_SCORES,
                findings: [],
                confidence: 0.8,
                provider: { providerId: "claimed", modelId: "claimed" },
              },
            },
          };
        }
        return {
          ok: true,
          data: {
            result: {
              candidateText: "Bonjour {name}",
              confidence: 0.8,
              provider: { providerId: "claimed", modelId: "claimed" },
            },
          },
        };
      },
    });

    const report = await runGeneratorReviewerMatrixEvaluation({
      plan: built.plan,
      explicitGo: true,
      forceOffline: false,
      transportsByCellId,
      readinessOverride: readyReadiness(),
      maxCalls: 2,
    });

    expect(report.mode).toBe("live_ai_service");
    expect(calls).toBe(2);
    expect(report.providerCallsAttempted).toBe(2);
    const c0 = report.cells[0]!.cases[0]!;
    expect(c0.generatorAttempted).toBe(true);
    expect(c0.reviewerAttempted).toBe(true);
    expect(c0.providerCalls).toBe(2);
    expect(c0.structuredGenerateValid).toBe(true);
    expect(c0.structuredReviewValid).toBe(true);
    expect(c0.generatorAttribution).toEqual({
      providerId: "openai",
      modelId: "gpt-4o-mini",
    });
    expect(c0.reviewerAttribution).toEqual({
      providerId: "openai",
      modelId: "gpt-4o-mini",
    });
    expect(c0.reviewerFailureDiagnostics).toBeUndefined();
    expect(c0.generatorFailureDiagnostics).toBeUndefined();
    expect(report.mutatedStudio).toBe(false);
    expect(report.secretsPresent).toBe(false);
  });

  it("generator provider_unavailable => empty candidate, reviewer NOT attempted", async () => {
    const built = buildExplicitLiveMatrixPlan([
      {
        generator: { providerId: "openai", modelId: "gpt-4o-mini" },
        reviewer: { providerId: "openai", modelId: "gpt-4o-mini" },
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    let calls = 0;
    const transportsByCellId = await createLiveMatrixTransportsForPlan({
      plan: built.plan,
      runCapability: async () => {
        calls += 1;
        return { ok: false, error: { message: "provider_unavailable" } };
      },
    });

    const report = await runGeneratorReviewerMatrixEvaluation({
      plan: built.plan,
      explicitGo: true,
      forceOffline: false,
      transportsByCellId,
      readinessOverride: readyReadiness(),
      maxCalls: 2,
    });

    // One case: gen fails after bounded retries inside transport; reviewer never invoked.
    const c0 = report.cells[0]!.cases[0]!;
    expect(c0.generatorAttempted).toBe(true);
    expect(c0.reviewerAttempted).toBe(false);
    expect(c0.providerCalls).toBe(1);
    expect(report.providerCallsAttempted).toBe(1);
    expect(c0.structuredGenerateValid).toBe(false);
    expect(c0.disqualifiers).toContain("empty_candidate");
    expect(c0.disqualifiers).toContain("generator_unavailable");
    expect(c0.disqualifiers).not.toContain("reviewer_unavailable");
    expect(c0.reviewerFailureDiagnostics).toBeUndefined();
    expect(c0.generatorFailureDiagnostics?.failureCode).toBe(
      "provider_unavailable"
    );
    expect(c0.generatorFailureDiagnostics?.category).toBe("transport_error");
    // Transport may retry once (attempts accounted inside transport, not extra matrix calls).
    expect(calls).toBeGreaterThanOrEqual(1);
    expect(calls).toBeLessThanOrEqual(3);
  });

  it("reviewer provider_unavailable after successful generation => reviewer failure only", async () => {
    const built = buildExplicitLiveMatrixPlan([
      {
        generator: { providerId: "openai", modelId: "gpt-4o-mini" },
        reviewer: { providerId: "openai", modelId: "gpt-4o-mini" },
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    let genCalls = 0;
    let revCalls = 0;
    const transportsByCellId = await createLiveMatrixTransportsForPlan({
      plan: built.plan,
      runCapability: async (req) => {
        if (req.capabilityId.includes("review")) {
          revCalls += 1;
          return { ok: false, error: { message: "provider_unavailable" } };
        }
        genCalls += 1;
        return {
          ok: true,
          data: {
            result: {
              candidateText: "رجوع",
              confidence: 0.7,
              provider: { providerId: "openai", modelId: "gpt-4o-mini" },
            },
          },
        };
      },
    });

    const report = await runGeneratorReviewerMatrixEvaluation({
      plan: built.plan,
      explicitGo: true,
      forceOffline: false,
      transportsByCellId,
      readinessOverride: readyReadiness(),
      maxCalls: 2,
    });

    const c0 = report.cells[0]!.cases[0]!;
    expect(genCalls).toBe(1);
    expect(revCalls).toBeGreaterThanOrEqual(1);
    expect(c0.generatorAttempted).toBe(true);
    expect(c0.reviewerAttempted).toBe(true);
    expect(c0.providerCalls).toBe(2);
    expect(c0.structuredGenerateValid).toBe(true);
    expect(c0.structuredReviewValid).toBe(false);
    expect(c0.disqualifiers).toContain("reviewer_unavailable");
    expect(c0.disqualifiers).not.toContain("generator_unavailable");
    expect(c0.generatorFailureDiagnostics).toBeUndefined();
    expect(c0.reviewerFailureDiagnostics?.failureCode).toBe(
      "provider_unavailable"
    );
  });

  it("preflight remains zero-call; sanitized report has no secrets", async () => {
    const built = buildExplicitLiveMatrixPlan([
      {
        generator: { providerId: "openai", modelId: "gpt-4o-mini" },
        reviewer: { providerId: "openai", modelId: "gpt-4o-mini" },
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    let calls = 0;
    await createLiveMatrixTransportsForPlan({
      plan: built.plan,
      runCapability: async () => {
        calls += 1;
        return { ok: false, error: { message: "nope" } };
      },
    });
    const preflight = buildLiveMatrixPreflight({
      plan: built.plan,
      explicitGo: false,
    });
    expect(preflight.providerCallsAttempted).toBe(0);
    expect(calls).toBe(0);
    expect(preflight.aggregate.expectedNormalCalls).toBe(10);
    expect(preflight.aggregate.totalCallCeiling).toBe(20);

    const offline = await runGeneratorReviewerMatrixEvaluation({
      forceOffline: true,
    });
    const blob = JSON.stringify(toSanitizedMatrixEvalReport(offline));
    expect(blob).not.toMatch(/sk-|OPENAI_API_KEY\s*=/i);
    expect(offline.mutatedStudio).toBe(false);
  });
});
