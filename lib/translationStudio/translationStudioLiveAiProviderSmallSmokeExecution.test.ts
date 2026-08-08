import { describe, expect, it } from "vitest";
import {
  TRANSLATION_QUALITY_DIMENSIONS,
  createAiServiceProfessionalTransport,
  createTranslationStudioWorkflow,
  prepareSmallSmokeExecution,
  refuseLiveSmallSmokeIfNotReady,
  runSmallSmokePhase,
  type LiveProfessionalProviderReadinessReport,
} from "./index";

const ALL_DIMENSION_SCORES = Object.fromEntries(
  TRANSLATION_QUALITY_DIMENSIONS.map((d) => [d, 92])
) as Record<(typeof TRANSLATION_QUALITY_DIMENSIONS)[number], number>;

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

function createCountingFakeAiServiceTransport() {
  let calls = 0;
  const transport = createAiServiceProfessionalTransport({
    providerId: "openai",
    generatorModelId: "gpt-4o-mini",
    reviewerModelId: "gpt-4o-mini",
    runCapability: async (req) => {
      calls += 1;
      expect(req.preferredModelHint).toBe("gpt-4o-mini");
      expect(req.preferredProviderId).toBe("openai");
      if (req.capabilityId === "platform.translation_professional_generate") {
        let sourceText = "Back";
        let targetLocale = "ar";
        try {
          const parsed = JSON.parse(req.input.text ?? "{}") as {
            sourceText?: string;
            targetLocale?: string;
          };
          if (typeof parsed.sourceText === "string") sourceText = parsed.sourceText;
          if (typeof parsed.targetLocale === "string") {
            targetLocale = parsed.targetLocale;
          }
        } catch {
          // keep defaults
        }
        const map: Record<string, string> = {
          Back: "رجوع",
          Cancel: "إلغاء",
          Workspace: "مساحة العمل",
          Refund: "استرداد",
          "Hello {name}": "Bonjour {name}",
        };
        const candidate =
          map[sourceText] ??
          (targetLocale === "fr"
            ? `${sourceText}`
            : `[${targetLocale}] ${sourceText}`);
        return {
          ok: true as const,
          data: {
            result: {
              schemaVersion: 1,
              candidateText: candidate,
              confidence: 0.7,
              provider: { providerId: "openai", modelId: "gpt-4o-mini" },
            },
            runId: `fake-gen-${calls}`,
          },
        };
      }
      return {
        ok: true as const,
        data: {
          result: {
            schemaVersion: 1,
            dimensionScores: ALL_DIMENSION_SCORES,
            findings: [
              {
                severity: "info",
                dimension: "semantic_accuracy",
                message: "Fake ai_service reviewer — no paid calls.",
              },
            ],
            confidence: 0.65,
            provider: { providerId: "openai", modelId: "gpt-4o-mini" },
          },
          runId: `fake-rev-${calls}`,
        },
      };
    },
  });
  return {
    transport,
    getCalls: () => calls,
  };
}

describe("live AI provider small smoke execution V1", () => {
  it("no GO => refuse / offline path only", async () => {
    const refused = refuseLiveSmallSmokeIfNotReady({
      readiness: readyReadiness(),
      explicitGo: false,
      maxCalls: 10,
      callCeiling: 20,
    });
    expect(refused).toMatchObject({ ok: false, reason: "explicit_go_required" });

    const offline = await runSmallSmokePhase({ forceOffline: true });
    expect(offline.mode).toBe("offline_scripted");
    expect(offline.mutatedStudio).toBe(false);
  });

  it("not ready => refuse", async () => {
    const report = await runSmallSmokePhase({
      explicitGo: true,
      forceOffline: false,
    });
    expect(report.mode).toBe("live_refused");
    expect(report.refusalReason).toBe("provider_not_configured");
    expect(report.providerCallsAttempted).toBe(0);
    expect(report.mutatedStudio).toBe(false);
    expect(report.cases).toHaveLength(0);
  });

  it("budget overflow => refuse", () => {
    expect(
      refuseLiveSmallSmokeIfNotReady({
        readiness: readyReadiness(),
        explicitGo: true,
        maxCalls: 21,
        callCeiling: 20,
      })
    ).toMatchObject({ ok: false, reason: "call_budget_exceeded" });
  });

  it("GO + ready + fake ai_service transport: 5 cases, 10 calls, ceiling 20", async () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const sugBefore = wf.getSnapshot().suggestions.length;
    const valuesBefore = wf.getSnapshot().values.map((v) => ({
      id: v.id,
      value: v.value,
      status: v.status,
    }));

    const fake = createCountingFakeAiServiceTransport();
    const report = await runSmallSmokePhase({
      explicitGo: true,
      forceOffline: false,
      readinessOverride: readyReadiness(),
      liveTransport: fake.transport,
      maxCalls: 10,
    });

    expect(report.mode).toBe("live_ai_service");
    expect(report.cases).toHaveLength(5);
    expect(report.providerCallsAttempted).toBe(10);
    expect(fake.getCalls()).toBe(10);
    expect(report.providerCallsAttempted).toBeLessThanOrEqual(20);
    expect(report.callBudget.normalCalls).toBe(10);
    expect(report.callBudget.totalCallCeiling).toBe(20);
    expect(report.mutatedStudio).toBe(false);
    expect(report.secretsPresent).toBe(false);
    expect(report.privacy.status).toBe("PASS");
    expect(report.refusalReason).toBeUndefined();
    expect(report.resolvedRoute?.generatorProviderId).toBeTruthy();
    expect(report.observedProviderModels?.length).toBeGreaterThan(0);
    expect(JSON.stringify(report)).not.toMatch(/sk-[A-Za-z0-9]/);

    const refund = report.cases.find((c) => c.caseId === "commerce_refund")!;
    expect(refund.recommendation).toBe("HUMAN_REVIEW");
    expect(refund.humanReviewEnforced).toBe(true);

    const ph = report.cases.find((c) => c.caseId === "ph_hello_name")!;
    expect(ph.locale).toBe("fr");
    expect(ph.placeholderIntact).toBe(true);
    expect(ph.candidateText).toContain("{name}");

    expect(report.verdict).toBe("SMOKE_PASS");
    expect(report.successCriteria.withinCallBudget).toBe(true);
    expect(report.successCriteria.noStudioMutation).toBe(true);

    expect(wf.getSnapshot().suggestions.length).toBe(sugBefore);
    for (const v of valuesBefore) {
      const after = wf.getValue(v.id)!;
      expect(after.value).toBe(v.value);
      expect(after.status).toBe(v.status);
    }
  });

  it("live path never exceeds call ceiling when maxCalls within budget", async () => {
    const fake = createCountingFakeAiServiceTransport();
    const report = await runSmallSmokePhase({
      explicitGo: true,
      forceOffline: false,
      readinessOverride: readyReadiness(),
      liveTransport: fake.transport,
      maxCalls: 20,
    });
    expect(report.providerCallsAttempted).toBe(10);
    expect(report.providerCallsAttempted).toBeLessThanOrEqual(
      report.callBudget.totalCallCeiling
    );
    expect(fake.getCalls()).toBeLessThanOrEqual(20);
  });
});
