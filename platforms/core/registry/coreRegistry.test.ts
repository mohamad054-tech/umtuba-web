/**
 * Focused UM Core P12 aggregate registry facade tests.
 * Model A composition only — AGGREGATE REGISTRY COMPOSITION IS NOT RUNTIME ORCHESTRATION.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryCapabilityRegistry } from "../capability";
import { createInMemoryDependencyRegistry } from "../dependency";
import { createInMemoryEventTypeRegistry } from "../event";
import { createInMemoryFlagRegistry } from "../flag";
import { createInMemoryHealthRegistry } from "../health";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryNamingRegistry } from "../naming";
import {
  createInMemoryPlatformRegistry,
  createUmCoreRegistry,
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

function assembleEmptyDeps() {
  const platforms = createInMemoryPlatformRegistry();
  const capabilities = createInMemoryCapabilityRegistry({ platforms });
  const events = createInMemoryEventTypeRegistry({ platforms });
  const flags = createInMemoryFlagRegistry({ platforms });
  const dependencies = createInMemoryDependencyRegistry({ platforms });
  const health = createInMemoryHealthRegistry({ platforms });
  const naming = createInMemoryNamingRegistry({ platforms });
  return {
    platforms,
    capabilities,
    events,
    flags,
    dependencies,
    health,
    naming,
  };
}

describe("um.core P12 aggregate registry facade", () => {
  it("creates a Model A facade with exact seven slot object identities", () => {
    const deps = assembleEmptyDeps();
    const registry = createUmCoreRegistry(deps);

    expect(registry.platforms).toBe(deps.platforms);
    expect(registry.capabilities).toBe(deps.capabilities);
    expect(registry.events).toBe(deps.events);
    expect(registry.flags).toBe(deps.flags);
    expect(registry.health).toBe(deps.health);
    expect(registry.dependencies).toBe(deps.dependencies);
    expect(registry.naming).toBe(deps.naming);

    expect(Object.isFrozen(registry)).toBe(true);
    expect("routing" in registry).toBe(false);
    expect("validators" in registry).toBe(false);
    expect("sdk" in registry).toBe(false);
  });

  it("exposes read access matching direct specialized registry reads", () => {
    const deps = assembleEmptyDeps();
    expect(deps.platforms.register({ manifest: validManifest() }).ok).toBe(
      true,
    );
    const registry = createUmCoreRegistry(deps);

    expect(registry.platforms.get("example")?.platformId).toBe("example");
    expect(registry.platforms.list()).toEqual(deps.platforms.list());
    expect(registry.platforms.list()).toHaveLength(deps.platforms.size());
    expect(registry.capabilities.size()).toBe(deps.capabilities.size());
    expect(registry.events.size()).toBe(deps.events.size());
    expect(registry.flags.size()).toBe(deps.flags.size());
    expect(registry.health.size()).toBe(deps.health.size());
    expect(registry.dependencies.size()).toBe(deps.dependencies.size());
    expect(registry.naming.size()).toBe(deps.naming.size());
  });

  it("does not mutate specialized registries during construction", () => {
    const deps = assembleEmptyDeps();
    expect(deps.platforms.register({ manifest: validManifest() }).ok).toBe(
      true,
    );

    const before = {
      platforms: deps.platforms.size(),
      capabilities: deps.capabilities.size(),
      events: deps.events.size(),
      flags: deps.flags.size(),
      health: deps.health.size(),
      dependencies: deps.dependencies.size(),
      naming: deps.naming.size(),
      platformList: deps.platforms.list(),
      namingList: deps.naming.list(),
    };

    createUmCoreRegistry(deps);

    expect(deps.platforms.size()).toBe(before.platforms);
    expect(deps.capabilities.size()).toBe(before.capabilities);
    expect(deps.events.size()).toBe(before.events);
    expect(deps.flags.size()).toBe(before.flags);
    expect(deps.health.size()).toBe(before.health);
    expect(deps.dependencies.size()).toBe(before.dependencies);
    expect(deps.naming.size()).toBe(before.naming);
    expect(deps.platforms.list()).toEqual(before.platformList);
    expect(deps.naming.list()).toEqual(before.namingList);
  });

  it("does not construct specialized registries or auto-rebuild naming", () => {
    const platforms = createInMemoryPlatformRegistry();
    const capabilities = createInMemoryCapabilityRegistry({ platforms });
    const events = createInMemoryEventTypeRegistry({ platforms });
    const flags = createInMemoryFlagRegistry({ platforms });
    const dependencies = createInMemoryDependencyRegistry({ platforms });
    const health = createInMemoryHealthRegistry({ platforms });
    const naming = createInMemoryNamingRegistry({ platforms });

    expect(platforms.register({ manifest: validManifest() }).ok).toBe(true);
    // Naming was built before platform registration — snapshot is empty.
    expect(naming.size()).toBe(0);

    const registry = createUmCoreRegistry({
      platforms,
      capabilities,
      events,
      flags,
      health,
      dependencies,
      naming,
    });

    expect(registry.naming).toBe(naming);
    expect(registry.naming.size()).toBe(0);
    expect(registry.naming.has("platform", "example")).toBe(false);

    // Facade must not magically refresh naming when sources already changed.
    expect(platforms.has("example")).toBe(true);
    expect(registry.naming.size()).toBe(0);

    naming.rebuild();
    expect(registry.naming).toBe(naming);
    expect(registry.naming.has("platform", "example")).toBe(true);
    expect(registry.naming.get("platform", "example")?.displayName).toBe(
      "Example Platform",
    );
  });

  it("is deterministic for the same dependency object references", () => {
    const deps = assembleEmptyDeps();
    const a = createUmCoreRegistry(deps);
    const b = createUmCoreRegistry(deps);

    expect(a.platforms).toBe(b.platforms);
    expect(a.capabilities).toBe(b.capabilities);
    expect(a.events).toBe(b.events);
    expect(a.flags).toBe(b.flags);
    expect(a.health).toBe(b.health);
    expect(a.dependencies).toBe(b.dependencies);
    expect(a.naming).toBe(b.naming);
  });

  it("keeps mutable APIs on caller-held in-memory instances", () => {
    const deps = assembleEmptyDeps();
    const registry = createUmCoreRegistry(deps);

    expect(deps.platforms.register({ manifest: validManifest() }).ok).toBe(
      true,
    );
    expect(registry.platforms.get("example")?.platformId).toBe("example");

    deps.platforms.clear();
    expect(registry.platforms.get("example")).toBeUndefined();
  });
});
