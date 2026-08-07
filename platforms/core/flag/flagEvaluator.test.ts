/**
 * Focused UM Core P14 in-memory flag evaluator tests.
 * FLAG EVALUATION IS NOT FLAG REGISTRATION.
 * FLAG EVALUATION IS NOT CAPABILITY AUTHORIZATION.
 */

import { describe, expect, it } from "vitest";
import type { UmCapabilityAsserter } from "../capability/types";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import type { UmCoreSdkClient } from "../sdk";
import {
  UmFlagEvaluationCode,
  createInMemoryFlagEvaluator,
  createInMemoryFlagRegistry,
} from "./index";

function validManifest(
  overrides: Partial<UmPlatformManifest> = {},
): UmPlatformManifest {
  return {
    platformId: "example",
    platformVersion: "1.0.0",
    displayName: "Example Platform",
    owners: [{ id: "owner.platform", displayName: "Platform Owner" }],
    modules: [
      {
        moduleId: "example.core",
        displayName: "Core Module",
        capabilityIds: ["example.core.ping", "example.core.admin"],
      },
    ],
    capabilities: [
      {
        capabilityId: "example.core.ping",
        moduleId: "example.core",
        displayName: "Ping",
        sideEffectClasses: ["read"],
        stability: "stable",
        version: "1.0.0",
      },
      {
        capabilityId: "example.core.admin",
        moduleId: "example.core",
        displayName: "Admin",
        sideEffectClasses: ["admin"],
        stability: "stable",
        version: "1.0.0",
        flagId: "example.core.admin",
      },
    ],
    providesEvents: [
      {
        eventType: "example.core.pinged",
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
        flagId: "example.core.enabled",
        defaultState: "off",
        linkedCapabilityIds: ["example.core.ping"],
        dangerElevated: false,
      },
      {
        flagId: "example.core.admin",
        defaultState: "off",
        linkedCapabilityIds: ["example.core.admin"],
        dangerElevated: true,
      },
      {
        flagId: "example.core.preview",
        defaultState: "on",
        linkedCapabilityIds: ["example.core.ping"],
        dangerElevated: false,
      },
    ],
    health: { reportsStatus: true, probeRef: "probe.example.health" },
    sideEffectSummary: ["read", "admin"],
    maturityLevel: 1,
    documentationRefs: ["docs/example/README.md", "docs/example/OWNERS.md"],
    soTStatement: "Owns example domain truth only.",
    nonOwnershipStatement: "Does not own money, AI execution, or other platforms.",
    ...overrides,
  };
}

function registerPlatform(manifest = validManifest()) {
  const platforms = createInMemoryPlatformRegistry();
  expect(platforms.register({ manifest }).ok).toBe(true);
  return platforms;
}

function flagDecl(
  overrides: Partial<
    Parameters<
      ReturnType<typeof createInMemoryFlagRegistry>["register"]
    >[0]["flag"]
  > = {},
) {
  return {
    flagId: "example.core.enabled",
    ownerPlatformId: "example",
    ownerRef: "owner.platform",
    defaultState: "off" as const,
    linkedCapabilityIds: ["example.core.ping"] as const,
    dangerElevated: false,
    auditRequired: false,
    description: "Enable core ping",
    ...overrides,
  };
}

function assembleEvaluator() {
  const platforms = registerPlatform();
  const flags = createInMemoryFlagRegistry({ platforms });
  expect(flags.register({ flag: flagDecl() }).ok).toBe(true);
  expect(
    flags.register({
      flag: flagDecl({
        flagId: "example.core.preview",
        defaultState: "on",
        description: "Preview surface",
      }),
    }).ok,
  ).toBe(true);
  expect(
    flags.register({
      flag: flagDecl({
        flagId: "example.core.admin",
        linkedCapabilityIds: ["example.core.admin"],
        dangerElevated: true,
        auditRequired: true,
        defaultState: "off",
        description: "Admin elevated",
      }),
    }).ok,
  ).toBe(true);
  const evaluator = createInMemoryFlagEvaluator({ flags });
  return { platforms, flags, evaluator };
}

describe("um.core P14 in-memory flag evaluator", () => {
  it("fail-closes unknown flags with source unknown", () => {
    const { evaluator } = assembleEvaluator();
    const result = evaluator.evaluate({ flagId: "example.core.missing" });
    expect(result.enabled).toBe(false);
    expect(result.source).toBe("unknown");
    expect(result.reasonCode).toBe(UmFlagEvaluationCode.UNKNOWN);
    expect(result.flagId).toBe("example.core.missing");
  });

  it("enables known default on with source default", () => {
    const { evaluator } = assembleEvaluator();
    const result = evaluator.evaluate({ flagId: "example.core.preview" });
    expect(result.enabled).toBe(true);
    expect(result.source).toBe("default");
    expect(result.reasonCode).toBe(UmFlagEvaluationCode.DEFAULT_ON);
  });

  it("disables known default off with source default", () => {
    const { evaluator } = assembleEvaluator();
    const result = evaluator.evaluate({ flagId: "example.core.enabled" });
    expect(result.enabled).toBe(false);
    expect(result.source).toBe("default");
    expect(result.reasonCode).toBe(UmFlagEvaluationCode.DEFAULT_OFF);
  });

  it("keeps unknown danger/elevated flags disabled", () => {
    const { evaluator } = assembleEvaluator();
    const result = evaluator.evaluate({ flagId: "example.core.danger.missing" });
    expect(result.enabled).toBe(false);
    expect(result.source).toBe("unknown");
  });

  it("evaluates known elevated flags from catalog default only", () => {
    const { evaluator, flags } = assembleEvaluator();
    expect(flags.get("example.core.admin")?.dangerElevated).toBe(true);
    expect(flags.get("example.core.admin")?.killSwitch).toBe(true);

    const off = evaluator.evaluate({ flagId: "example.core.admin" });
    expect(off.enabled).toBe(false);
    expect(off.source).toBe("default");
    expect(off.source).not.toBe("kill_switch");
    expect(off.source).not.toBe("override");
  });

  it("does not create an executable kill-switch path from metadata", () => {
    const { evaluator, flags } = assembleEvaluator();
    for (const record of flags.list()) {
      expect(record.killSwitch).toBe(true);
      const result = evaluator.evaluate({ flagId: record.flagId });
      expect(result.source).not.toBe("kill_switch");
    }
  });

  it("evaluateBatch preserves order, duplicates, and single-evaluate semantics", () => {
    const { evaluator } = assembleEvaluator();
    const requests = [
      { flagId: "example.core.preview" },
      { flagId: "example.core.missing" },
      { flagId: "example.core.enabled" },
      { flagId: "example.core.preview" },
    ] as const;

    const batch = evaluator.evaluateBatch(requests);
    expect(batch).toHaveLength(4);
    expect(batch.map((r) => r.flagId)).toEqual([
      "example.core.preview",
      "example.core.missing",
      "example.core.enabled",
      "example.core.preview",
    ]);

    expect(batch[0]).toEqual(evaluator.evaluate(requests[0]));
    expect(batch[1]).toEqual(evaluator.evaluate(requests[1]));
    expect(batch[2]).toEqual(evaluator.evaluate(requests[2]));
    expect(batch[3]).toEqual(evaluator.evaluate(requests[3]));
  });

  it("is deterministic and ignores evaluation context in P14", () => {
    const { evaluator } = assembleEvaluator();
    const a = evaluator.evaluate({
      flagId: "example.core.preview",
      context: {
        platformId: "example",
        environmentRef: "prod",
        attributes: { cohort: "beta" },
      },
    });
    const b = evaluator.evaluate({
      flagId: "example.core.preview",
      context: {
        platformId: "other",
        environmentRef: "dev",
        attributes: { cohort: "control" },
      },
    });
    expect(a).toEqual(b);
    expect(a.enabled).toBe(true);
    expect(a.source).toBe("default");
  });

  it("does not mutate the flag registry", () => {
    const { flags, evaluator } = assembleEvaluator();
    const beforeSize = flags.size();
    const beforeList = flags.list();
    const beforeRecord = flags.get("example.core.enabled");

    evaluator.evaluate({ flagId: "example.core.enabled" });
    evaluator.evaluateBatch([
      { flagId: "example.core.preview" },
      { flagId: "example.core.missing" },
    ]);

    expect(flags.size()).toBe(beforeSize);
    expect(flags.list()).toEqual(beforeList);
    expect(flags.get("example.core.enabled")).toEqual(beforeRecord);
  });

  it("does not expose override, cohort, capability, or SDK behavior", () => {
    const { evaluator } = assembleEvaluator();
    const result = evaluator.evaluate({ flagId: "example.core.preview" });
    expect(result.source).toBe("default");
    expect(result.source).not.toBe("override");

    const asserter: UmCapabilityAsserter | undefined = undefined;
    const sdk: UmCoreSdkClient | undefined = undefined;
    expect(asserter).toBeUndefined();
    expect(sdk).toBeUndefined();
    expect("assertEnabled" in evaluator).toBe(false);
    expect("register" in evaluator).toBe(false);
  });
});
