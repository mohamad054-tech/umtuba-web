/**
 * TRANSLATION_STUDIO_DUAL_READ_OBSERVE_READINESS_V1 focused tests.
 * Zero remote writes. Observe remains OFF by default.
 */

import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV,
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  __clearDualReadObservationSlotsForTests,
  __setDualReadObservationBreakerForTests,
  buildDualReadObserveReadinessReport,
  createDefaultStudioPersistence,
  DUAL_READ_OBSERVE_ROLLBACK_STEPS,
  evaluateDualReadObserveScheduleGate,
  mayNestDualReadObserveOverImplementation,
  resetDualReadObservationBreaker,
  runDualReadObserveZeroWriteHarness,
} from "./index";

const tempDirs: string[] = [];

afterEach(() => {
  resetDualReadObservationBreaker();
  __setDualReadObservationBreakerForTests(null);
  __clearDualReadObservationSlotsForTests();
  while (tempDirs.length) {
    const d = tempDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function tempDir() {
  const d = mkdtempSync(join(tmpdir(), "umtuba-dual-ready-"));
  tempDirs.push(d);
  return d;
}

describe("dual-read observe readiness gate V1", () => {
  it("default OFF — not activationSafe; json authority", () => {
    const report = buildDualReadObserveReadinessReport({
      env: {},
      readTransportAvailable: false,
    });
    expect(report.jsonAuthoritative).toBe(true);
    expect(report.observeFlagRequested).toBe(false);
    expect(report.activationSafe).toBe(false);
    expect(report.mayScheduleAutomaticObserve).toBe(false);
    expect(report.blockers).toContain("observe_flag_off");
    expect(report.providerCalls).toBe(0);
    expect(report.remoteWrites).toBe(0);
  });

  it("JSON-only + observe requested is unsafe / refused", () => {
    const gate = evaluateDualReadObserveScheduleGate({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "json",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      readTransportAvailable: true,
      baselineParityProven: true,
    });
    expect(gate.maySchedule).toBe(false);
    expect(gate.reason).toBe("json_only_observe_unsafe");
    expect(gate.report.activationSafe).toBe(false);
    expect(
      mayNestDualReadObserveOverImplementation({ implementation: "json" }).allowed
    ).toBe(false);

    const selected = createDefaultStudioPersistence({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "json",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      dataDir: tempDir(),
    });
    expect(selected.dualReadEnabled).toBe(false);
    expect(selected.observeNestRefused).toBe(true);
  });

  it("shadow_dual_write + observe is preferred and schedulable", () => {
    const gate = evaluateDualReadObserveScheduleGate({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      readTransportAvailable: true,
      baselineParityProven: true,
    });
    expect(gate.maySchedule).toBe(true);
    expect(gate.report.activationSafe).toBe(true);
    expect(gate.report.preferredComposition).toBe("shadow_dual_write+observe");

    const selected = createDefaultStudioPersistence({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      dataDir: tempDir(),
    });
    expect(selected.implementation).toBe("shadow_dual_write");
    expect(selected.dualReadEnabled).toBe(true);
  });

  it("mode dual_read alone remains executable but not activation-safe for schedule", () => {
    const gate = evaluateDualReadObserveScheduleGate({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "dual_read",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      readTransportAvailable: true,
      baselineParityProven: true,
    });
    expect(gate.maySchedule).toBe(false);
    expect(gate.reason).toBe("dual_read_mode_without_shadow_unsafe");

    const selected = createDefaultStudioPersistence({
      env: { [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "dual_read" },
      dataDir: tempDir(),
    });
    expect(selected.implementation).toBe("dual_read");
    expect(selected.dualReadEnabled).toBe(true);
  });

  it("breaker OPEN blocks schedule; reset is explicit", () => {
    __setDualReadObservationBreakerForTests({
      state: "OPEN",
      reason: "missing_remote",
      opened_at: new Date().toISOString(),
      consecutive_failures: 0,
      session_failures: 0,
      last_success_at: null,
    });
    const gate = evaluateDualReadObserveScheduleGate({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      readTransportAvailable: true,
      baselineParityProven: true,
    });
    expect(gate.maySchedule).toBe(false);
    expect(gate.reason).toBe("breaker_open");
    expect(gate.report.breaker.state).toBe("OPEN");
    resetDualReadObservationBreaker();
    expect(
      evaluateDualReadObserveScheduleGate({
        env: {
          [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
          [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
        },
        readTransportAvailable: true,
        baselineParityProven: true,
      }).maySchedule
    ).toBe(true);
  });

  it("rollback steps document unset observe + optional json mode", () => {
    expect(DUAL_READ_OBSERVE_ROLLBACK_STEPS.join(" ")).toMatch(
      /UMTUBA_TRANSLATION_STUDIO_DUAL_READ_OBSERVE/
    );
    expect(DUAL_READ_OBSERVE_ROLLBACK_STEPS.join(" ")).toMatch(/json/i);
  });

  it("zero-write harness PASS covering classification + gates", async () => {
    const report = await runDualReadObserveZeroWriteHarness();
    if (report.verdict !== "HARNESS_PASS") {
      // eslint-disable-next-line no-console
      console.log(report.cases.filter((c) => !c.ok));
    }
    expect(report.verdict).toBe("HARNESS_PASS");
    expect(report.providerCalls).toBe(0);
    expect(report.remoteWrites).toBe(0);
    expect(report.localMutated).toBe(false);
    expect(report.activationSafeDefault).toBe(false);
  });
});
