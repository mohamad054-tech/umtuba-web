/**
 * Bounded deterministic property-style regression for pure Core validators.
 *
 * TASK: UM_CORE_PLATFORM_VALIDATION_FUZZ_PROPERTY_REGRESSION_V1
 * AGENT: PC2-A2
 *
 * Surfaces:
 * - Manifest validation (P2)
 * - P13 dependency completeness/drift review
 * - P19 Dependency Validator
 * - Referential Integrity review
 *
 * Properties:
 * DETERMINISTIC_OUTPUT, NO_STORE_MUTATION, NO_INPUT_MUTATION,
 * STABLE_FINDING_ORDER, FAIL_CLOSED_INVALID_REFERENCE,
 * DUPLICATE_INPUT_STABILITY, UNKNOWN_PLATFORM_STABILITY,
 * REPEATED_VALIDATION_EQUIVALENCE
 *
 * No external fuzz package. No uncontrolled random long-running fuzzing.
 * TEST-ONLY — does not change production validator semantics.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryCapabilityRegistry } from "../capability";
import {
  createInMemoryDependencyRegistry,
  type UmDependencyRequirement,
} from "../dependency";
import {
  createInMemoryEventRoutingRegistry,
  createInMemoryEventTypeRegistry,
} from "../event";
import { createInMemoryFlagRegistry } from "../flag";
import {
  createInMemoryHealthRegistry,
  createInMemoryHealthReporter,
  type UmHealthSnapshot,
} from "../health";
import type { UmPlatformManifest } from "../manifest/types";
import { createInMemoryPlatformRegistry } from "../registry";
import {
  UmDependencyValidationCode,
  UmDependencyValidatorCode,
  UmManifestValidationCode,
  UmReferentialIntegrityCode,
  validateDependencyRequirements,
  validatePlatformDependencies,
  validatePlatformManifest,
  validateReferentialIntegrity,
} from "./index";

// ---------------------------------------------------------------------------
// Deterministic seeds + dataset boundaries (documented for Central report)
// ---------------------------------------------------------------------------

/** Primary LCG seed for case generation. */
export const DETERMINISTIC_SEED_PRIMARY = 0x5eedc0de;
/** Secondary seed for permutation / shuffle of finding-order stress cases. */
export const DETERMINISTIC_SEED_SECONDARY = 0x0a11ce55;
/** Seed for duplicate-input case families. */
export const DETERMINISTIC_SEED_DUPLICATE = 0xd00ce001;
/** Seed for unknown-platform case families. */
export const DETERMINISTIC_SEED_UNKNOWN = 0xa11ce002;

export const DATASET_BOUNDARIES = {
  maxCasesPerFamily: 24,
  maxPlatforms: 6,
  maxRequirements: 12,
  maxCapabilities: 8,
  maxDependencyEdges: 16,
  maxRepeatedRuns: 3,
  maxManifestMutations: 16,
} as const;

// ---------------------------------------------------------------------------
// Tiny deterministic PRNG (mulberry32) — no Math.random
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

function intIn(rng: () => number, min: number, maxInclusive: number): number {
  return min + Math.floor(rng() * (maxInclusive - min + 1));
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function jsonFingerprint(value: unknown): string {
  return JSON.stringify(value);
}

function storeFingerprint(stores: {
  platforms?: { size(): number; list(): readonly unknown[] };
  dependencies?: { size(): number; list(): readonly unknown[] };
  capabilities?: { size(): number; list(): readonly unknown[] };
  eventTypes?: { size(): number; list(): readonly unknown[] };
  eventRoutes?: { size(): number; list(): readonly unknown[] };
  flags?: { size(): number; list(): readonly unknown[] };
  healthDeclarations?: { size(): number; list(): readonly unknown[] };
  healthObservations?: { list(): readonly unknown[] };
}): string {
  return jsonFingerprint({
    platforms: stores.platforms?.size(),
    platformList: stores.platforms?.list(),
    dependencies: stores.dependencies?.size(),
    depList: stores.dependencies?.list(),
    capabilities: stores.capabilities?.size(),
    capList: stores.capabilities?.list(),
    eventTypes: stores.eventTypes?.size(),
    eventTypeList: stores.eventTypes?.list(),
    eventRoutes: stores.eventRoutes?.size(),
    routeList: stores.eventRoutes?.list(),
    flags: stores.flags?.size(),
    flagList: stores.flags?.list(),
    healthDeclarations: stores.healthDeclarations?.size(),
    healthDeclList: stores.healthDeclarations?.list(),
    healthObsList: stores.healthObservations?.list(),
  });
}

function assertManifestFindingOrder(
  findings: readonly { severity: string; code: string; path?: string }[],
): void {
  const rank: Record<string, number> = { error: 0, warning: 1, info: 2 };
  for (let i = 1; i < findings.length; i++) {
    const a = findings[i - 1]!;
    const b = findings[i]!;
    const sev = (rank[a.severity] ?? 99) - (rank[b.severity] ?? 99);
    if (sev !== 0) {
      expect(sev).toBeLessThan(0);
      continue;
    }
    const code = a.code.localeCompare(b.code);
    if (code !== 0) {
      expect(code).toBeLessThan(0);
      continue;
    }
    expect((a.path ?? "").localeCompare(b.path ?? "")).toBeLessThanOrEqual(0);
  }
}

function assertDepFindingOrder(
  findings: readonly {
    code: string;
    targetId?: string;
    relatedCapabilityId?: string;
  }[],
): void {
  for (let i = 1; i < findings.length; i++) {
    const a = findings[i - 1]!;
    const b = findings[i]!;
    const code = a.code.localeCompare(b.code);
    if (code !== 0) {
      expect(code).toBeLessThan(0);
      continue;
    }
    const target = (a.targetId ?? "").localeCompare(b.targetId ?? "");
    if (target !== 0) {
      expect(target).toBeLessThan(0);
      continue;
    }
    expect(
      (a.relatedCapabilityId ?? "").localeCompare(b.relatedCapabilityId ?? ""),
    ).toBeLessThanOrEqual(0);
  }
}

function assertRiFindingOrder(
  findings: readonly { code: string; path?: string; message: string }[],
): void {
  for (let i = 1; i < findings.length; i++) {
    const a = findings[i - 1]!;
    const b = findings[i]!;
    const code = a.code.localeCompare(b.code);
    if (code !== 0) {
      expect(code).toBeLessThan(0);
      continue;
    }
    const path = (a.path ?? "").localeCompare(b.path ?? "");
    if (path !== 0) {
      expect(path).toBeLessThan(0);
      continue;
    }
    expect(a.message.localeCompare(b.message)).toBeLessThanOrEqual(0);
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function platformManifest(
  platformId: string,
  overrides: Partial<UmPlatformManifest> = {},
): UmPlatformManifest {
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
        defaultState: "off",
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
    ...overrides,
  };
}

function peerKernelReq(): UmDependencyRequirement {
  return {
    targetKind: "peer_kernel",
    targetId: "um.core",
    strength: "required",
    reason: "Core contracts",
  };
}

type ManifestMutation =
  | { kind: "bad_platform_id" }
  | { kind: "empty_version" }
  | { kind: "missing_owners" }
  | { kind: "dup_module" }
  | { kind: "dup_capability" }
  | { kind: "unknown_module_cap_ref" }
  | { kind: "self_platform_cycle" }
  | { kind: "unknown_in_platform_cap_dep" }
  | { kind: "bad_maturity" }
  | { kind: "incomplete_side_effects" };

const MANIFEST_MUTATIONS: readonly ManifestMutation[] = [
  { kind: "bad_platform_id" },
  { kind: "empty_version" },
  { kind: "missing_owners" },
  { kind: "dup_module" },
  { kind: "dup_capability" },
  { kind: "unknown_module_cap_ref" },
  { kind: "self_platform_cycle" },
  { kind: "unknown_in_platform_cap_dep" },
  { kind: "bad_maturity" },
  { kind: "incomplete_side_effects" },
];

function applyManifestMutation(
  base: UmPlatformManifest,
  mutation: ManifestMutation,
): UmPlatformManifest {
  switch (mutation.kind) {
    case "bad_platform_id":
      return { ...base, platformId: "Bad_ID" };
    case "empty_version":
      return { ...base, platformVersion: "" };
    case "missing_owners":
      return { ...base, owners: [] };
    case "dup_module":
      return {
        ...base,
        modules: [
          ...base.modules,
          {
            moduleId: base.modules[0]!.moduleId,
            displayName: "Dup",
            capabilityIds: [],
          },
        ],
      };
    case "dup_capability":
      return {
        ...base,
        capabilities: [
          ...base.capabilities,
          { ...base.capabilities[0]!, displayName: "Dup Cap" },
        ],
      };
    case "unknown_module_cap_ref":
      return {
        ...base,
        modules: [
          {
            ...base.modules[0]!,
            capabilityIds: [
              ...base.modules[0]!.capabilityIds,
              `${base.platformId}.core.missing`,
            ],
          },
        ],
      };
    case "self_platform_cycle":
      return {
        ...base,
        requires: [
          ...base.requires,
          {
            targetKind: "platform",
            targetId: base.platformId,
            strength: "required",
            reason: "Self cycle",
          },
        ],
      };
    case "unknown_in_platform_cap_dep":
      return {
        ...base,
        requires: [
          ...base.requires,
          {
            targetKind: "capability",
            targetId: `${base.platformId}.core.ghost`,
            strength: "required",
            reason: "Ghost cap",
          },
        ],
      };
    case "bad_maturity":
      return { ...base, maturityLevel: 9 as UmPlatformManifest["maturityLevel"] };
    case "incomplete_side_effects":
      return { ...base, sideEffectSummary: [] };
  }
}

function generateManifestCases(seed: number): UmPlatformManifest[] {
  const rng = mulberry32(seed);
  const cases: UmPlatformManifest[] = [];
  cases.push(platformManifest("alpha"));
  cases.push(platformManifest("beta"));

  const mutationCount = Math.min(
    DATASET_BOUNDARIES.maxManifestMutations,
    MANIFEST_MUTATIONS.length,
  );
  for (let i = 0; i < mutationCount; i++) {
    const mutation = MANIFEST_MUTATIONS[i]!;
    const id = pick(rng, ["gamma", "delta", "epsilon"] as const);
    cases.push(applyManifestMutation(platformManifest(id), mutation));
  }

  // Bounded combinatorial: mix two mutations via sequential apply (still <= bound).
  for (let i = 0; i < 6; i++) {
    const m1 = pick(rng, MANIFEST_MUTATIONS);
    const m2 = pick(rng, MANIFEST_MUTATIONS);
    const id = `p${intIn(rng, 0, 5)}`;
    const once = applyManifestMutation(platformManifest(id), m1);
    cases.push(applyManifestMutation(once, m2));
  }

  return cases.slice(0, DATASET_BOUNDARIES.maxCasesPerFamily);
}

function assembleBaseCatalogs(platformIds: readonly string[]) {
  const platforms = createInMemoryPlatformRegistry();
  for (const platformId of platformIds) {
    expect(
      platforms.register({ manifest: platformManifest(platformId) }).ok,
    ).toBe(true);
  }

  const capabilities = createInMemoryCapabilityRegistry({ platforms });
  for (const platformId of platformIds) {
    expect(
      capabilities.register({
        capability: {
          capabilityId: `${platformId}.core.ping`,
          platformId,
          moduleId: `${platformId}.core`,
          displayName: "Ping",
          sideEffectClasses: ["read"],
          authClass: "none",
          stability: "stable",
          version: "1.0.0",
          flagId: `${platformId}.core.enabled`,
        },
      }).ok,
    ).toBe(true);
  }

  const eventTypes = createInMemoryEventTypeRegistry({ platforms });
  for (const platformId of platformIds) {
    expect(
      eventTypes.register({
        eventType: {
          eventType: `${platformId}.core.pinged`,
          producerPlatformId: platformId,
          schemaVersion: "1.0.0",
          compatibilityPolicy: "backward",
          payloadSchemaRef: `schema://${platformId}.core.pinged`,
          piiClass: "none",
          deliveryExpectation: "best_effort",
          stability: "stable",
          subjectRefExpectations: [`${platformId}.ping`],
        },
      }).ok,
    ).toBe(true);
  }

  const eventRoutes = createInMemoryEventRoutingRegistry({
    platforms,
    eventTypes,
  });
  for (const platformId of platformIds) {
    expect(
      eventRoutes.register({
        route: {
          eventType: `${platformId}.core.pinged`,
          destinationPlatformId: platformId,
        },
      }).ok,
    ).toBe(true);
  }

  const flags = createInMemoryFlagRegistry({ platforms, capabilities });
  for (const platformId of platformIds) {
    expect(
      flags.register({
        flag: {
          flagId: `${platformId}.core.enabled`,
          ownerPlatformId: platformId,
          ownerRef: `${platformId}.owners`,
          defaultState: "off",
          linkedCapabilityIds: [`${platformId}.core.ping`],
          dangerElevated: false,
          auditRequired: false,
        },
      }).ok,
    ).toBe(true);
  }

  const dependencies = createInMemoryDependencyRegistry({
    platforms,
    capabilities,
  });
  for (const platformId of platformIds) {
    expect(
      dependencies.register({
        dependency: {
          fromPlatformId: platformId,
          targetKind: "peer_kernel",
          targetId: "um.core",
          strength: "required",
          reason: "Core contracts",
        },
      }).ok,
    ).toBe(true);
  }

  const healthDeclarations = createInMemoryHealthRegistry({ platforms });
  for (const platformId of platformIds) {
    expect(
      healthDeclarations.register({
        health: {
          platformId,
          reportsStatus: true,
          probeRef: `probe.${platformId}.health`,
        },
      }).ok,
    ).toBe(true);
  }

  const healthObservations = createInMemoryHealthReporter({ platforms });
  for (const platformId of platformIds) {
    const snapshot: UmHealthSnapshot = {
      platformId,
      status: "ready",
      checkedAt: "2026-08-10T00:00:00.000Z",
      affectedCapabilityIds: [`${platformId}.core.ping`],
      dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
    };
    expect(healthObservations.report(snapshot).ok).toBe(true);
  }

  return {
    platforms,
    capabilities,
    eventTypes,
    eventRoutes,
    flags,
    dependencies,
    healthDeclarations,
    healthObservations,
  };
}

function generateRequirementCases(
  seed: number,
  knownPlatforms: readonly string[],
): UmDependencyRequirement[][] {
  const rng = mulberry32(seed);
  const families: UmDependencyRequirement[][] = [];

  families.push([peerKernelReq()]);
  families.push([
    peerKernelReq(),
    {
      targetKind: "platform",
      targetId: knownPlatforms[0] ?? "alpha",
      strength: "optional",
      reason: "Optional peer",
    },
  ]);

  // Unknown platform target
  families.push([
    peerKernelReq(),
    {
      targetKind: "platform",
      targetId: "ghost.platform",
      strength: "required",
      reason: "Needs ghost",
    },
  ]);

  // Unknown in-platform capability (fail-closed when P5 provided)
  families.push([
    peerKernelReq(),
    {
      targetKind: "capability",
      targetId: `${knownPlatforms[0] ?? "alpha"}.core.missing`,
      strength: "required",
      reason: "Missing cap",
    },
  ]);

  // Duplicate requirement stability
  const dup: UmDependencyRequirement = {
    targetKind: "peer_kernel",
    targetId: "um.core",
    strength: "required",
    reason: "Core contracts",
  };
  families.push([dup, { ...dup }]);

  // Structural invalids (bounded)
  families.push([
    {
      targetKind: "platform",
      targetId: "",
      strength: "required",
      reason: "Empty target",
    },
  ]);
  families.push([
    {
      targetKind: "not_a_kind" as UmDependencyRequirement["targetKind"],
      targetId: "x.y",
      strength: "required",
      reason: "Bad kind",
    },
  ]);
  families.push([
    {
      targetKind: "platform",
      targetId: "Bad_ID",
      strength: "required",
      reason: "Bad naming",
    },
  ]);

  // Bounded generated mixes
  const strengths = ["required", "optional"] as const;
  for (let i = 0; i < 8; i++) {
    const n = intIn(rng, 1, DATASET_BOUNDARIES.maxRequirements);
    const reqs: UmDependencyRequirement[] = [peerKernelReq()];
    for (let j = 1; j < n; j++) {
      const mode = intIn(rng, 0, 3);
      if (mode === 0) {
        reqs.push({
          targetKind: "platform",
          targetId: pick(rng, [...knownPlatforms, "ghost.z"]),
          strength: pick(rng, strengths),
          reason: `gen-${i}-${j}`,
        });
      } else if (mode === 1) {
        const owner = pick(rng, knownPlatforms);
        reqs.push({
          targetKind: "capability",
          targetId: pick(rng, [
            `${owner}.core.ping`,
            `${owner}.core.missing`,
          ]),
          strength: pick(rng, strengths),
          reason: `cap-${i}-${j}`,
        });
      } else if (mode === 2) {
        reqs.push({
          targetKind: "peer_kernel",
          targetId: pick(rng, ["um.core", "um.extra"]),
          strength: pick(rng, strengths),
          reason: `peer-${i}-${j}`,
        });
      } else {
        // intentional duplicate of peer kernel for DUPLICATE_INPUT_STABILITY
        reqs.push(peerKernelReq());
      }
    }
    families.push(reqs);
  }

  return families.slice(0, DATASET_BOUNDARIES.maxCasesPerFamily);
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe("UM Core validation property regression V1", () => {
  describe("manifest validation properties", () => {
    it("DETERMINISTIC_OUTPUT + REPEATED_VALIDATION_EQUIVALENCE + NO_INPUT_MUTATION + STABLE_FINDING_ORDER", () => {
      const cases = generateManifestCases(DETERMINISTIC_SEED_PRIMARY);
      expect(cases.length).toBeGreaterThan(0);
      expect(cases.length).toBeLessThanOrEqual(
        DATASET_BOUNDARIES.maxCasesPerFamily,
      );

      for (const manifest of cases) {
        const inputBefore = jsonFingerprint(manifest);
        const first = validatePlatformManifest(manifest);
        const second = validatePlatformManifest(manifest);
        const third = validatePlatformManifest(deepClone(manifest));

        expect(jsonFingerprint(manifest)).toBe(inputBefore);
        expect(second).toEqual(first);
        expect(third).toEqual(first);
        assertManifestFindingOrder(first.findings);

        for (let r = 0; r < DATASET_BOUNDARIES.maxRepeatedRuns; r++) {
          expect(validatePlatformManifest(manifest)).toEqual(first);
        }
      }
    });

    it("FAIL_CLOSED_INVALID_REFERENCE for unknown in-manifest refs", () => {
      const manifest = applyManifestMutation(platformManifest("alpha"), {
        kind: "unknown_module_cap_ref",
      });
      const result = validatePlatformManifest(manifest);
      expect(result.ok).toBe(false);
      expect(
        result.findings.some(
          (f) =>
            f.code === UmManifestValidationCode.MODULE_CAPABILITY_REF_UNKNOWN,
        ),
      ).toBe(true);
    });

    it("DUPLICATE_INPUT_STABILITY for duplicate module/capability ids", () => {
      const dupMod = applyManifestMutation(platformManifest("alpha"), {
        kind: "dup_module",
      });
      const a = validatePlatformManifest(dupMod);
      const b = validatePlatformManifest(dupMod);
      expect(a).toEqual(b);
      expect(
        a.findings.some(
          (f) => f.code === UmManifestValidationCode.MODULE_ID_DUPLICATE,
        ),
      ).toBe(true);

      const dupCap = applyManifestMutation(platformManifest("alpha"), {
        kind: "dup_capability",
      });
      const c = validatePlatformManifest(dupCap);
      const d = validatePlatformManifest(dupCap);
      expect(c).toEqual(d);
      expect(
        c.findings.some(
          (f) => f.code === UmManifestValidationCode.CAPABILITY_ID_DUPLICATE,
        ),
      ).toBe(true);
    });
  });

  describe("P13 dependency validation properties", () => {
    it("UNKNOWN_PLATFORM_STABILITY + DETERMINISTIC_OUTPUT + NO_STORE_MUTATION", () => {
      const catalogs = assembleBaseCatalogs(["alpha", "beta"]);
      const before = storeFingerprint(catalogs);

      const r1 = validatePlatformDependencies("missing.platform", {
        platforms: catalogs.platforms,
        dependencies: catalogs.dependencies,
        capabilities: catalogs.capabilities,
      });
      const r2 = validatePlatformDependencies("missing.platform", {
        platforms: catalogs.platforms,
        dependencies: catalogs.dependencies,
        capabilities: catalogs.capabilities,
      });

      expect(r1.ok).toBe(false);
      expect(r1).toEqual(r2);
      expect(r1.findings.map((f) => f.code)).toEqual([
        UmDependencyValidationCode.UNKNOWN_PLATFORM,
      ]);
      assertDepFindingOrder(r1.findings);
      expect(storeFingerprint(catalogs)).toBe(before);
    });

    it("FAIL_CLOSED_INVALID_REFERENCE + STABLE_FINDING_ORDER + REPEATED_VALIDATION_EQUIVALENCE", () => {
      // Admit alpha→beta + temporary peer, then re-register alpha without the peer
      // and drop beta so P13 fail-closes (stale edge + unknown platform target).
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
            requires: [
              {
                targetKind: "platform",
                targetId: "beta",
                strength: "required",
                reason: "Needs beta",
              },
              {
                targetKind: "peer_kernel",
                targetId: "um.extra",
                strength: "optional",
                reason: "Temporary peer",
              },
            ],
          }),
        }).ok,
      ).toBe(true);
      expect(platforms.register({ manifest: platformManifest("beta") }).ok).toBe(
        true,
      );

      const dependencies = createInMemoryDependencyRegistry({ platforms });
      expect(
        dependencies.register({
          dependency: {
            fromPlatformId: "alpha",
            targetKind: "platform",
            targetId: "beta",
            strength: "required",
            reason: "Needs beta",
          },
        }).ok,
      ).toBe(true);
      expect(
        dependencies.register({
          dependency: {
            fromPlatformId: "alpha",
            targetKind: "peer_kernel",
            targetId: "um.extra",
            strength: "optional",
            reason: "Temporary peer",
          },
        }).ok,
      ).toBe(true);

      platforms.clear();
      expect(
        platforms.register({
          manifest: platformManifest("alpha", {
            requires: [
              {
                targetKind: "platform",
                targetId: "beta",
                strength: "required",
                reason: "Needs beta",
              },
            ],
          }),
        }).ok,
      ).toBe(true);

      const store = { platforms, dependencies };
      const before = storeFingerprint(store);
      const first = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
      });
      const second = validatePlatformDependencies("alpha", {
        platforms,
        dependencies,
      });

      expect(first.ok).toBe(false);
      expect(second).toEqual(first);
      assertDepFindingOrder(first.findings);
      expect(
        first.findings.some(
          (f) =>
            f.code === UmDependencyValidationCode.STALE_CATALOG_EDGE &&
            f.targetId === "um.extra",
        ),
      ).toBe(true);
      expect(
        first.findings.some(
          (f) =>
            f.code === UmDependencyValidationCode.UNKNOWN_PLATFORM_TARGET &&
            f.targetId === "beta",
        ),
      ).toBe(true);
      expect(storeFingerprint(store)).toBe(before);
    });

    it("DUPLICATE_INPUT_STABILITY across repeated P13 reviews of identical catalogs", () => {
      const catalogs = assembleBaseCatalogs(["alpha"]);
      const results = Array.from({ length: DATASET_BOUNDARIES.maxRepeatedRuns }, () =>
        validatePlatformDependencies("alpha", {
          platforms: catalogs.platforms,
          dependencies: catalogs.dependencies,
          capabilities: catalogs.capabilities,
        }),
      );
      for (const r of results) {
        expect(r).toEqual(results[0]);
        expect(r.ok).toBe(true);
      }
    });
  });

  describe("P19 dependency validator properties", () => {
    it("bounded generated requirement families: DETERMINISTIC_OUTPUT + NO_INPUT_MUTATION + NO_STORE_MUTATION + STABLE_FINDING_ORDER + REPEATED_VALIDATION_EQUIVALENCE", () => {
      const catalogs = assembleBaseCatalogs(["alpha", "beta", "gamma"]);
      const families = generateRequirementCases(DETERMINISTIC_SEED_SECONDARY, [
        "alpha",
        "beta",
        "gamma",
      ]);
      expect(families.length).toBeGreaterThan(0);
      expect(families.length).toBeLessThanOrEqual(
        DATASET_BOUNDARIES.maxCasesPerFamily,
      );

      for (const requirements of families) {
        const inputBefore = jsonFingerprint(requirements);
        const storeBefore = storeFingerprint(catalogs);

        const first = validateDependencyRequirements("alpha", requirements, {
          platforms: catalogs.platforms,
          capabilities: catalogs.capabilities,
          dependencies: catalogs.dependencies,
        });
        const second = validateDependencyRequirements("alpha", requirements, {
          platforms: catalogs.platforms,
          capabilities: catalogs.capabilities,
          dependencies: catalogs.dependencies,
        });

        expect(jsonFingerprint(requirements)).toBe(inputBefore);
        expect(storeFingerprint(catalogs)).toBe(storeBefore);
        expect(second).toEqual(first);
        assertDepFindingOrder(first.findings);
      }
    });

    it("UNKNOWN_PLATFORM_STABILITY", () => {
      const catalogs = assembleBaseCatalogs(["alpha"]);
      const reqs = [peerKernelReq()];
      const a = validateDependencyRequirements("missing.owner", reqs, {
        platforms: catalogs.platforms,
      });
      const b = validateDependencyRequirements("missing.owner", reqs, {
        platforms: catalogs.platforms,
      });
      expect(a.ok).toBe(false);
      expect(a).toEqual(b);
      expect(a.findings.map((f) => f.code)).toEqual([
        UmDependencyValidatorCode.UNKNOWN_PLATFORM,
      ]);
    });

    it("FAIL_CLOSED_INVALID_REFERENCE for unknown platform/capability targets", () => {
      const catalogs = assembleBaseCatalogs(["alpha"]);
      const result = validateDependencyRequirements(
        "alpha",
        [
          peerKernelReq(),
          {
            targetKind: "platform",
            targetId: "ghost.platform",
            strength: "required",
            reason: "Ghost",
          },
          {
            targetKind: "capability",
            targetId: "alpha.core.missing",
            strength: "required",
            reason: "Missing",
          },
        ],
        {
          platforms: catalogs.platforms,
          capabilities: catalogs.capabilities,
        },
      );
      expect(result.ok).toBe(false);
      expect(
        result.findings.some(
          (f) => f.code === UmDependencyValidatorCode.UNKNOWN_PLATFORM_TARGET,
        ),
      ).toBe(true);
      expect(
        result.findings.some(
          (f) =>
            f.code === UmDependencyValidatorCode.UNKNOWN_CAPABILITY_TARGET,
        ),
      ).toBe(true);
    });

    it("DUPLICATE_INPUT_STABILITY for duplicate requirements", () => {
      const catalogs = assembleBaseCatalogs(["alpha"]);
      const dup = [peerKernelReq(), peerKernelReq()];
      const a = validateDependencyRequirements("alpha", dup, {
        platforms: catalogs.platforms,
      });
      const b = validateDependencyRequirements("alpha", dup, {
        platforms: catalogs.platforms,
      });
      expect(a).toEqual(b);
      expect(
        a.findings.some(
          (f) => f.code === UmDependencyValidatorCode.DUPLICATE_REQUIREMENT,
        ),
      ).toBe(true);
      assertDepFindingOrder(a.findings);
    });
  });

  describe("referential integrity properties", () => {
    it("clean catalogs: DETERMINISTIC_OUTPUT + NO_STORE_MUTATION + REPEATED_VALIDATION_EQUIVALENCE + STABLE_FINDING_ORDER", () => {
      const catalogs = assembleBaseCatalogs(["alpha", "beta"]);
      const before = storeFingerprint(catalogs);
      const first = validateReferentialIntegrity(catalogs);
      const second = validateReferentialIntegrity(catalogs);
      expect(first.ok).toBe(true);
      expect(second).toEqual(first);
      assertRiFindingOrder(first.findings);
      expect(storeFingerprint(catalogs)).toBe(before);

      for (let r = 0; r < DATASET_BOUNDARIES.maxRepeatedRuns; r++) {
        expect(validateReferentialIntegrity(catalogs)).toEqual(first);
      }
    });

    it("FAIL_CLOSED_INVALID_REFERENCE + UNKNOWN_PLATFORM_STABILITY + DUPLICATE_INPUT_STABILITY", () => {
      const catalogs = assembleBaseCatalogs(["alpha"]);

      // Custom observation list (read-only) — reporter admits only structural
      // machine ids, while RI fail-closes on catalog referential misses.
      const snapshots: UmHealthSnapshot[] = [
        {
          platformId: "alpha",
          status: "degraded",
          checkedAt: "2026-08-10T00:01:00.000Z",
          affectedCapabilityIds: ["alpha.core.missing"],
          dependencyStatuses: [
            { targetId: "ghost.dep.target", status: "unavailable" },
            { targetId: "ghost.dep.target", status: "unavailable" },
          ],
        },
      ];
      const healthObservations = { list: () => snapshots };
      const deps = {
        platforms: catalogs.platforms,
        capabilities: catalogs.capabilities,
        dependencies: catalogs.dependencies,
        healthObservations,
      };

      const inputBefore = jsonFingerprint(snapshots);
      const storeBefore = storeFingerprint(catalogs);
      const first = validateReferentialIntegrity(deps);
      const second = validateReferentialIntegrity(deps);

      expect(first.ok).toBe(false);
      expect(second).toEqual(first);
      assertRiFindingOrder(first.findings);
      expect(
        first.findings.some(
          (f) =>
            f.code ===
            UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_CAPABILITY,
        ),
      ).toBe(true);
      expect(
        first.findings.some(
          (f) =>
            f.code ===
            UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET,
        ),
      ).toBe(true);

      // Duplicate ghost dependencyStatuses produce stable ordered findings.
      expect(
        first.findings.map((f) => `${f.code}|${f.path}|${f.message}`),
      ).toEqual(
        second.findings.map((f) => `${f.code}|${f.path}|${f.message}`),
      );
      expect(jsonFingerprint(snapshots)).toBe(inputBefore);
      expect(storeFingerprint(catalogs)).toBe(storeBefore);
    });

    it("UNKNOWN_PLATFORM_STABILITY for health declaration orphan platform ids via empty platform registry", () => {
      const platforms = createInMemoryPlatformRegistry();
      const healthDeclarations = createInMemoryHealthRegistry({ platforms });
      // Cannot register orphan declaration when registry enforces owner — simulate
      // RI review with a custom list surface for observations only.
      const observations = {
        list: () =>
          [
            {
              platformId: "orphan.platform",
              status: "unavailable" as const,
              checkedAt: "2026-08-10T00:00:00.000Z",
              affectedCapabilityIds: [] as string[],
              dependencyStatuses: [] as {
                targetId: string;
                status: "unavailable";
              }[],
            },
          ] as const,
      };

      const a = validateReferentialIntegrity({
        platforms,
        healthObservations: observations,
      });
      const b = validateReferentialIntegrity({
        platforms,
        healthObservations: observations,
      });
      expect(a.ok).toBe(false);
      expect(a).toEqual(b);
      expect(a.findings.map((f) => f.code)).toEqual([
        UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_PLATFORM,
      ]);
    });

    it("NO_INPUT_MUTATION for observation list payloads", () => {
      const platforms = createInMemoryPlatformRegistry();
      expect(
        platforms.register({ manifest: platformManifest("alpha") }).ok,
      ).toBe(true);
      const snapshots: UmHealthSnapshot[] = [
        {
          platformId: "alpha",
          status: "ready",
          checkedAt: "2026-08-10T00:00:00.000Z",
          affectedCapabilityIds: ["alpha.core.ping"],
          dependencyStatuses: [{ targetId: "um.core", status: "ready" }],
        },
      ];
      const before = jsonFingerprint(snapshots);
      const listSurface = { list: () => snapshots };
      validateReferentialIntegrity({
        platforms,
        healthObservations: listSurface,
      });
      expect(jsonFingerprint(snapshots)).toBe(before);
    });
  });

  describe("cross-validator property matrix (bounded)", () => {
    it("seeded case matrix preserves all eight properties across P2/P13/P19/RI", () => {
      const catalogs = assembleBaseCatalogs(["alpha", "beta"]);
      const manifests = generateManifestCases(DETERMINISTIC_SEED_DUPLICATE);
      const reqFamilies = generateRequirementCases(DETERMINISTIC_SEED_UNKNOWN, [
        "alpha",
        "beta",
      ]);

      const storeBefore = storeFingerprint(catalogs);

      for (const manifest of manifests) {
        const inputBefore = jsonFingerprint(manifest);
        const r1 = validatePlatformManifest(manifest);
        const r2 = validatePlatformManifest(manifest);
        expect(r1).toEqual(r2);
        expect(jsonFingerprint(manifest)).toBe(inputBefore);
        assertManifestFindingOrder(r1.findings);
      }

      for (const requirements of reqFamilies) {
        const inputBefore = jsonFingerprint(requirements);
        const r1 = validateDependencyRequirements("alpha", requirements, {
          platforms: catalogs.platforms,
          capabilities: catalogs.capabilities,
          dependencies: catalogs.dependencies,
        });
        const r2 = validateDependencyRequirements("alpha", requirements, {
          platforms: catalogs.platforms,
          capabilities: catalogs.capabilities,
          dependencies: catalogs.dependencies,
        });
        expect(r1).toEqual(r2);
        expect(jsonFingerprint(requirements)).toBe(inputBefore);
        assertDepFindingOrder(r1.findings);
      }

      const p13a = validatePlatformDependencies("alpha", {
        platforms: catalogs.platforms,
        dependencies: catalogs.dependencies,
        capabilities: catalogs.capabilities,
      });
      const p13b = validatePlatformDependencies("alpha", {
        platforms: catalogs.platforms,
        dependencies: catalogs.dependencies,
        capabilities: catalogs.capabilities,
      });
      expect(p13a).toEqual(p13b);
      assertDepFindingOrder(p13a.findings);

      const ria = validateReferentialIntegrity(catalogs);
      const rib = validateReferentialIntegrity(catalogs);
      expect(ria).toEqual(rib);
      assertRiFindingOrder(ria.findings);

      expect(storeFingerprint(catalogs)).toBe(storeBefore);

      // Unknown platform stability across P13 + P19
      const unkP13 = validatePlatformDependencies("no.such", {
        platforms: catalogs.platforms,
        dependencies: catalogs.dependencies,
      });
      const unkP19 = validateDependencyRequirements(
        "no.such",
        [peerKernelReq()],
        { platforms: catalogs.platforms },
      );
      expect(unkP13.findings.map((f) => f.code)).toEqual([
        UmDependencyValidationCode.UNKNOWN_PLATFORM,
      ]);
      expect(unkP19.findings.map((f) => f.code)).toEqual([
        UmDependencyValidatorCode.UNKNOWN_PLATFORM,
      ]);
      expect(validatePlatformDependencies("no.such", {
        platforms: catalogs.platforms,
        dependencies: catalogs.dependencies,
      })).toEqual(unkP13);
      expect(
        validateDependencyRequirements("no.such", [peerKernelReq()], {
          platforms: catalogs.platforms,
        }),
      ).toEqual(unkP19);
    });
  });
});
