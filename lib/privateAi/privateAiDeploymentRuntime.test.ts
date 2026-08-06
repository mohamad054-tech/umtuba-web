import { afterEach, describe, expect, it } from "vitest";
import {
  canTransitionDeploymentState,
  classifyRuntimeError,
  createPrivateAiService,
  resetPrivateAiForTests,
  selectPrivateAiRuntime,
} from "./index";

afterEach(() => {
  resetPrivateAiForTests();
});

describe("Private AI Deployment & Runtime V1", () => {
  it("enforces legal deployment transitions only", () => {
    expect(canTransitionDeploymentState("pending", "provisioning")).toBe(true);
    expect(canTransitionDeploymentState("provisioning", "ready")).toBe(true);
    expect(canTransitionDeploymentState("ready", "maintenance")).toBe(true);
    expect(canTransitionDeploymentState("retired", "ready")).toBe(false);
    expect(canTransitionDeploymentState("pending", "ready")).toBe(false);

    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const pending = svc.getRuntime("prt_translator_pending");
    expect(pending?.deploymentState).toBe("pending");
    expect(() =>
      svc.advanceDeployment({
        runtimeId: "prt_translator_pending",
        to: "ready",
      })
    ).toThrow(/Invalid deployment transition/);
  });

  it("blocks deployment ready when lifecycle / capability / hardware incomplete", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.advanceDeployment({
      runtimeId: "prt_translator_pending",
      to: "provisioning",
    });
    expect(() =>
      svc.advanceDeployment({
        runtimeId: "prt_translator_pending",
        to: "ready",
      })
    ).toThrow(/lifecycle_invalid_draft/);
  });

  it("selects runtime by capability, priority, cost, and region", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const result = svc.selectRuntime({
      capabilityId: "reasoning",
      preferCostTier: "standard",
    });
    expect(result.selected?.id).toBe("prt_external_general_primary");
    expect(result.failoverChain[0]).toBe("prt_external_general_failover");
    expect(result.candidates.length).toBeGreaterThanOrEqual(1);

    const regional = svc.selectRuntime({
      capabilityId: "reasoning",
      region: "eu-west",
    });
    expect(regional.selected?.id).toBe("prt_external_general_failover");
  });

  it("builds failover chain from contracts without executing models", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const state = svc.getState();
    const selected = selectPrivateAiRuntime(state, {
      capabilityId: "tool_use",
    });
    expect(selected.selected?.id).toBe("prt_external_general_primary");
    expect(selected.failoverChain).toContain("prt_external_general_failover");
  });

  it("records health snapshots and classifies errors without live pings", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    expect(classifyRuntimeError("request timed out")).toBe("timeout");
    expect(classifyRuntimeError("unauthorized token")).toBe("auth");

    const failed = svc.recordRuntimeHealth({
      runtimeId: "prt_external_general_primary",
      kind: "failure",
      reason: "capacity overload",
      at: "2026-07-31T12:00:00.000Z",
    });
    expect(failed.health.status).toBe("unhealthy");
    expect(failed.health.errorClass).toBe("capacity");
    expect(failed.health.lastFailureAt).toBe("2026-07-31T12:00:00.000Z");
    expect(failed.availability).toBe("unavailable");
    expect(failed.deploymentState).toBe("unhealthy");

    const ok = svc.recordRuntimeHealth({
      runtimeId: "prt_external_general_failover",
      kind: "success",
      at: "2026-07-31T12:01:00.000Z",
    });
    expect(ok.health.lastSuccessAt).toBe("2026-07-31T12:01:00.000Z");
    expect(ok.health.status).toBe("healthy");
  });

  it("exposes diagnostics for admin routing eligibility", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const rows = svc.listRuntimeDiagnostics();
    expect(rows.length).toBe(3);
    const primary = rows.find((r) => r.runtimeId === "prt_external_general_primary");
    expect(primary?.routingEligible).toBe(true);
    expect(primary?.readiness.ready).toBe(true);
    const pending = rows.find((r) => r.runtimeId === "prt_translator_pending");
    expect(pending?.routingEligible).toBe(false);
    expect(pending?.failureReasons.length).toBeGreaterThan(0);
  });

  it("registers a runtime and advances legal deployment path when ready", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const modelId = "pam_external_general_ref";
    const rt = svc.registerRuntime({
      id: "prt_test_new",
      modelId,
      label: "Test Runtime",
      capabilityIds: ["reasoning"],
      region: "us-east",
      costTier: "low",
      priority: 5,
    });
    expect(rt.deploymentState).toBe("pending");
    svc.advanceDeployment({ runtimeId: rt.id, to: "provisioning" });
    const ready = svc.advanceDeployment({ runtimeId: rt.id, to: "ready" });
    expect(ready.deploymentState).toBe("ready");
    expect(ready.runtimeState).toBe("running");
    expect(svc.evaluateRuntimeReadiness(rt.id).ready).toBe(true);
  });

  it("rejects unavailable runtimes from selection policy", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.recordRuntimeHealth({
      runtimeId: "prt_external_general_primary",
      kind: "failure",
      reason: "dependency upstream down",
    });
    const result = svc.selectRuntime({ capabilityId: "reasoning" });
    expect(result.selected?.id).toBe("prt_external_general_failover");
  });
});
