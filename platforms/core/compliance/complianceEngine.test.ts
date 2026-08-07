/**
 * Focused UM Core P3 compliance engine tests.
 * Pure assessment only — no registry/runtime.
 */

import { describe, expect, it } from "vitest";
import type { UmPlatformManifest } from "../manifest/types";
import {
  UmComplianceCode,
  assessPlatformCompliance,
  createComplianceEngine,
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

describe("um.core P3 compliance engine", () => {
  it("scores a valid registered platform as compliant and Core Certified eligible", () => {
    const result = assessPlatformCompliance({ manifest: validManifest() });
    expect(result.status).toBe("compliant");
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.criticalViolations).toEqual([]);
    expect(result.maturityOk).toBe(true);
    const core = result.certificationStatus.find((c) => c.kind === "core_certified");
    expect(core?.eligible).toBe(true);
    expect(result.recommendation.code).toMatch(/maintain|raise_maturity/);
  });

  it("emits deterministic ordered findings", () => {
    const result = assessPlatformCompliance({
      manifest: validManifest({
        owners: [],
        soTStatement: "",
        documentationRefs: [],
      }),
    });
    expect(result.status).toBe("non_compliant");
    const sorted = [...result.findings].sort((a, b) => {
      const rank = { critical: 0, warning: 1, info: 2 } as const;
      const s = rank[a.severity] - rank[b.severity];
      if (s !== 0) return s;
      const c = a.code.localeCompare(b.code);
      return c !== 0 ? c : (a.path ?? "").localeCompare(b.path ?? "");
    });
    expect(result.findings).toEqual(sorted);
  });

  it("marks production/enterprise/LTS ineligible at maturity 1", () => {
    const result = assessPlatformCompliance({ manifest: validManifest() });
    const byKind = Object.fromEntries(
      result.certificationStatus.map((c) => [c.kind, c]),
    );
    expect(byKind.core_certified?.eligible).toBe(true);
    expect(byKind.production_certified?.eligible).toBe(false);
    expect(byKind.enterprise_certified?.eligible).toBe(false);
    expect(byKind.long_term_supported?.eligible).toBe(false);
    expect(byKind.production_certified?.blockingCodes).toContain(
      UmComplianceCode.MATURITY_PRODUCTION_REQUIRED,
    );
  });

  it("grants production eligibility at maturity 3 with health reporting", () => {
    const result = assessPlatformCompliance({
      manifest: validManifest({
        maturityLevel: 3,
        health: { reportsStatus: true, probeRef: "probe.example.health" },
      }),
    });
    const prod = result.certificationStatus.find(
      (c) => c.kind === "production_certified",
    );
    expect(prod?.eligible).toBe(true);
    expect(result.status).toBe("compliant");
  });

  it("requires maturity 4 and non-experimental surface for LTS", () => {
    const blocked = assessPlatformCompliance({
      manifest: validManifest({
        maturityLevel: 4,
        capabilities: [
          {
            capabilityId: "example.core.ping",
            moduleId: "example.core",
            displayName: "Ping",
            sideEffectClasses: ["read"],
            stability: "experimental",
            version: "1.0.0",
          },
        ],
        health: { reportsStatus: true, probeRef: "probe.example.health" },
        documentationRefs: ["docs/a.md", "docs/b.md"],
      }),
    });
    const ltsBlocked = blocked.certificationStatus.find(
      (c) => c.kind === "long_term_supported",
    );
    expect(ltsBlocked?.eligible).toBe(false);
    expect(ltsBlocked?.blockingCodes).toContain(
      UmComplianceCode.MATURITY_EXPERIMENTAL_SURFACE,
    );

    const ok = assessPlatformCompliance({
      manifest: validManifest({
        maturityLevel: 4,
        health: { reportsStatus: true, probeRef: "probe.example.health" },
        documentationRefs: ["docs/a.md", "docs/b.md"],
      }),
    });
    const lts = ok.certificationStatus.find((c) => c.kind === "long_term_supported");
    expect(lts?.eligible).toBe(true);
    expect(ok.certificationStatus.every((c) => c.eligible)).toBe(true);
  });

  it("rejects elevated capabilities with default-on flags", () => {
    const result = assessPlatformCompliance({
      manifest: validManifest({
        capabilities: [
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
        modules: [
          {
            moduleId: "example.core",
            displayName: "Core",
            capabilityIds: ["example.core.admin"],
          },
        ],
        flags: [
          {
            flagId: "example.core.admin",
            defaultState: "on",
            linkedCapabilityIds: ["example.core.admin"],
            dangerElevated: true,
          },
        ],
        sideEffectSummary: ["admin"],
        maturityLevel: 3,
        health: { reportsStatus: true, probeRef: "probe.example.health" },
      }),
    });
    expect(
      result.criticalViolations.some(
        (f) => f.code === UmComplianceCode.ELEVATED_FLAG_DEFAULT_ON,
      ),
    ).toBe(true);
    expect(result.status).toBe("non_compliant");
  });

  it("records missing required evidence for thin documentation bundles", () => {
    const result = assessPlatformCompliance({
      manifest: validManifest({
        documentationRefs: ["docs/only.md"],
        maturityLevel: 3,
        health: { reportsStatus: true },
      }),
    });
    expect(
      result.missingRequiredEvidence.some(
        (g) => g.code === UmComplianceCode.EVIDENCE_BUNDLE_THIN,
      ),
    ).toBe(true);
    expect(result.failedStandards.length).toBeGreaterThan(0);
  });

  it("applies waivers deterministically and lists waived codes", () => {
    const result = assessPlatformCompliance({
      manifest: validManifest({
        documentationRefs: ["docs/only.md"],
      }),
      assessedAt: "2026-08-01T00:00:00.000Z",
      waivers: [
        {
          waiverId: "w-thin-docs",
          reason: "Docs consolidation in flight",
          ownerRef: "owner.platform",
          expiresAt: "2026-12-01T00:00:00.000Z",
          riskClass: "documentation",
          compensatingControls: "Architecture review board",
          suppressesCodes: [UmComplianceCode.EVIDENCE_BUNDLE_THIN],
        },
      ],
    });
    expect(result.waivedFindingCodes).toContain(
      UmComplianceCode.EVIDENCE_BUNDLE_THIN,
    );
    expect(
      result.warnings.some((f) => f.code === UmComplianceCode.EVIDENCE_BUNDLE_THIN),
    ).toBe(false);
    expect(
      result.information.some((f) => f.code === UmComplianceCode.WAIVER_APPLIED),
    ).toBe(true);
  });

  it("ignores expired waivers when assessedAt is provided", () => {
    const result = assessPlatformCompliance({
      manifest: validManifest({ documentationRefs: ["docs/only.md"] }),
      assessedAt: "2026-08-01T00:00:00.000Z",
      waivers: [
        {
          waiverId: "w-expired",
          reason: "old",
          ownerRef: "owner.platform",
          expiresAt: "2026-01-01T00:00:00.000Z",
          riskClass: "documentation",
          compensatingControls: "n/a",
          suppressesCodes: [UmComplianceCode.EVIDENCE_BUNDLE_THIN],
        },
      ],
    });
    expect(
      result.warnings.some((f) => f.code === UmComplianceCode.WAIVER_EXPIRED),
    ).toBe(true);
    expect(
      result.warnings.some((f) => f.code === UmComplianceCode.EVIDENCE_BUNDLE_THIN),
    ).toBe(true);
  });

  it("surfaces upstream validation failures as critical compliance findings", () => {
    const result = assessPlatformCompliance({
      manifest: validManifest({ platformId: "Bad_ID" }),
    });
    expect(
      result.criticalViolations.some(
        (f) => f.code === UmComplianceCode.VALIDATION_UPSTREAM_ERROR,
      ),
    ).toBe(true);
    expect(result.score).toBeLessThan(90);
  });

  it("createComplianceEngine assess matches assessPlatformCompliance", () => {
    const manifest = validManifest();
    const engine = createComplianceEngine();
    expect(engine.assess({ manifest })).toEqual(
      assessPlatformCompliance({ manifest }),
    );
  });

  it("does not read the clock — identical inputs yield identical outputs", () => {
    const input = { manifest: validManifest({ maturityLevel: 2 }) };
    expect(assessPlatformCompliance(input)).toEqual(
      assessPlatformCompliance(input),
    );
  });
});
