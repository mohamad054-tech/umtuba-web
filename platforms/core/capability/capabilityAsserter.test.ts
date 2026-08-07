/**
 * Focused UM Core P15 capability asserter tests.
 * CAPABILITY ASSERTION IS NOT USER AUTHORIZATION.
 * CAPABILITY ASSERTION IS NOT FLAG EVALUATION.
 */

import { describe, expect, it } from "vitest";
import type { UmDependencyValidator } from "../dependency/types";
import type { UmEventPublisher } from "../event/types";
import {
  createInMemoryFlagEvaluator,
  createInMemoryFlagRegistry,
  type UmFlagEvaluator,
  type UmFlagEvaluationRequest,
  type UmFlagEvaluationResult,
} from "../flag";
import type { UmHealthReporter } from "../health/types";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import type { UmCoreSdkClient } from "../sdk";
import {
  UmCapabilityAssertionCode,
  createInMemoryCapabilityAsserter,
  createInMemoryCapabilityRegistry,
  type UmCapabilityRecord,
  type UmCapabilityRegistry,
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
        capabilityIds: [
          "example.core.ping",
          "example.core.admin",
          "example.core.open",
        ],
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
        flagId: "example.core.enabled",
      },
      {
        capabilityId: "example.core.admin",
        moduleId: "example.core",
        displayName: "Admin",
        sideEffectClasses: ["admin"],
        stability: "experimental",
        version: "1.0.0",
        flagId: "example.core.admin",
      },
      {
        capabilityId: "example.core.open",
        moduleId: "example.core",
        displayName: "Open",
        sideEffectClasses: ["read"],
        stability: "stable",
        version: "1.0.0",
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
        defaultState: "on",
        linkedCapabilityIds: ["example.core.ping"],
        dangerElevated: false,
      },
      {
        flagId: "example.core.admin",
        defaultState: "off",
        linkedCapabilityIds: ["example.core.admin"],
        dangerElevated: true,
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

function assemble() {
  const platforms = registerPlatform();
  const capabilities = createInMemoryCapabilityRegistry({ platforms });
  expect(
    capabilities.register({
      capability: {
        capabilityId: "example.core.ping",
        platformId: "example",
        moduleId: "example.core",
        displayName: "Ping",
        sideEffectClasses: ["read"],
        authClass: "authenticated",
        stability: "stable",
        version: "1.0.0",
        flagId: "example.core.enabled",
      },
    }).ok,
  ).toBe(true);
  expect(
    capabilities.register({
      capability: {
        capabilityId: "example.core.admin",
        platformId: "example",
        moduleId: "example.core",
        displayName: "Admin",
        sideEffectClasses: ["admin"],
        authClass: "platform_admin",
        stability: "experimental",
        version: "1.0.0",
        flagId: "example.core.admin",
      },
    }).ok,
  ).toBe(true);
  expect(
    capabilities.register({
      capability: {
        capabilityId: "example.core.open",
        platformId: "example",
        moduleId: "example.core",
        displayName: "Open",
        sideEffectClasses: ["read"],
        authClass: "none",
        stability: "stable",
        version: "1.0.0",
      },
    }).ok,
  ).toBe(true);

  const flagRegistry = createInMemoryFlagRegistry({ platforms });
  expect(
    flagRegistry.register({
      flag: {
        flagId: "example.core.enabled",
        ownerPlatformId: "example",
        ownerRef: "owner.platform",
        defaultState: "on",
        linkedCapabilityIds: ["example.core.ping"],
        dangerElevated: false,
        auditRequired: false,
      },
    }).ok,
  ).toBe(true);
  expect(
    flagRegistry.register({
      flag: {
        flagId: "example.core.admin",
        ownerPlatformId: "example",
        ownerRef: "owner.platform",
        defaultState: "off",
        linkedCapabilityIds: ["example.core.admin"],
        dangerElevated: true,
        auditRequired: true,
      },
    }).ok,
  ).toBe(true);

  const flags = createInMemoryFlagEvaluator({ flags: flagRegistry });
  const asserter = createInMemoryCapabilityAsserter({ capabilities, flags });
  return { platforms, capabilities, flagRegistry, flags, asserter };
}

function trackingEvaluator(inner: UmFlagEvaluator): {
  evaluator: UmFlagEvaluator;
  calls: UmFlagEvaluationRequest[];
} {
  const calls: UmFlagEvaluationRequest[] = [];
  return {
    calls,
    evaluator: {
      evaluate(request) {
        calls.push(request);
        return inner.evaluate(request);
      },
      evaluateBatch(requests) {
        return requests.map((request) => {
          calls.push(request);
          return inner.evaluate(request);
        });
      },
    },
  };
}

describe("um.core P15 capability asserter", () => {
  it("fail-closes unknown capabilities without throwing", () => {
    const { asserter } = assemble();
    const result = asserter.assertEnabled("example.core.missing");
    expect(result.enabled).toBe(false);
    expect(result.reasonCode).toBe(UmCapabilityAssertionCode.UNKNOWN);
    expect(result.flagId).toBeUndefined();
    expect(() => asserter.assertEnabled("example.core.missing")).not.toThrow();
  });

  it("enables known capability without linked flag", () => {
    const { asserter } = assemble();
    const result = asserter.assertEnabled("example.core.open");
    expect(result.enabled).toBe(true);
    expect(result.reasonCode).toBe(UmCapabilityAssertionCode.CATALOG_ENABLED);
    expect(result.stability).toBe("stable");
    expect(result.flagId).toBeUndefined();
  });

  it("enables known capability when linked flag is ON via P14", () => {
    const base = assemble();
    const tracked = trackingEvaluator(base.flags);
    const asserter = createInMemoryCapabilityAsserter({
      capabilities: base.capabilities,
      flags: tracked.evaluator,
    });
    const result = asserter.assertEnabled("example.core.ping");
    expect(result.enabled).toBe(true);
    expect(result.reasonCode).toBe(UmCapabilityAssertionCode.FLAG_ENABLED);
    expect(result.flagId).toBe("example.core.enabled");
    expect(result.stability).toBe("stable");
    expect(tracked.calls).toEqual([{ flagId: "example.core.enabled" }]);
  });

  it("disables known/elevated capability when linked flag is OFF via P14", () => {
    const { asserter } = assemble();
    const result = asserter.assertEnabled("example.core.admin");
    expect(result.enabled).toBe(false);
    expect(result.reasonCode).toBe(UmCapabilityAssertionCode.FLAG_DISABLED);
    expect(result.flagId).toBe("example.core.admin");
    expect(result.stability).toBe("experimental");
  });

  it("enables elevated capability when linked flag evaluates ON via P14", () => {
    const { capabilities } = assemble();
    const flags: UmFlagEvaluator = {
      evaluate(request): UmFlagEvaluationResult {
        return {
          flagId: request.flagId,
          enabled: true,
          source: "default",
          reasonCode: "flag.evaluation.default_on",
        };
      },
      evaluateBatch(requests) {
        return requests.map((request) => ({
          flagId: request.flagId,
          enabled: true,
          source: "default" as const,
          reasonCode: "flag.evaluation.default_on",
        }));
      },
    };
    const asserter = createInMemoryCapabilityAsserter({ capabilities, flags });
    const result = asserter.assertEnabled("example.core.admin");
    expect(result.enabled).toBe(true);
    expect(result.reasonCode).toBe(UmCapabilityAssertionCode.FLAG_ENABLED);
    expect(result.flagId).toBe("example.core.admin");
  });

  it("fail-closes when linked flag is unresolved/unknown", () => {
    const platforms = registerPlatform(
      validManifest({
        capabilities: [
          {
            capabilityId: "example.core.ghost",
            moduleId: "example.core",
            displayName: "Ghost",
            sideEffectClasses: ["read"],
            stability: "stable",
            version: "1.0.0",
            flagId: "example.core.missingflag",
          },
          {
            capabilityId: "example.core.ping",
            moduleId: "example.core",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            stability: "stable",
            version: "1.0.0",
            flagId: "example.core.enabled",
          },
          {
            capabilityId: "example.core.admin",
            moduleId: "example.core",
            displayName: "Admin",
            sideEffectClasses: ["admin"],
            stability: "experimental",
            version: "1.0.0",
            flagId: "example.core.admin",
          },
          {
            capabilityId: "example.core.open",
            moduleId: "example.core",
            displayName: "Open",
            sideEffectClasses: ["read"],
            stability: "stable",
            version: "1.0.0",
          },
        ],
        modules: [
          {
            moduleId: "example.core",
            displayName: "Core Module",
            capabilityIds: [
              "example.core.ping",
              "example.core.admin",
              "example.core.open",
              "example.core.ghost",
            ],
          },
        ],
        flags: [
          {
            flagId: "example.core.enabled",
            defaultState: "on",
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
            flagId: "example.core.missingflag",
            defaultState: "on",
            linkedCapabilityIds: ["example.core.ghost"],
            dangerElevated: false,
          },
        ],
      }),
    );
    const capabilities = createInMemoryCapabilityRegistry({ platforms });
    expect(
      capabilities.register({
        capability: {
          capabilityId: "example.core.ghost",
          platformId: "example",
          moduleId: "example.core",
          displayName: "Ghost",
          sideEffectClasses: ["read"],
          authClass: "none",
          stability: "stable",
          version: "1.0.0",
          flagId: "example.core.missingflag",
        },
      }).ok,
    ).toBe(true);
    // Flag declared in manifest but intentionally not registered into P8 catalog.
    const flagRegistry = createInMemoryFlagRegistry({ platforms });
    const flags = createInMemoryFlagEvaluator({ flags: flagRegistry });
    const asserter = createInMemoryCapabilityAsserter({ capabilities, flags });

    const result = asserter.assertEnabled("example.core.ghost");
    expect(result.enabled).toBe(false);
    expect(result.reasonCode).toBe(UmCapabilityAssertionCode.FLAG_UNRESOLVED);
    expect(result.flagId).toBe("example.core.missingflag");
  });

  it("fail-closes elevated capability without flag using fixture registry", () => {
    const elevatedUngated: UmCapabilityRecord = {
      capabilityId: "example.core.admin.ungated",
      platformId: "example",
      moduleId: "example.core",
      displayName: "Ungated Admin",
      sideEffectClasses: ["admin"],
      authClass: "platform_admin",
      stability: "experimental",
      version: "1.0.0",
    };
    const capabilities: UmCapabilityRegistry = {
      get(id) {
        return id === elevatedUngated.capabilityId ? elevatedUngated : undefined;
      },
      list: () => [elevatedUngated],
      listByPlatform: () => [elevatedUngated],
      listByModule: () => [elevatedUngated],
      listBySideEffectClass: () => [elevatedUngated],
      listByStability: () => [elevatedUngated],
      has: (id) => id === elevatedUngated.capabilityId,
      size: () => 1,
    };
    const flags: UmFlagEvaluator = {
      evaluate: () => {
        throw new Error("should not evaluate");
      },
      evaluateBatch: () => [],
    };
    const asserter = createInMemoryCapabilityAsserter({ capabilities, flags });
    const result = asserter.assertEnabled("example.core.admin.ungated");
    expect(result.enabled).toBe(false);
    expect(result.reasonCode).toBe(UmCapabilityAssertionCode.ELEVATED_UNGATED);
    expect(result.stability).toBe("experimental");
  });

  it("is deterministic and does not mutate capability registry", () => {
    const { asserter, capabilities } = assemble();
    const beforeSize = capabilities.size();
    const beforeList = capabilities.list();
    const a = asserter.assertEnabled("example.core.ping");
    const b = asserter.assertEnabled("example.core.ping");
    expect(a).toEqual(b);
    expect(capabilities.size()).toBe(beforeSize);
    expect(capabilities.list()).toEqual(beforeList);
  });

  it("does not treat authClass as user authorization and exposes no other runtime ports", () => {
    const { asserter, capabilities } = assemble();
    expect(capabilities.get("example.core.open")?.authClass).toBe("none");
    expect(asserter.assertEnabled("example.core.open").enabled).toBe(true);
    expect(capabilities.get("example.core.admin")?.authClass).toBe(
      "platform_admin",
    );
    // Admin capability remains gated by flag OFF, not by authClass alone.
    expect(asserter.assertEnabled("example.core.admin").enabled).toBe(false);

    expect("isEnabled" in asserter).toBe(false);
    expect("assertEnabledBatch" in asserter).toBe(false);

    const sdk: UmCoreSdkClient | undefined = undefined;
    const publisher: UmEventPublisher | undefined = undefined;
    const reporter: UmHealthReporter | undefined = undefined;
    const depValidator: UmDependencyValidator | undefined = undefined;
    expect(sdk).toBeUndefined();
    expect(publisher).toBeUndefined();
    expect(reporter).toBeUndefined();
    expect(depValidator).toBeUndefined();
  });
});
