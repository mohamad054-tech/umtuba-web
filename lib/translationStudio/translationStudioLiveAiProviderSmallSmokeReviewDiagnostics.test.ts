import { describe, expect, it } from "vitest";
import {
  TRANSLATION_QUALITY_DIMENSIONS,
  assertSanitizedReviewerDiagnostics,
  classifySmallSmokeReviewerFailure,
  createAiServiceProfessionalTransport,
  extractSafeValidationIssue,
  prepareSmallSmokeExecution,
  runSmallSmokePhase,
  type LiveProfessionalProviderReadinessReport,
} from "./index";

function readyReadiness(): LiveProfessionalProviderReadinessReport {
  const prep = prepareSmallSmokeExecution();
  return {
    ...prep.readiness,
    overall: "LIVE_BENCHMARK_READY",
    state: "LIVE_PROVIDER_READY",
    generator: { ...prep.readiness.generator, state: "READY", provider: "openai" },
    reviewer: { ...prep.readiness.reviewer, state: "READY", provider: "openai" },
    sensitiveReviewer: {
      ...prep.readiness.sensitiveReviewer,
      state: "OPTIONAL",
      provider: "unset",
    },
  };
}

const ALL_DIMENSION_SCORES = Object.fromEntries(
  TRANSLATION_QUALITY_DIMENSIONS.map((d) => [d, 90])
) as Record<(typeof TRANSLATION_QUALITY_DIMENSIONS)[number], number>;

const VALID_REVIEW = {
  schemaVersion: 1,
  dimensionScores: ALL_DIMENSION_SCORES,
  findings: [
    {
      severity: "info",
      dimension: "semantic_accuracy",
      message: "ok",
    },
  ],
  confidence: 0.7,
  provider: { providerId: "umtuba", modelId: "claimed-by-model" },
};

const VALID_GEN = {
  schemaVersion: 1,
  candidateText: "رجوع",
  confidence: 0.7,
  provider: { providerId: "umtuba", modelId: "claimed-by-model" },
};

describe("small smoke reviewer failure diagnostics V1", () => {
  it("classifies schema / missing field / transport / http / invalid json", () => {
    expect(
      classifySmallSmokeReviewerFailure({
        failure: {
          code: "schema_mismatch",
          message: "missing required dimension score: semantic_accuracy",
        },
      }).category
    ).toBe("missing_required_field");

    expect(
      classifySmallSmokeReviewerFailure({
        failure: {
          code: "schema_mismatch",
          message: "forbidden field rejected: approve",
        },
      })
    ).toMatchObject({
      category: "schema_validation_failed",
      validationIssue: "forbidden.approve",
    });

    expect(
      classifySmallSmokeReviewerFailure({
        failure: { code: "invalid_json", message: "bad json" },
      }).category
    ).toBe("invalid_json");

    expect(
      classifySmallSmokeReviewerFailure({
        failure: { code: "transport_error", message: "boom" },
      }).category
    ).toBe("transport_error");

    expect(
      classifySmallSmokeReviewerFailure({
        failure: {
          code: "provider_unavailable",
          message: "Provider HTTP 429",
          detail: { httpStatus: 429 },
        },
      })
    ).toMatchObject({
      category: "provider_http_error",
      httpStatus: 429,
    });
  });

  it("extractSafeValidationIssue never returns secret-like tokens", () => {
    expect(extractSafeValidationIssue("OPENAI_API_KEY=sk-abc1234567")).toBeUndefined();
    expect(
      extractSafeValidationIssue("missing required dimension score: fluency_naturalness")
    ).toBe("dimensionScores.fluency_naturalness");
  });

  it("valid review succeeds; attribution prefers transport provider over model claim", async () => {
    const transport = createAiServiceProfessionalTransport({
      providerId: "openai",
      generatorModelId: "gpt-4o-mini",
      reviewerModelId: "gpt-4o-mini",
      runCapability: async (req) => ({
        ok: true as const,
        data: {
          result:
            req.capabilityId === "platform.translation_professional_generate"
              ? {
                  ...VALID_GEN,
                  candidateText:
                    req.capabilityId &&
                    typeof (JSON.parse(req.input.text ?? "{}") as { sourceText?: string })
                      .sourceText === "string" &&
                    (JSON.parse(req.input.text ?? "{}") as { sourceText: string })
                      .sourceText === "Hello {name}"
                      ? "Bonjour {name}"
                      : VALID_GEN.candidateText,
                }
              : VALID_REVIEW,
          runId: "r1",
        },
      }),
    });

    const report = await runSmallSmokePhase({
      explicitGo: true,
      forceOffline: false,
      readinessOverride: readyReadiness(),
      liveTransport: transport,
      maxCalls: 10,
    });

    expect(report.verdict).toBe("SMOKE_PASS");
    expect(report.mutatedStudio).toBe(false);
    for (const c of report.cases) {
      expect(c.structuredReviewValid).toBe(true);
      expect(c.reviewerFailureDiagnostics).toBeUndefined();
      expect(c.observedProvider?.providerId).toBe("openai");
      expect(c.observedProvider?.modelId).toBe("gpt-4o-mini");
    }
    expect(JSON.stringify(report.observedProviderModels)).not.toMatch(/umtuba/i);
  });

  it("schema-invalid review yields sanitized schema diagnostics on smoke case", async () => {
    const transport = createAiServiceProfessionalTransport({
      providerId: "openai",
      generatorModelId: "gpt-4o-mini",
      reviewerModelId: "gpt-4o-mini",
      runCapability: async (req) => {
        if (req.capabilityId === "platform.translation_professional_generate") {
          return {
            ok: true as const,
            data: { result: VALID_GEN, runId: "g" },
          };
        }
        return {
          ok: true as const,
          data: {
            result: {
              schemaVersion: 1,
              dimensionScores: { semantic_accuracy: 90 },
              findings: [],
              provider: { providerId: "umtuba", modelId: "x" },
            },
            runId: "bad-rev",
          },
        };
      },
    });

    const report = await runSmallSmokePhase({
      explicitGo: true,
      forceOffline: false,
      readinessOverride: readyReadiness(),
      liveTransport: transport,
      maxCalls: 10,
    });

    expect(report.mode).toBe("live_ai_service");
    expect(report.mutatedStudio).toBe(false);
    const failed = report.cases.filter((c) => !c.structuredReviewValid);
    expect(failed.length).toBeGreaterThan(0);
    for (const c of failed) {
      expect(c.disqualifiers).toContain("reviewer_unavailable");
      expect(c.reviewerFailureDiagnostics).toBeTruthy();
      expect(c.reviewerFailureDiagnostics!.category).toMatch(
        /schema_validation_failed|missing_required_field/
      );
      expect(c.reviewerFailureDiagnostics!.failureCode).toBe("schema_mismatch");
      expect(c.reviewerFailureDiagnostics!.jsonParseSucceeded).toBe(true);
      expect(c.reviewerFailureDiagnostics!.responsePresent).toBe(true);
      expect(c.reviewerFailureDiagnostics!.providerId).toBe("openai");
      expect(assertSanitizedReviewerDiagnostics(c.reviewerFailureDiagnostics!)).toBe(
        true
      );
    }
    expect(JSON.stringify(report)).not.toMatch(/sk-[A-Za-z0-9]|Bearer\s+[A-Za-z0-9]/i);
    expect(JSON.stringify(report.cases.map((c) => c.reviewerFailureDiagnostics))).not.toMatch(
      /candidateText|systemPrompt|Authorization/i
    );
  });

  it("provider/transport failure classifies as transport_error", async () => {
    let call = 0;
    const transport = createAiServiceProfessionalTransport({
      providerId: "openai",
      generatorModelId: "gpt-4o-mini",
      reviewerModelId: "gpt-4o-mini",
      runCapability: async (req) => {
        call += 1;
        if (req.capabilityId === "platform.translation_professional_generate") {
          return { ok: true as const, data: { result: VALID_GEN, runId: "g" } };
        }
        return { ok: false as const, error: { message: "provider down" } };
      },
    });

    const report = await runSmallSmokePhase({
      explicitGo: true,
      forceOffline: false,
      readinessOverride: readyReadiness(),
      liveTransport: transport,
      maxCalls: 10,
    });
    const failed = report.cases.filter((c) => !c.structuredReviewValid);
    expect(failed.length).toBe(5);
    for (const c of failed) {
      expect(c.reviewerFailureDiagnostics?.category).toBe("transport_error");
      expect(c.reviewerFailureDiagnostics?.failureCode).toBe("provider_unavailable");
      expect(assertSanitizedReviewerDiagnostics(c.reviewerFailureDiagnostics!)).toBe(
        true
      );
    }
    expect(call).toBeGreaterThan(0);
  });

  it("invalid JSON / non-object review payload is classified safely", async () => {
    const transport = createAiServiceProfessionalTransport({
      providerId: "openai",
      generatorModelId: "gpt-4o-mini",
      reviewerModelId: "gpt-4o-mini",
      runCapability: async (req) => {
        if (req.capabilityId === "platform.translation_professional_generate") {
          return { ok: true as const, data: { result: VALID_GEN, runId: "g" } };
        }
        return {
          ok: true as const,
          data: { result: "not-json-object" as unknown as Record<string, unknown>, runId: "r" },
        };
      },
    });

    const report = await runSmallSmokePhase({
      explicitGo: true,
      forceOffline: false,
      readinessOverride: readyReadiness(),
      liveTransport: transport,
      maxCalls: 10,
    });
    const failed = report.cases.filter((c) => !c.structuredReviewValid);
    expect(failed.length).toBe(5);
    for (const c of failed) {
      expect(["invalid_json", "transport_error", "parse_failed"]).toContain(
        c.reviewerFailureDiagnostics?.category
      );
      expect(assertSanitizedReviewerDiagnostics(c.reviewerFailureDiagnostics!)).toBe(
        true
      );
    }
  });
});
