import { describe, expect, it } from "vitest";
import {
  GENERATOR_REVIEWER_MATRIX_MAX_CELLS,
  TRANSLATION_QUALITY_DIMENSIONS,
  assessLiveProfessionalProviderReadiness,
  buildExplicitLiveMatrixPlan,
  buildLiveMatrixPreflight,
  collectLiveMatrixCellArgs,
  createAiServiceProfessionalTransport,
  createLiveMatrixTransportsForPlan,
  createScriptedProfessionalAiTransport,
  parseLiveMatrixCellArg,
  parseLiveMatrixCellArgs,
  parseLiveMatrixPlanJson,
  refuseLiveMatrixIfNotReady,
  resolveLiveMatrixEffectiveMaxCalls,
  runGeneratorReviewerMatrixEvaluation,
  toSanitizedLiveMatrixPreflight,
} from "./index";

describe("live generator×reviewer matrix selection V1", () => {
  it("parses explicit 1-cell live plan deterministically", () => {
    const parsed = parseLiveMatrixCellArg("openai/gpt-4o-mini|openai/gpt-4o-mini");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const built = buildExplicitLiveMatrixPlan([parsed.spec]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.plan.cells).toHaveLength(1);
    expect(built.plan.cells[0]!.cellId).toBe(
      "live_1_openai_gpt-4o-mini__openai_gpt-4o-mini"
    );
    expect(built.plan.cells[0]!.generator).toEqual({
      providerId: "openai",
      modelId: "gpt-4o-mini",
    });
    expect(built.plan.cells[0]!.reviewer).toEqual({
      providerId: "openai",
      modelId: "gpt-4o-mini",
    });
    expect(built.plan.caseCount).toBe(5);
    expect(built.plan.callBudget.normalCallsTotal).toBe(10);
    expect(built.plan.callBudget.totalCallCeiling).toBe(20);
  });

  it("preserves explicit 2-cell order and aggregate budget", () => {
    const args = collectLiveMatrixCellArgs([
      "--preflight",
      "--cell",
      "openai/gpt-4o-mini|openai/gpt-4o-mini",
      "--cell",
      "openai/gpt-4o-mini|gemini/gemini-2.5-flash",
    ]);
    expect(args).toEqual([
      "openai/gpt-4o-mini|openai/gpt-4o-mini",
      "openai/gpt-4o-mini|gemini/gemini-2.5-flash",
    ]);
    const parsed = parseLiveMatrixCellArgs(args);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const built = buildExplicitLiveMatrixPlan(parsed.specs);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.plan.cells.map((c) => c.cellId)).toEqual([
      "live_1_openai_gpt-4o-mini__openai_gpt-4o-mini",
      "live_2_openai_gpt-4o-mini__gemini_gemini-2.5-flash",
    ]);
    expect(built.plan.cells[1]!.independent).toBe(true);
    expect(built.plan.callBudget.cellCount).toBe(2);
    expect(built.plan.callBudget.normalCallsTotal).toBe(20);
    expect(built.plan.callBudget.totalCallCeiling).toBe(40);
  });

  it("fails closed on duplicate/invalid cells and rejects >4", () => {
    expect(parseLiveMatrixCellArg("heuristic/x|openai/y").ok).toBe(false);
    expect(parseLiveMatrixCellArg("openai/|openai/y").ok).toBe(false);
    expect(parseLiveMatrixCellArg("openai/gpt 4|openai/y").ok).toBe(false);

    const dup = buildExplicitLiveMatrixPlan([
      {
        generator: { providerId: "openai", modelId: "gpt-4o-mini" },
        reviewer: { providerId: "openai", modelId: "gpt-4o-mini" },
      },
      {
        generator: { providerId: "openai", modelId: "gpt-4o-mini" },
        reviewer: { providerId: "openai", modelId: "gpt-4o-mini" },
      },
    ]);
    expect(dup).toMatchObject({ ok: false, reason: "duplicate_cell_pair" });

    const dupId = buildExplicitLiveMatrixPlan([
      {
        cellId: "same",
        generator: { providerId: "openai", modelId: "a" },
        reviewer: { providerId: "openai", modelId: "b" },
      },
      {
        cellId: "same",
        generator: { providerId: "openai", modelId: "c" },
        reviewer: { providerId: "openai", modelId: "d" },
      },
    ]);
    expect(dupId).toMatchObject({ ok: false, reason: "duplicate_cell_id" });

    const tooMany = parseLiveMatrixCellArgs(
      Array.from(
        { length: GENERATOR_REVIEWER_MATRIX_MAX_CELLS + 1 },
        (_, i) => `openai/m${i}|openai/r${i}`
      )
    );
    expect(tooMany).toMatchObject({
      ok: false,
      reason: "matrix_cell_cap_exceeded",
    });

    const jsonTooMany = parseLiveMatrixPlanJson({
      schemaVersion: 1,
      cells: Array.from({ length: 5 }, (_, i) => ({
        generator: { providerId: "openai", modelId: `g${i}` },
        reviewer: { providerId: "openai", modelId: `r${i}` },
      })),
    });
    expect(jsonTooMany).toMatchObject({
      ok: false,
      reason: "matrix_cell_cap_exceeded",
    });
  });

  it("max-call override can only reduce; never raise ceiling", () => {
    expect(
      resolveLiveMatrixEffectiveMaxCalls({
        planCeiling: 40,
        operatorMaxCalls: 20,
      })
    ).toEqual({ ok: true, effectiveMaxCalls: 20, reduced: true });
    expect(
      resolveLiveMatrixEffectiveMaxCalls({
        planCeiling: 40,
        operatorMaxCalls: 40,
      })
    ).toEqual({ ok: true, effectiveMaxCalls: 40, reduced: false });
    expect(
      resolveLiveMatrixEffectiveMaxCalls({
        planCeiling: 40,
        operatorMaxCalls: 41,
      })
    ).toEqual({ ok: false, reason: "call_budget_exceeded" });
  });

  it("preflight makes zero provider calls and refuses without GO/readiness", () => {
    const built = buildExplicitLiveMatrixPlan([
      {
        generator: { providerId: "openai", modelId: "gpt-4o-mini" },
        reviewer: { providerId: "openai", modelId: "gpt-4o-mini" },
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    let calls = 0;
    const counting = createAiServiceProfessionalTransport({
      providerId: "openai",
      generatorModelId: "gpt-4o-mini",
      reviewerModelId: "gpt-4o-mini",
      runCapability: async () => {
        calls += 1;
        return { ok: false, error: { message: "should_not_run" } };
      },
    });
    void counting;

    const noGo = buildLiveMatrixPreflight({
      plan: built.plan,
      explicitGo: false,
    });
    expect(noGo.providerCallsAttempted).toBe(0);
    expect(noGo.secretsPresent).toBe(false);
    expect(noGo.mutatedStudio).toBe(false);
    expect(noGo.aggregate.expectedNormalCalls).toBe(10);
    expect(noGo.aggregate.totalCallCeiling).toBe(20);
    expect(noGo.refusalReason).toBeTruthy();
    // Without GO, refusal is explicit_go_required when readiness would otherwise pass;
    // in this workspace readiness is typically NOT_CONFIGURED.
    expect([
      "explicit_go_required",
      "provider_not_configured",
      "cell_readiness_failed",
      "config_invalid",
    ]).toContain(noGo.refusalReason);

    const readiness = assessLiveProfessionalProviderReadiness();
    const withGo = buildLiveMatrixPreflight({
      plan: built.plan,
      explicitGo: true,
      readiness,
    });
    expect(withGo.providerCallsAttempted).toBe(0);
    expect(withGo.ok).toBe(false);
    expect(calls).toBe(0);

    const sanitized = toSanitizedLiveMatrixPreflight(withGo);
    expect(JSON.stringify(sanitized)).not.toMatch(/sk-|OPENAI_API_KEY\s*=/i);

    expect(
      refuseLiveMatrixIfNotReady({
        readiness,
        explicitGo: false,
        maxCalls: 10,
        callCeiling: 20,
        privacyOk: true,
        cellCount: 1,
      })
    ).toMatchObject({ ok: false, reason: "explicit_go_required" });
  });

  it("live path without GO refuses; fake transports keep exact attribution", async () => {
    const built = buildExplicitLiveMatrixPlan([
      {
        generator: { providerId: "openai", modelId: "gpt-4o-mini" },
        reviewer: { providerId: "gemini", modelId: "gemini-2.5-flash" },
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const refused = await runGeneratorReviewerMatrixEvaluation({
      plan: built.plan,
      explicitGo: false,
      forceOffline: true,
    });
    // explicitGo false forces offline path; live refuse tested next
    expect(refused.mode).toBe("offline_scripted");

    const liveRefused = await runGeneratorReviewerMatrixEvaluation({
      plan: built.plan,
      explicitGo: true,
      forceOffline: false,
    });
    expect(liveRefused.mode).toBe("live_refused");
    expect(liveRefused.providerCallsAttempted).toBe(0);
    expect(liveRefused.refusalReason).toBeTruthy();

    const dimensionScores = Object.fromEntries(
      TRANSLATION_QUALITY_DIMENSIONS.map((d) => [d, 91])
    );
    const hints: Array<{ provider?: string; model?: string; role: string }> = [];
    const transportsByCellId = await createLiveMatrixTransportsForPlan({
      plan: built.plan,
      runCapability: async (req) => {
        hints.push({
          role: req.capabilityId.includes("review") ? "reviewer" : "generator",
          provider: req.preferredProviderId,
          model: req.preferredModelHint,
        });
        if (req.capabilityId.includes("review")) {
          return {
            ok: true,
            data: {
              result: {
                schemaVersion: 1,
                dimensionScores,
                findings: [],
                confidence: 0.7,
                provider: {
                  providerId: "claimed",
                  modelId: "claimed-model",
                },
              },
            },
          };
        }
        return {
          ok: true,
          data: {
            result: {
              candidateText: "Bonjour {name}",
              confidence: 0.7,
              provider: { providerId: "claimed", modelId: "claimed-model" },
            },
          },
        };
      },
    });

    const ready = {
      ...assessLiveProfessionalProviderReadiness(),
      overall: "LIVE_BENCHMARK_READY" as const,
      providersConfigured: {
        openai: true,
        gemini: true,
        anthropic: false,
        local: false,
      },
    };

    const report = await runGeneratorReviewerMatrixEvaluation({
      plan: built.plan,
      explicitGo: true,
      forceOffline: false,
      transportsByCellId,
      readinessOverride: ready,
      maxCalls: 2,
    });

    expect(report.mode).toBe("live_ai_service");
    expect(report.providerCallsAttempted).toBe(2);
    expect(hints[0]).toMatchObject({
      role: "generator",
      provider: "openai",
      model: "gpt-4o-mini",
    });
    expect(hints[1]).toMatchObject({
      role: "reviewer",
      provider: "gemini",
      model: "gemini-2.5-flash",
    });

    const c0 = report.cells[0]!.cases[0]!;
    expect(c0.generatorAttribution).toEqual({
      providerId: "openai",
      modelId: "gpt-4o-mini",
    });
    expect(c0.reviewerAttribution).toEqual({
      providerId: "gemini",
      modelId: "gemini-2.5-flash",
    });
    expect(c0.dimensionScores).toHaveLength(
      TRANSLATION_QUALITY_DIMENSIONS.length
    );
  });

  it("scripted offline cell still reports planned attribution labels", async () => {
    const built = buildExplicitLiveMatrixPlan([
      {
        cellId: "attr_cell",
        generator: { providerId: "openai", modelId: "gpt-4o-mini" },
        reviewer: { providerId: "openai", modelId: "gpt-4o" },
      },
    ]);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const fake = createScriptedProfessionalAiTransport({
      delayMs: 0,
      provider: { providerId: "openai", modelId: "gpt-4o-mini" },
      generator: {
        candidateText: "x {name}",
        confidence: 0.5,
        provider: { providerId: "openai", modelId: "gpt-4o-mini" },
      },
      reviewer: {
        schemaVersion: 1,
        dimensionScores: Object.fromEntries(
          TRANSLATION_QUALITY_DIMENSIONS.map((d) => [d, 90])
        ),
        findings: [],
        confidence: 0.5,
        provider: { providerId: "openai", modelId: "gpt-4o" },
      },
    });
    const report = await runGeneratorReviewerMatrixEvaluation({
      plan: built.plan,
      forceOffline: true,
      transportsByCellId: { attr_cell: fake },
      maxCalls: 2,
    });
    expect(report.cells[0]!.generator.modelId).toBe("gpt-4o-mini");
    expect(report.cells[0]!.reviewer.modelId).toBe("gpt-4o");
    expect(report.mutatedStudio).toBe(false);
  });
});
