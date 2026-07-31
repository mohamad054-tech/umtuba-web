import { afterEach, describe, expect, it } from "vitest";
import {
  canTransitionDeploymentState,
  createPrivateAiPermission,
  createPrivateAiService,
  resetPrivateAiForTests,
} from "./index";

afterEach(() => {
  resetPrivateAiForTests();
});

describe("Private AI Runtime Operations & Failover V1", () => {
  it("records heartbeat with source and latency metadata", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const before = svc.listRuntimeIncidents().length;
    const rt = svc.recordHeartbeat({
      runtimeId: "prt_external_general_primary",
      source: "probe_contract",
      latencyMs: 42,
      at: "2026-07-31T15:00:00.000Z",
    });
    expect(rt.health.lastHeartbeatAt).toBe("2026-07-31T15:00:00.000Z");
    expect(rt.health.lastHeartbeatSource).toBe("probe_contract");
    expect(rt.health.lastLatencyMs).toBe(42);
    expect(svc.listRuntimeIncidents().length).toBe(before);
  });

  it("evaluates missed heartbeat and marks unhealthy with incident", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.recordHeartbeat({
      runtimeId: "prt_external_general_primary",
      source: "seed_reset",
      at: "2026-01-01T00:00:00.000Z",
    });
    const { detection, runtime } = svc.evaluateFailureDetection(
      "prt_external_general_primary",
      "2026-01-01T00:05:00.000Z"
    );
    expect(detection.missedHeartbeat).toBe(true);
    expect(runtime.deploymentState).toBe("unhealthy");
    const types = svc.listRuntimeIncidents("prt_external_general_primary").map(
      (i) => i.type
    );
    expect(types).toContain("heartbeat_missed");
    expect(types).toContain("runtime_unhealthy");
  });

  it("tracks consecutive failure thresholds via health events", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.recordRuntimeHealth({
      runtimeId: "prt_external_general_primary",
      kind: "failure",
      reason: "timeout",
    });
    svc.recordRuntimeHealth({
      runtimeId: "prt_external_general_primary",
      kind: "failure",
      reason: "timeout",
    });
    const third = svc.recordRuntimeHealth({
      runtimeId: "prt_external_general_primary",
      kind: "failure",
      reason: "timeout",
    });
    expect(third.health.consecutiveFailures).toBeGreaterThanOrEqual(3);
    expect(third.deploymentState).toBe("unhealthy");
  });

  it("accumulates success observations for recovery thresholds", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.markRuntimeUnhealthy({
      runtimeId: "prt_external_general_primary",
      reason: "manual",
    });
    svc.recordHealthyObservation({
      runtimeId: "prt_external_general_primary",
    });
    const second = svc.recordHealthyObservation({
      runtimeId: "prt_external_general_primary",
    });
    expect(second.health.consecutiveSuccesses).toBe(2);
    expect(second.ops.healthyObservationCount).toBe(2);
  });

  it("allows legal health/deployment transitions and rejects illegal ones", () => {
    expect(canTransitionDeploymentState("ready", "unhealthy")).toBe(true);
    expect(canTransitionDeploymentState("unhealthy", "ready")).toBe(true);
    expect(canTransitionDeploymentState("unhealthy", "offline")).toBe(true);
    expect(canTransitionDeploymentState("maintenance", "ready")).toBe(true);
    expect(canTransitionDeploymentState("ready", "provisioning")).toBe(false);

    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    expect(() =>
      svc.advanceDeployment({
        runtimeId: "prt_external_general_primary",
        to: "pending",
      })
    ).toThrow(/Invalid deployment transition/);
    expect(svc.listRuntimeIncidents().length).toBe(0);
  });

  it("selects failover target and records incident", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.markRuntimeUnhealthy({
      runtimeId: "prt_external_general_primary",
      reason: "capacity",
    });
    const result = svc.triggerFailover({
      runtimeId: "prt_external_general_primary",
      reason: "ops_failover",
    });
    expect(result.ok).toBe(true);
    expect(result.target?.id).toBe("prt_external_general_failover");
    expect(result.source.ops.activeFailoverTargetId).toBe(
      "prt_external_general_failover"
    );
    expect(
      svc
        .listRuntimeIncidents("prt_external_general_primary")
        .some((i) => i.type === "failover_triggered")
    ).toBe(true);
  });

  it("rejects ineligible failover targets and supports no-fallback", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.enterMaintenance({
      runtimeId: "prt_external_general_failover",
      reason: "patch window",
    });
    svc.markRuntimeUnhealthy({
      runtimeId: "prt_external_general_primary",
      reason: "down",
    });
    const result = svc.triggerFailover({
      runtimeId: "prt_external_general_primary",
      reason: "need fallback",
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("no_fallback");
    expect(
      svc
        .listRuntimeIncidents("prt_external_general_primary")
        .some((i) => i.type === "failover_unavailable")
    ).toBe(true);
  });

  it("cooldown prevents failover oscillation", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.markRuntimeUnhealthy({
      runtimeId: "prt_external_general_primary",
      reason: "down",
    });
    const first = svc.triggerFailover({
      runtimeId: "prt_external_general_primary",
      reason: "first",
      now: "2026-07-31T15:00:00.000Z",
    });
    expect(first.ok).toBe(true);
    // restore source to unhealthy again for second attempt semantics
    const second = svc.triggerFailover({
      runtimeId: "prt_external_general_primary",
      reason: "second",
      now: "2026-07-31T15:00:10.000Z",
    });
    expect(second.ok).toBe(false);
    expect(["cooldown_active", "failover_suppressed"]).toContain(second.reason);
  });

  it("recovery grace period blocks early restore unless forced", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.markRuntimeUnhealthy({
      runtimeId: "prt_external_general_primary",
      reason: "down",
    });
    svc.triggerFailover({
      runtimeId: "prt_external_general_primary",
      reason: "failover",
      now: "2026-07-31T15:00:00.000Z",
    });
    svc.recordHealthyObservation({
      runtimeId: "prt_external_general_primary",
      at: "2026-07-31T15:00:05.000Z",
    });
    svc.recordHealthyObservation({
      runtimeId: "prt_external_general_primary",
      at: "2026-07-31T15:00:06.000Z",
    });
    expect(() =>
      svc.markRuntimeRecovered({
        runtimeId: "prt_external_general_primary",
        reason: "too soon",
        now: "2026-07-31T15:00:10.000Z",
      })
    ).toThrow(/grace period/);
    const recovered = svc.markRuntimeRecovered({
      runtimeId: "prt_external_general_primary",
      reason: "forced",
      force: true,
      now: "2026-07-31T15:00:10.000Z",
    });
    expect(recovered.deploymentState).toBe("ready");
    expect(
      svc
        .listRuntimeIncidents("prt_external_general_primary")
        .some((i) => i.type === "runtime_recovered")
    ).toBe(true);
  });

  it("maintenance blocks routing eligibility", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.enterMaintenance({
      runtimeId: "prt_external_general_primary",
      reason: "scheduled work",
    });
    const row = svc
      .listRuntimeDiagnostics()
      .find((r) => r.runtimeId === "prt_external_general_primary");
    expect(row?.maintenanceActive).toBe(true);
    expect(row?.routingEligible).toBe(false);
    expect(
      svc
        .listRuntimeIncidents("prt_external_general_primary")
        .some((i) => i.type === "maintenance_entered")
    ).toBe(true);
  });

  it("manual override blocks failover and clears with incident", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    svc.applyRuntimeOverride({
      runtimeId: "prt_external_general_primary",
      mode: "block_failover",
      reason: "pin traffic",
    });
    svc.markRuntimeUnhealthy({
      runtimeId: "prt_external_general_primary",
      reason: "down",
    });
    const blocked = svc.triggerFailover({
      runtimeId: "prt_external_general_primary",
      reason: "should block",
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toBe("override_block_failover");
    svc.clearRuntimeOverride({
      runtimeId: "prt_external_general_primary",
      reason: "done",
    });
    expect(
      svc
        .listRuntimeIncidents("prt_external_general_primary")
        .some((i) => i.type === "manual_override_cleared")
    ).toBe(true);
  });

  it("enforces ops permissions and does not incident on denied ops", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    Object.assign(svc.getState(), {
      permissions: [
        createPrivateAiPermission({
          id: "perm_ro",
          scope: "model",
          resourceId: "*",
          role: "platform_admin",
          actions: ["read"],
          granted: true,
        }),
      ],
    });
    const before = svc.listRuntimeIncidents().length;
    expect(() =>
      svc.markRuntimeUnhealthy({
        runtimeId: "prt_external_general_primary",
        reason: "nope",
        actorRole: "platform_admin",
      })
    ).toThrow(/Permission denied/);
    expect(svc.listRuntimeIncidents().length).toBe(before);
  });

  it("exposes admin diagnostics ops fields", () => {
    const svc = createPrivateAiService({ ephemeral: true, seed: true });
    const row = svc
      .listRuntimeDiagnostics()
      .find((r) => r.runtimeId === "prt_external_general_primary");
    expect(row?.allowedOpsActions).toContain("record_heartbeat");
    expect(row?.allowedOpsActions).toContain("mark_unhealthy");
    expect(row?.consecutiveFailures).toBeDefined();
  });
});
