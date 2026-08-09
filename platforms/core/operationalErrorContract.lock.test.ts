/**
 * Operational / error-contract lock tests.
 *
 * TASK: UM_CORE_PLATFORM_OPERATIONAL_ERROR_AND_RELEASE_SIGNOFF_CLOSEOUT_V1
 * MODE: TEST-ONLY — freezes throw-vs-result + P19 unused-by-default negatives.
 * Does not reopen API stability hardening (NO_CHANGE_REQUIRED).
 * Does not invent a P19 consumer.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createInMemoryCapabilityAsserter,
  createInMemoryCapabilityRegistry,
} from "./capability";
import { createInMemoryDependencyRegistry } from "./dependency";
import {
  createInMemoryEventPublisher,
  createInMemoryEventTypeRegistry,
} from "./event";
import {
  createInMemoryFlagEvaluator,
  createInMemoryFlagRegistry,
} from "./flag";
import {
  createInMemoryHealthObservationHistory,
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
  UmHealthHistoryCode,
} from "./health";
import type { UmPlatformManifest } from "./manifest/types";
import { UM_CORE_DEPENDENCY_VALIDATOR_PHASE } from "./packageIdentity";
import { createInMemoryPlatformRegistry } from "./registry";
import { createInMemoryUmCoreSdkFactory } from "./sdk";
import type { UmCoreSdkFactoryDeps } from "./sdk";
import {
  createInMemoryDependencyValidator,
  createUmCoreValidator,
  validateReferentialIntegrity,
} from "./validation";

const ROOT = join(__dirname);

function platformManifest(platformId: string): UmPlatformManifest {
  const moduleId = `${platformId}.core`;
  const capabilityId = `${platformId}.core.ping`;
  const flagId = `${platformId}.core.enabled`;
  const eventType = `${platformId}.core.pinged`;
  return {
    platformId,
    platformVersion: "1.0.0",
    displayName: `${platformId} Platform`,
    owners: [{ id: `owner.${platformId}`, displayName: "Owner" }],
    modules: [
      {
        moduleId,
        displayName: "Core Module",
        capabilityIds: [capabilityId],
      },
    ],
    capabilities: [
      {
        capabilityId,
        moduleId,
        displayName: "Ping",
        sideEffectClasses: ["read"],
        stability: "stable",
        version: "1.0.0",
        flagId,
      },
    ],
    providesEvents: [
      {
        eventType,
        schemaVersion: "1.0.0",
        stability: "stable",
      },
    ],
    requires: [
      {
        targetKind: "peer_kernel",
        targetId: "um.core",
        strength: "required",
        reason: "Core contracts",
      },
    ],
    flags: [
      {
        flagId,
        defaultState: "on",
        linkedCapabilityIds: [capabilityId],
        dangerElevated: false,
      },
    ],
    health: { reportsStatus: true, probeRef: `probe.${platformId}.health` },
    sideEffectSummary: ["read"],
    maturityLevel: 1,
    documentationRefs: [
      `docs/${platformId}/README.md`,
      `docs/${platformId}/OWNERS.md`,
    ],
    soTStatement: `Owns ${platformId} domain truth only.`,
    nonOwnershipStatement:
      "Does not own money, AI execution, or other platforms.",
  };
}

function registerPlatform(platformId: string) {
  const platforms = createInMemoryPlatformRegistry();
  const admitted = platforms.register({
    manifest: platformManifest(platformId),
  });
  expect(admitted.ok).toBe(true);
  return platforms;
}

describe("UM Core operational error contract lock V1", () => {
  it("normative ops/error contract doc is present under docs/core", () => {
    const doc = join(
      ROOT,
      "..",
      "..",
      "docs",
      "core",
      "UM_CORE_PLATFORM_OPERATIONAL_ERROR_CONTRACT_V1.md",
    );
    const text = readFileSync(doc, "utf8");
    expect(text).toContain(
      "CENTRAL_CONSUMER_GO_NOT_REQUIRED_FOR_CURRENT_RELEASE=YES",
    );
    expect(text).toContain("UNIVERSAL_ERROR_FRAMEWORK=NO");
    expect(text).toContain("SDK factory");
  });

  it("SDK factory construction throws; history create returns Result", () => {
    const platforms = registerPlatform("producer");
    const flags = createInMemoryFlagRegistry({
      platforms,
      capabilities: createInMemoryCapabilityRegistry({ platforms }),
    });
    const flagEvaluator = createInMemoryFlagEvaluator({ flags });
    const capabilities = createInMemoryCapabilityRegistry({ platforms });
    const capabilityAsserter = createInMemoryCapabilityAsserter({
      capabilities,
      flags: flagEvaluator,
    });
    const eventTypes = createInMemoryEventTypeRegistry({ platforms });
    const events = createInMemoryEventPublisher({ eventTypes });
    const health = createInMemoryHealthReporter({ platforms });

    const complete: UmCoreSdkFactoryDeps = {
      flags: flagEvaluator,
      capabilities: capabilityAsserter,
      events,
      health,
      platforms,
    };
    expect(typeof createInMemoryUmCoreSdkFactory(complete).createClient).toBe(
      "function",
    );
    expect(() =>
      createInMemoryUmCoreSdkFactory({
        ...complete,
        flags: null as unknown as UmCoreSdkFactoryDeps["flags"],
      }),
    ).toThrow(/flags/);

    const badHistory = createInMemoryHealthObservationHistory({
      platforms,
      capacity: 0,
    });
    expect(badHistory.ok).toBe(false);
    if (badHistory.ok) {
      throw new Error("expected capacity reject");
    }
    expect(badHistory.findings.map((f) => f.code)).toContain(
      UmHealthHistoryCode.CAPACITY_INVALID,
    );
  });

  it("P19 remains result-returning, fail-closed, and unused by P13/RI composition", () => {
    expect(UM_CORE_DEPENDENCY_VALIDATOR_PHASE).toBe("P19");
    const platforms = registerPlatform("producer");
    const capabilities = createInMemoryCapabilityRegistry({ platforms });
    const dependencies = createInMemoryDependencyRegistry({
      platforms,
      capabilities,
    });
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: "producer",
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "Core contracts",
        },
      }).ok,
    ).toBe(true);

    const p19 = createInMemoryDependencyValidator({
      platforms,
      capabilities,
      dependencies,
    });
    const unknown = p19.validateRequirements("missing.platform", []);
    expect(unknown.ok).toBe(false);
    expect(
      unknown.findings.every((f) =>
        String(f.code).startsWith("dependency.validator."),
      ),
    ).toBe(true);

    const composed = createUmCoreValidator({
      platforms,
      capabilities,
      dependencies,
    });
    const p13 = composed.validateDependencies("producer");
    expect(
      p13.findings.every(
        (f) => !String(f.code).startsWith("dependency.validator."),
      ),
    ).toBe(true);

    const flags = createInMemoryFlagRegistry({ platforms, capabilities });
    const eventTypes = createInMemoryEventTypeRegistry({ platforms });
    const healthDeclarations = createInMemoryHealthRegistry({ platforms });
    expect(
      healthDeclarations.register({
        health: {
          platformId: "producer",
          reportsStatus: true,
          probeRef: "probe.producer.health",
        },
      }).ok,
    ).toBe(true);

    const ri = validateReferentialIntegrity({
      platforms,
      capabilities,
      dependencies,
      flags,
      eventTypes,
      healthDeclarations,
    });
    expect(
      ri.findings.every(
        (f) => !String(f.code).startsWith("dependency.validator."),
      ),
    ).toBe(true);
  });

  it("root barrel does not export readiness (P23 packaging still deferred)", async () => {
    const root = await import("./index");
    expect("createPlatformReadinessEvaluator" in root).toBe(false);
    expect("derivePlatformReadiness" in root).toBe(false);
  });
});
