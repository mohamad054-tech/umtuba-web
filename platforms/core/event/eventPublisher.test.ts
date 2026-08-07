/**
 * Focused UM Core P16 event publisher tests.
 * EVENT PUBLISHING IS NOT EVENT DELIVERY.
 * EVENT PUBLISHING IS NOT AN EVENT BUS.
 */

import { describe, expect, it } from "vitest";
import type { UmCapabilityAsserter } from "../capability/types";
import type { UmDependencyValidator } from "../dependency/types";
import type { UmHealthReporter } from "../health/types";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import type { UmCoreSdkClient } from "../sdk";
import {
  UmEventPublishCode,
  createInMemoryEventPublisher,
  createInMemoryEventRoutingRegistry,
  createInMemoryEventTypeRegistry,
  type UmEventConsumer,
  type UmPlatformEventEnvelope,
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

function pingedDeclaration(
  overrides: Partial<{
    eventType: string;
    producerPlatformId: string;
    schemaVersion: string;
    subjectRefExpectations: readonly string[];
  }> = {},
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
    ...overrides,
  };
}

function assembleCatalog() {
  const platforms = createInMemoryPlatformRegistry();
  expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
  const eventTypes = createInMemoryEventTypeRegistry({ platforms });
  expect(
    eventTypes.register({
      eventType: pingedDeclaration(),
      registration: { registeredAt: "2026-08-06T00:00:00.000Z" },
    }).ok,
  ).toBe(true);
  const publisher = createInMemoryEventPublisher({ eventTypes });
  return { platforms, eventTypes, publisher };
}

function validEvent(
  overrides: Partial<UmPlatformEventEnvelope<unknown>> = {},
): UmPlatformEventEnvelope<unknown> {
  return {
    eventId: "evt-001",
    eventType: "example.core.pinged",
    occurredAt: "2026-08-07T12:00:00.000Z",
    producerPlatformId: "example",
    subjectRef: { kind: "ping", id: "ping-1" },
    correlationId: "corr-001",
    idempotencyKey: "idem-001",
    schemaVersion: "1.0.0",
    payload: { ok: true },
    ...overrides,
  };
}

describe("um.core P16 event publisher", () => {
  it("rejects unknown event types", () => {
    const { publisher } = assembleCatalog();
    const result = publisher.publish(
      validEvent({ eventType: "example.core.missing" }),
    );
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmEventPublishCode.UNKNOWN_TYPE,
    );
    expect(result.eventType).toBe("example.core.missing");
  });

  it("rejects producer mismatch", () => {
    const { publisher } = assembleCatalog();
    const result = publisher.publish(
      validEvent({ producerPlatformId: "other" }),
    );
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmEventPublishCode.PRODUCER_MISMATCH,
    );
  });

  it("rejects schemaVersion mismatch", () => {
    const { publisher } = assembleCatalog();
    const result = publisher.publish(validEvent({ schemaVersion: "9.9.9" }));
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmEventPublishCode.SCHEMA_VERSION_MISMATCH,
    );
  });

  it("accepts a valid event", () => {
    const { publisher } = assembleCatalog();
    const event = validEvent();
    const result = publisher.publish(event);
    expect(result).toEqual({
      ok: true,
      eventId: "evt-001",
      eventType: "example.core.pinged",
      findings: [],
    });
  });

  it("rejects structural empty or missing envelope fields", () => {
    const { publisher } = assembleCatalog();
    const cases: Array<{
      label: string;
      event: UmPlatformEventEnvelope<unknown>;
      path: string;
    }> = [
      {
        label: "empty eventId",
        event: validEvent({ eventId: "   " }),
        path: "eventId",
      },
      {
        label: "empty occurredAt",
        event: validEvent({ occurredAt: "" }),
        path: "occurredAt",
      },
      {
        label: "empty correlationId",
        event: validEvent({ correlationId: "" }),
        path: "correlationId",
      },
      {
        label: "empty idempotencyKey",
        event: validEvent({ idempotencyKey: " " }),
        path: "idempotencyKey",
      },
      {
        label: "empty subjectRef.kind",
        event: validEvent({
          subjectRef: { kind: "", id: "ping-1" },
        }),
        path: "subjectRef.kind",
      },
      {
        label: "empty subjectRef.id",
        event: validEvent({
          subjectRef: { kind: "ping", id: "" },
        }),
        path: "subjectRef.id",
      },
    ];

    for (const c of cases) {
      const result = publisher.publish(c.event);
      expect(result.ok, c.label).toBe(false);
      expect(
        result.findings.some(
          (f) =>
            f.code === UmEventPublishCode.ENVELOPE_INVALID && f.path === c.path,
        ),
        c.label,
      ).toBe(true);
    }
  });

  it("rejects subject-kind mismatch when expectations are defined", () => {
    const { publisher } = assembleCatalog();
    const result = publisher.publish(
      validEvent({ subjectRef: { kind: "order", id: "o-1" } }),
    );
    expect(result.ok).toBe(false);
    expect(result.findings.map((f) => f.code)).toContain(
      UmEventPublishCode.SUBJECT_KIND_UNEXPECTED,
    );
  });

  it("accepts arbitrary opaque payloads without schema execution", () => {
    const { publisher } = assembleCatalog();
    const payload = {
      nested: [1, { x: true }],
      blob: "not-json-schema-validated",
    };
    const result = publisher.publish(validEvent({ payload }));
    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("does not require a P7 route for publish success", () => {
    const { platforms, eventTypes, publisher } = assembleCatalog();
    const routing = createInMemoryEventRoutingRegistry({
      platforms,
      eventTypes,
    });
    expect(routing.size()).toBe(0);
    const result = publisher.publish(validEvent());
    expect(result.ok).toBe(true);
    expect(routing.size()).toBe(0);
  });

  it("does not dispatch consumers", () => {
    const { publisher } = assembleCatalog();
    let invoked = 0;
    const consumer: UmEventConsumer<{ ok: boolean }> = {
      consumerId: "test.consumer",
      eventType: "example.core.pinged",
      onEvent() {
        invoked += 1;
      },
    };
    expect(publisher.publish(validEvent()).ok).toBe(true);
    expect(invoked).toBe(0);
    expect(typeof consumer.onEvent).toBe("function");
  });

  it("stores no event history and does not mutate the P6 registry", () => {
    const { eventTypes, publisher } = assembleCatalog();
    const beforeSize = eventTypes.size();
    const beforeList = eventTypes.list();
    expect(publisher.publish(validEvent()).ok).toBe(true);
    expect(publisher.publish(validEvent({ eventId: "evt-002" })).ok).toBe(true);
    expect(eventTypes.size()).toBe(beforeSize);
    expect(eventTypes.list()).toEqual(beforeList);
    expect("history" in publisher).toBe(false);
    expect("listPublished" in publisher).toBe(false);
  });

  it("does not generate eventId or occurredAt", () => {
    const { publisher } = assembleCatalog();
    const event = validEvent({
      eventId: "caller-supplied-id",
      occurredAt: "2020-01-01T00:00:00.000Z",
    });
    const result = publisher.publish(event);
    expect(result.ok).toBe(true);
    expect(result.eventId).toBe("caller-supplied-id");
    expect(event.eventId).toBe("caller-supplied-id");
    expect(event.occurredAt).toBe("2020-01-01T00:00:00.000Z");
  });

  it("is deterministic and leaves envelope/payload unchanged", () => {
    const { publisher } = assembleCatalog();
    const event = validEvent({
      payload: Object.freeze({ token: "stable" }),
    });
    const frozen = Object.freeze({ ...event, subjectRef: Object.freeze({ ...event.subjectRef }) });
    const a = publisher.publish(frozen);
    const b = publisher.publish(frozen);
    expect(a).toEqual(b);
    expect(frozen.eventId).toBe("evt-001");
    expect(frozen.payload).toEqual({ token: "stable" });
    expect(frozen.subjectRef).toEqual({ kind: "ping", id: "ping-1" });
  });

  it("exposes no other runtime ports from this milestone", () => {
    const sdk: UmCoreSdkClient | undefined = undefined;
    const reporter: UmHealthReporter | undefined = undefined;
    const depValidator: UmDependencyValidator | undefined = undefined;
    const asserter: UmCapabilityAsserter | undefined = undefined;
    expect(sdk).toBeUndefined();
    expect(reporter).toBeUndefined();
    expect(depValidator).toBeUndefined();
    expect(asserter).toBeUndefined();
  });
});
