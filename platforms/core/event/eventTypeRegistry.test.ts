/**
 * Focused UM Core P6 in-memory event type registry tests.
 * Catalog only — no bus, publish, consume, or transport.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UmEventPublisher,
  UmEventTypeRegistryCode,
  createInMemoryEventTypeRegistry,
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
        capabilityIds: ["example.core.ping"],
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
    ],
    providesEvents: [
      {
        eventType: "example.core.pinged",
        schemaVersion: "1.0.0",
        stability: "stable",
      },
      {
        eventType: "example.core.updated",
        schemaVersion: "2.0.0",
        stability: "experimental",
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
    ],
    health: { reportsStatus: true, probeRef: "probe.example.health" },
    sideEffectSummary: ["read"],
    maturityLevel: 1,
    documentationRefs: ["docs/example/README.md", "docs/example/OWNERS.md"],
    soTStatement: "Owns example domain truth only.",
    nonOwnershipStatement: "Does not own money, AI execution, or other platforms.",
    ...overrides,
  };
}

function registerPlatform() {
  const platforms = createInMemoryPlatformRegistry();
  const result = platforms.register({ manifest: validManifest() });
  expect(result.ok).toBe(true);
  return platforms;
}

function pingedDeclaration(
  overrides: Partial<
    Parameters<
      ReturnType<typeof createInMemoryEventTypeRegistry>["register"]
    >[0]["eventType"]
  > = {},
) {
  return {
    eventType: "example.core.pinged",
    producerPlatformId: "example",
    schemaVersion: "1.0.0",
    compatibilityPolicy: "backward" as const,
    payloadSchemaRef: "schemas/example.core.pinged.v1.json",
    piiClass: "none" as const,
    deliveryExpectation: "at_least_once" as const,
    stability: "stable" as const,
    subjectRefExpectations: ["ping"],
    documentationRefs: ["docs/example/events/pinged.md"],
    description: "Emitted when ping completes",
    metadata: { channel: "domain" },
    ...overrides,
  };
}

describe("um.core P6 in-memory event type registry", () => {
  it("registers an event type owned by a registered producer", () => {
    const platforms = registerPlatform();
    const events = createInMemoryEventTypeRegistry({ platforms });
    const result = events.register({
      eventType: pingedDeclaration(),
      registration: { registeredAt: "2026-08-06T00:00:00.000Z" },
    });

    expect(result.ok).toBe(true);
    expect(result.record?.eventType).toBe("example.core.pinged");
    expect(result.record?.payloadSchemaRef).toContain("pinged");
    expect(result.record?.owningPlatformComplianceStatus).toBe("compliant");
    expect(result.record?.registeredAt).toBe("2026-08-06T00:00:00.000Z");
    expect(events.has("example.core.pinged")).toBe(true);
    expect(events.size()).toBe(1);
  });

  it("rejects duplicates and leaves registry unchanged", () => {
    const platforms = registerPlatform();
    const events = createInMemoryEventTypeRegistry({ platforms });
    expect(events.register({ eventType: pingedDeclaration() }).ok).toBe(true);
    const dup = events.register({ eventType: pingedDeclaration() });
    expect(dup.ok).toBe(false);
    expect(dup.findings.map((f) => f.code)).toContain(
      UmEventTypeRegistryCode.DUPLICATE_EVENT_TYPE,
    );
    expect(events.size()).toBe(1);
  });

  it("rejects unknown producer platforms", () => {
    const platforms = createInMemoryPlatformRegistry();
    const events = createInMemoryEventTypeRegistry({ platforms });
    const result = events.register({
      eventType: pingedDeclaration({ producerPlatformId: "missing" }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmEventTypeRegistryCode.UNKNOWN_PRODUCER,
    );
    expect(events.size()).toBe(0);
  });

  it("rejects manifest mismatches", () => {
    const platforms = registerPlatform();
    const events = createInMemoryEventTypeRegistry({ platforms });
    const undeclared = events.register({
      eventType: pingedDeclaration({
        eventType: "example.core.undeclared",
      }),
    });
    expect(undeclared.ok).toBe(false);
    expect(undeclared.findings.map((f) => f.code)).toContain(
      UmEventTypeRegistryCode.MANIFEST_MISMATCH,
    );

    const versionMismatch = events.register({
      eventType: pingedDeclaration({ schemaVersion: "9.9.9" }),
    });
    expect(versionMismatch.ok).toBe(false);
    expect(versionMismatch.findings.map((f) => f.code)).toContain(
      UmEventTypeRegistryCode.MANIFEST_MISMATCH,
    );
    expect(events.size()).toBe(0);
  });

  it("rejects event types outside the producer namespace", () => {
    const platforms = registerPlatform();
    const events = createInMemoryEventTypeRegistry({ platforms });
    const result = events.register({
      eventType: pingedDeclaration({
        eventType: "other.platform.happened",
      }),
    });
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmEventTypeRegistryCode.PLATFORM_NAMESPACE,
    );
  });

  it("rejects invalid schema version, stability, compatibility, PII, delivery, and missing payload schema", () => {
    const platforms = registerPlatform();
    const events = createInMemoryEventTypeRegistry({ platforms });
    const result = events.register({
      eventType: pingedDeclaration({
        schemaVersion: "not-a-version",
        // @ts-expect-error intentional invalid stability
        stability: "maybe",
        // @ts-expect-error intentional invalid compatibility
        compatibilityPolicy: "chaotic",
        // @ts-expect-error intentional invalid pii
        piiClass: "public",
        // @ts-expect-error intentional invalid delivery
        deliveryExpectation: "exactly_once",
        payloadSchemaRef: "  ",
      }),
    });
    expect(result.ok).toBe(false);
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain(UmEventTypeRegistryCode.SCHEMA_VERSION_INVALID);
    expect(codes).toContain(UmEventTypeRegistryCode.STABILITY_INVALID);
    expect(codes).toContain(UmEventTypeRegistryCode.COMPATIBILITY_INVALID);
    expect(codes).toContain(UmEventTypeRegistryCode.PII_CLASS_INVALID);
    expect(codes).toContain(UmEventTypeRegistryCode.DELIVERY_EXPECTATION_INVALID);
    expect(codes).toContain(UmEventTypeRegistryCode.PAYLOAD_SCHEMA_REF_REQUIRED);
    expect(events.size()).toBe(0);
  });

  it("supports deterministic listings and lookups", () => {
    const platforms = registerPlatform();
    const events = createInMemoryEventTypeRegistry({ platforms });
    events.register({
      eventType: pingedDeclaration({
        eventType: "example.core.updated",
        schemaVersion: "2.0.0",
        stability: "experimental",
        piiClass: "minimized",
        deliveryExpectation: "best_effort",
        payloadSchemaRef: "schemas/example.core.updated.v2.json",
        subjectRefExpectations: ["entity"],
      }),
    });
    events.register({ eventType: pingedDeclaration() });

    expect(events.list().map((r) => r.eventType)).toEqual([
      "example.core.pinged",
      "example.core.updated",
    ]);
    expect(events.listByProducer("example")).toHaveLength(2);
    expect(events.listBySchemaVersion("2.0.0")).toHaveLength(1);
    expect(events.listByStability("experimental")[0]?.eventType).toBe(
      "example.core.updated",
    );
    expect(events.listByPiiClass("minimized")).toHaveLength(1);
    expect(events.listByDeliveryExpectation("best_effort")).toHaveLength(1);
    expect(events.get("example.core.pinged")?.compatibilityPolicy).toBe(
      "backward",
    );
  });

  it("emits deterministically ordered findings", () => {
    const platforms = registerPlatform();
    const events = createInMemoryEventTypeRegistry({ platforms });
    const result = events.register({
      eventType: pingedDeclaration({
        eventType: "Bad_ID",
        schemaVersion: "",
        payloadSchemaRef: "",
        subjectRefExpectations: [],
      }),
    });
    const sorted = [...result.findings].sort((a, b) => {
      const rank = { error: 0, warning: 1, info: 2 } as const;
      const s = rank[a.severity] - rank[b.severity];
      if (s !== 0) return s;
      const c = a.code.localeCompare(b.code);
      return c !== 0 ? c : (a.path ?? "").localeCompare(b.path ?? "");
    });
    expect(result.findings).toEqual(sorted);
  });

  it("does not invent registeredAt and does not implement publisher runtime", () => {
    const platforms = registerPlatform();
    const events = createInMemoryEventTypeRegistry({ platforms });
    const result = events.register({ eventType: pingedDeclaration() });
    expect(result.ok).toBe(true);
    expect(result.record?.registeredAt).toBeUndefined();

    // Type-level catalog surface only — UmEventPublisher remains unimplemented.
    const publisherTypeOnly: UmEventPublisher | undefined = undefined;
    expect(publisherTypeOnly).toBeUndefined();
    expect("publish" in events).toBe(false);
    expect("onEvent" in events).toBe(false);
  });

  it("clear empties the in-memory catalog only", () => {
    const platforms = registerPlatform();
    const events = createInMemoryEventTypeRegistry({ platforms });
    events.register({ eventType: pingedDeclaration() });
    events.clear();
    expect(events.size()).toBe(0);
    expect(events.list()).toEqual([]);
  });
});
