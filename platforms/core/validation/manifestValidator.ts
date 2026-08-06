/**
 * Manifest validation engine (UM Core P2).
 *
 * Pure validation + diagnostics. No registry, persistence, networking, or runtime.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§2 naming, §3 manifest, §4 capability, §7 dependency)
 */

import type { UmDependencyRequirement } from "../dependency/types";
import type { UmSideEffectClass } from "../identity/types";
import type {
  UmManifestCapability,
  UmManifestEventType,
  UmManifestFlag,
  UmManifestModule,
  UmManifestNavContribution,
  UmOwnerRef,
  UmPlatformManifest,
} from "../manifest/types";
import type { UmMaturityLevel } from "../maturity/types";
import { UmManifestValidationCode } from "./codes";
import type {
  UmManifestValidator,
  UmValidationFinding,
  UmValidationResult,
  UmValidationSeverity,
} from "./interfaces";
import {
  isNonEmptyTrimmed,
  isScopedUnderPlatform,
  isUmMachineId,
  isUmVersionToken,
} from "./naming";

const SIDE_EFFECTS: ReadonlySet<string> = new Set([
  "read",
  "write",
  "money",
  "ai",
  "admin",
  "network_external",
]);

const STABILITIES: ReadonlySet<string> = new Set([
  "experimental",
  "stable",
  "deprecated",
]);

const DEPENDENCY_KINDS: ReadonlySet<string> = new Set([
  "platform",
  "capability",
  "peer_kernel",
]);

const DEPENDENCY_STRENGTHS: ReadonlySet<string> = new Set([
  "required",
  "optional",
]);

const NAV_CLASSES: ReadonlySet<string> = new Set([
  "discovery",
  "destination",
  "creator_hub",
  "domain_hub",
  "workspace",
  "internal",
  "admin",
  "other",
]);

const ELEVATED_SIDE_EFFECTS: ReadonlySet<UmSideEffectClass> = new Set([
  "money",
  "ai",
  "admin",
]);

const SEVERITY_RANK: Record<UmValidationSeverity, number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function finding(
  code: string,
  severity: UmValidationSeverity,
  message: string,
  path: string,
  standardRef: string,
): UmValidationFinding {
  return { code, severity, message, path, standardRef };
}

function compareFindings(a: UmValidationFinding, b: UmValidationFinding): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

function isMaturityLevel(value: unknown): value is UmMaturityLevel {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4;
}

function validateOwners(
  owners: readonly UmOwnerRef[] | undefined,
  out: UmValidationFinding[],
): void {
  if (!owners || owners.length === 0) {
    out.push(
      finding(
        UmManifestValidationCode.OWNERS_REQUIRED,
        "error",
        "Manifest must declare at least one accountable owner.",
        "owners",
        "Standards §3.4 / Spec §7.1",
      ),
    );
    return;
  }
  owners.forEach((owner, index) => {
    const base = `owners[${index}]`;
    if (!isNonEmptyTrimmed(owner?.id)) {
      out.push(
        finding(
          UmManifestValidationCode.OWNER_ID_REQUIRED,
          "error",
          "Owner id is required.",
          `${base}.id`,
          "Standards §3.4",
        ),
      );
    }
    if (!isNonEmptyTrimmed(owner?.displayName)) {
      out.push(
        finding(
          UmManifestValidationCode.OWNER_DISPLAY_NAME_REQUIRED,
          "error",
          "Owner displayName is required.",
          `${base}.displayName`,
          "Standards §3.4",
        ),
      );
    }
  });
}

function validateModules(
  modules: readonly UmManifestModule[] | undefined,
  capabilityById: Map<string, UmManifestCapability>,
  out: UmValidationFinding[],
): Set<string> {
  const moduleIds = new Set<string>();
  if (!modules) {
    return moduleIds;
  }
  const seen = new Map<string, number>();
  modules.forEach((mod, index) => {
    const base = `modules[${index}]`;
    if (!isNonEmptyTrimmed(mod?.moduleId)) {
      out.push(
        finding(
          UmManifestValidationCode.MODULE_ID_REQUIRED,
          "error",
          "Module id is required.",
          `${base}.moduleId`,
          "Standards §2 / §3.4",
        ),
      );
      return;
    }
    if (!isUmMachineId(mod.moduleId)) {
      out.push(
        finding(
          UmManifestValidationCode.MODULE_ID_NAMING,
          "error",
          `Module id "${mod.moduleId}" violates machine-id naming rules (lowercase dotted segments).`,
          `${base}.moduleId`,
          "Standards §2.3",
        ),
      );
    }
    if (seen.has(mod.moduleId)) {
      out.push(
        finding(
          UmManifestValidationCode.MODULE_ID_DUPLICATE,
          "error",
          `Duplicate module id "${mod.moduleId}".`,
          `${base}.moduleId`,
          "Standards §2.3",
        ),
      );
    } else {
      seen.set(mod.moduleId, index);
      moduleIds.add(mod.moduleId);
    }
    if (!isNonEmptyTrimmed(mod.displayName)) {
      out.push(
        finding(
          UmManifestValidationCode.MODULE_DISPLAY_NAME_REQUIRED,
          "error",
          "Module displayName is required.",
          `${base}.displayName`,
          "Standards §3.4",
        ),
      );
    }
    (mod.capabilityIds ?? []).forEach((capId, cIndex) => {
      const capPath = `${base}.capabilityIds[${cIndex}]`;
      const cap = capabilityById.get(capId);
      if (!cap) {
        out.push(
          finding(
            UmManifestValidationCode.MODULE_CAPABILITY_REF_UNKNOWN,
            "error",
            `Module lists unknown capability id "${capId}".`,
            capPath,
            "Standards §3.4 consistency",
          ),
        );
        return;
      }
      if (cap.moduleId !== mod.moduleId) {
        out.push(
          finding(
            UmManifestValidationCode.MODULE_CAPABILITY_REF_MISMATCH,
            "error",
            `Module "${mod.moduleId}" lists capability "${capId}" owned by module "${cap.moduleId}".`,
            capPath,
            "Standards §3.4 consistency",
          ),
        );
      }
    });
  });
  return moduleIds;
}

function validateCapabilities(
  capabilities: readonly UmManifestCapability[] | undefined,
  platformId: string,
  moduleIds: Set<string>,
  flagIds: Set<string>,
  out: UmValidationFinding[],
): Map<string, UmManifestCapability> {
  const byId = new Map<string, UmManifestCapability>();
  if (!capabilities) {
    return byId;
  }
  const seen = new Map<string, number>();
  capabilities.forEach((cap, index) => {
    const base = `capabilities[${index}]`;
    if (!isNonEmptyTrimmed(cap?.capabilityId)) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_ID_REQUIRED,
          "error",
          "Capability id is required.",
          `${base}.capabilityId`,
          "Standards §4.4",
        ),
      );
      return;
    }
    if (!isUmMachineId(cap.capabilityId)) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_ID_NAMING,
          "error",
          `Capability id "${cap.capabilityId}" violates machine-id naming rules.`,
          `${base}.capabilityId`,
          "Standards §2.3",
        ),
      );
    } else if (
      isNonEmptyTrimmed(platformId) &&
      isUmMachineId(platformId) &&
      !isScopedUnderPlatform(cap.capabilityId, platformId)
    ) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_PLATFORM_SCOPE,
          "error",
          `Capability id "${cap.capabilityId}" must be scoped under platform id "${platformId}".`,
          `${base}.capabilityId`,
          "Standards §2.3 / §6.2",
        ),
      );
    }
    if (seen.has(cap.capabilityId)) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_ID_DUPLICATE,
          "error",
          `Duplicate capability id "${cap.capabilityId}".`,
          `${base}.capabilityId`,
          "Standards §2.3",
        ),
      );
    } else {
      seen.set(cap.capabilityId, index);
      byId.set(cap.capabilityId, cap);
    }
    if (!isNonEmptyTrimmed(cap.displayName)) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_DISPLAY_NAME_REQUIRED,
          "error",
          "Capability displayName is required.",
          `${base}.displayName`,
          "Standards §4.4",
        ),
      );
    }
    if (!isNonEmptyTrimmed(cap.moduleId)) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_MODULE_REQUIRED,
          "error",
          "Capability moduleId is required.",
          `${base}.moduleId`,
          "Standards §4.4",
        ),
      );
    } else if (moduleIds.size > 0 && !moduleIds.has(cap.moduleId)) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_MODULE_UNKNOWN,
          "error",
          `Capability references unknown module id "${cap.moduleId}".`,
          `${base}.moduleId`,
          "Standards §3.4 consistency",
        ),
      );
    }
    if (!isNonEmptyTrimmed(cap.version)) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_VERSION_REQUIRED,
          "error",
          "Capability version is required.",
          `${base}.version`,
          "Standards §4.4 / §6",
        ),
      );
    } else if (!isUmVersionToken(cap.version)) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_VERSION_FORMAT,
          "error",
          `Capability version "${cap.version}" is not a valid version token.`,
          `${base}.version`,
          "Standards §6",
        ),
      );
    }
    if (!STABILITIES.has(cap.stability as string)) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_STABILITY_INVALID,
          "error",
          `Capability stability "${String(cap.stability)}" is invalid.`,
          `${base}.stability`,
          "Standards §2.4",
        ),
      );
    }
    const effects = cap.sideEffectClasses ?? [];
    if (effects.length === 0) {
      out.push(
        finding(
          UmManifestValidationCode.CAPABILITY_SIDE_EFFECTS_REQUIRED,
          "error",
          "Capability must declare at least one side-effect class.",
          `${base}.sideEffectClasses`,
          "Standards §4.3 / Spec §6.3",
        ),
      );
    } else {
      const seenEffect = new Set<string>();
      effects.forEach((effect, eIndex) => {
        const ePath = `${base}.sideEffectClasses[${eIndex}]`;
        if (!SIDE_EFFECTS.has(effect)) {
          out.push(
            finding(
              UmManifestValidationCode.CAPABILITY_SIDE_EFFECT_INVALID,
              "error",
              `Unknown side-effect class "${String(effect)}".`,
              ePath,
              "Spec §6.3",
            ),
          );
        } else if (seenEffect.has(effect)) {
          out.push(
            finding(
              UmManifestValidationCode.CAPABILITY_SIDE_EFFECT_DUPLICATE,
              "error",
              `Duplicate side-effect class "${effect}".`,
              ePath,
              "Standards §4.4",
            ),
          );
        } else {
          seenEffect.add(effect);
        }
      });
      const elevated = effects.some((e) =>
        ELEVATED_SIDE_EFFECTS.has(e as UmSideEffectClass),
      );
      if (elevated && !isNonEmptyTrimmed(cap.flagId)) {
        out.push(
          finding(
            UmManifestValidationCode.CAPABILITY_ELEVATED_FLAG_REQUIRED,
            "error",
            `Elevated capability "${cap.capabilityId}" must bind a flagId.`,
            `${base}.flagId`,
            "Standards §4.3 / §14.3",
          ),
        );
      }
      if (isNonEmptyTrimmed(cap.flagId) && !flagIds.has(cap.flagId)) {
        out.push(
          finding(
            UmManifestValidationCode.CAPABILITY_FLAG_UNKNOWN,
            "error",
            `Capability references unknown flag id "${cap.flagId}".`,
            `${base}.flagId`,
            "Standards §3.4 consistency",
          ),
        );
      }
    }
  });
  return byId;
}

function validateEvents(
  events: readonly UmManifestEventType[] | undefined,
  out: UmValidationFinding[],
): void {
  if (!events) return;
  const seen = new Map<string, number>();
  events.forEach((event, index) => {
    const base = `providesEvents[${index}]`;
    if (!isNonEmptyTrimmed(event?.eventType)) {
      out.push(
        finding(
          UmManifestValidationCode.EVENT_TYPE_REQUIRED,
          "error",
          "Event type id is required.",
          `${base}.eventType`,
          "Standards §5.4",
        ),
      );
      return;
    }
    if (!isUmMachineId(event.eventType)) {
      out.push(
        finding(
          UmManifestValidationCode.EVENT_TYPE_NAMING,
          "error",
          `Event type "${event.eventType}" violates machine-id naming rules.`,
          `${base}.eventType`,
          "Standards §2.3",
        ),
      );
    }
    if (seen.has(event.eventType)) {
      out.push(
        finding(
          UmManifestValidationCode.EVENT_TYPE_DUPLICATE,
          "error",
          `Duplicate event type "${event.eventType}".`,
          `${base}.eventType`,
          "Standards §2.3",
        ),
      );
    } else {
      seen.set(event.eventType, index);
    }
    if (!isNonEmptyTrimmed(event.schemaVersion)) {
      out.push(
        finding(
          UmManifestValidationCode.EVENT_SCHEMA_VERSION_REQUIRED,
          "error",
          "Event schemaVersion is required.",
          `${base}.schemaVersion`,
          "Standards §5.4 / §6",
        ),
      );
    } else if (!isUmVersionToken(event.schemaVersion)) {
      out.push(
        finding(
          UmManifestValidationCode.EVENT_SCHEMA_VERSION_FORMAT,
          "error",
          `Event schemaVersion "${event.schemaVersion}" is not a valid version token.`,
          `${base}.schemaVersion`,
          "Standards §6",
        ),
      );
    }
    if (!STABILITIES.has(event.stability as string)) {
      out.push(
        finding(
          UmManifestValidationCode.EVENT_STABILITY_INVALID,
          "error",
          `Event stability "${String(event.stability)}" is invalid.`,
          `${base}.stability`,
          "Standards §2.4",
        ),
      );
    }
  });
}

function validateFlags(
  flags: readonly UmManifestFlag[] | undefined,
  capabilityIds: Set<string>,
  out: UmValidationFinding[],
): Set<string> {
  const flagIds = new Set<string>();
  if (!flags) return flagIds;
  const seen = new Map<string, number>();
  flags.forEach((flag, index) => {
    const base = `flags[${index}]`;
    if (!isNonEmptyTrimmed(flag?.flagId)) {
      out.push(
        finding(
          UmManifestValidationCode.FLAG_ID_REQUIRED,
          "error",
          "Flag id is required.",
          `${base}.flagId`,
          "Standards §14.4",
        ),
      );
      return;
    }
    if (!isUmMachineId(flag.flagId)) {
      out.push(
        finding(
          UmManifestValidationCode.FLAG_ID_NAMING,
          "error",
          `Flag id "${flag.flagId}" violates machine-id naming rules.`,
          `${base}.flagId`,
          "Standards §2.3",
        ),
      );
    }
    if (seen.has(flag.flagId)) {
      out.push(
        finding(
          UmManifestValidationCode.FLAG_ID_DUPLICATE,
          "error",
          `Duplicate flag id "${flag.flagId}".`,
          `${base}.flagId`,
          "Standards §2.3",
        ),
      );
    } else {
      seen.set(flag.flagId, index);
      flagIds.add(flag.flagId);
    }
    if (flag.defaultState !== "on" && flag.defaultState !== "off") {
      out.push(
        finding(
          UmManifestValidationCode.FLAG_DEFAULT_STATE_INVALID,
          "error",
          `Flag defaultState must be "on" or "off".`,
          `${base}.defaultState`,
          "Standards §14.4",
        ),
      );
    }
    (flag.linkedCapabilityIds ?? []).forEach((capId, cIndex) => {
      if (!capabilityIds.has(capId)) {
        out.push(
          finding(
            UmManifestValidationCode.FLAG_LINKED_CAPABILITY_UNKNOWN,
            "error",
            `Flag links unknown capability id "${capId}".`,
            `${base}.linkedCapabilityIds[${cIndex}]`,
            "Standards §3.4 consistency",
          ),
        );
      }
    });
  });
  return flagIds;
}

function validateDependencies(
  platformId: string,
  requires: readonly UmDependencyRequirement[] | undefined,
  capabilityIds: Set<string>,
  out: UmValidationFinding[],
): void {
  if (!requires) return;
  const seen = new Set<string>();
  requires.forEach((req, index) => {
    const base = `requires[${index}]`;
    if (!DEPENDENCY_KINDS.has(req?.targetKind as string)) {
      out.push(
        finding(
          UmManifestValidationCode.DEPENDENCY_TARGET_KIND_INVALID,
          "error",
          `Dependency targetKind "${String(req?.targetKind)}" is invalid.`,
          `${base}.targetKind`,
          "Standards §7.4",
        ),
      );
    }
    if (!isNonEmptyTrimmed(req?.targetId)) {
      out.push(
        finding(
          UmManifestValidationCode.DEPENDENCY_TARGET_ID_REQUIRED,
          "error",
          "Dependency targetId is required.",
          `${base}.targetId`,
          "Standards §7.4",
        ),
      );
    } else if (!isUmMachineId(req.targetId)) {
      out.push(
        finding(
          UmManifestValidationCode.DEPENDENCY_TARGET_ID_NAMING,
          "error",
          `Dependency targetId "${req.targetId}" violates machine-id naming rules.`,
          `${base}.targetId`,
          "Standards §2.3",
        ),
      );
    }
    if (!DEPENDENCY_STRENGTHS.has(req?.strength as string)) {
      out.push(
        finding(
          UmManifestValidationCode.DEPENDENCY_STRENGTH_INVALID,
          "error",
          `Dependency strength "${String(req?.strength)}" is invalid.`,
          `${base}.strength`,
          "Standards §7.4",
        ),
      );
    }
    if (!isNonEmptyTrimmed(req?.reason)) {
      out.push(
        finding(
          UmManifestValidationCode.DEPENDENCY_REASON_REQUIRED,
          "error",
          "Dependency reason is required.",
          `${base}.reason`,
          "Standards §7.4",
        ),
      );
    }

    const key = `${req?.targetKind ?? ""}:${req?.targetId ?? ""}:${req?.strength ?? ""}`;
    if (seen.has(key)) {
      out.push(
        finding(
          UmManifestValidationCode.DEPENDENCY_DUPLICATE,
          "error",
          `Duplicate dependency declaration for "${key}".`,
          base,
          "Standards §7",
        ),
      );
    } else {
      seen.add(key);
    }

    // Single-manifest cycle: required self-platform dependency.
    if (
      req?.targetKind === "platform" &&
      req.targetId === platformId &&
      req.strength === "required"
    ) {
      out.push(
        finding(
          UmManifestValidationCode.DEPENDENCY_SELF_PLATFORM_CYCLE,
          "error",
          `Platform "${platformId}" must not declare a required dependency on itself (illegal cycle).`,
          `${base}.targetId`,
          "Standards §7.3 / Spec §8.2",
        ),
      );
    }

    // Capability deps that claim in-manifest ids must exist; external caps are allowed
    // only when not scoped under this platform id.
    if (
      req?.targetKind === "capability" &&
      isNonEmptyTrimmed(req.targetId) &&
      isNonEmptyTrimmed(platformId) &&
      isScopedUnderPlatform(req.targetId, platformId) &&
      !capabilityIds.has(req.targetId)
    ) {
      out.push(
        finding(
          UmManifestValidationCode.DEPENDENCY_CAPABILITY_UNKNOWN,
          "error",
          `Dependency references unknown in-platform capability "${req.targetId}".`,
          `${base}.targetId`,
          "Standards §7.1 consistency",
        ),
      );
    }
  });
}

function validateSideEffectSummary(
  summary: readonly UmSideEffectClass[] | undefined,
  capabilities: readonly UmManifestCapability[] | undefined,
  out: UmValidationFinding[],
): void {
  const declared = new Set<string>();
  (summary ?? []).forEach((effect, index) => {
    if (!SIDE_EFFECTS.has(effect)) {
      out.push(
        finding(
          UmManifestValidationCode.SIDE_EFFECT_SUMMARY_INVALID,
          "error",
          `Unknown side-effect class "${String(effect)}" in sideEffectSummary.`,
          `sideEffectSummary[${index}]`,
          "Spec §6.3",
        ),
      );
    } else {
      declared.add(effect);
    }
  });

  const expected = new Set<string>();
  (capabilities ?? []).forEach((cap) => {
    (cap.sideEffectClasses ?? []).forEach((e) => {
      if (SIDE_EFFECTS.has(e)) expected.add(e);
    });
  });

  for (const effect of expected) {
    if (!declared.has(effect)) {
      out.push(
        finding(
          UmManifestValidationCode.SIDE_EFFECT_SUMMARY_INCOMPLETE,
          "error",
          `sideEffectSummary is missing capability side-effect "${effect}".`,
          "sideEffectSummary",
          "Standards §3.4 consistency",
        ),
      );
    }
  }
  for (const effect of declared) {
    if (!expected.has(effect)) {
      out.push(
        finding(
          UmManifestValidationCode.SIDE_EFFECT_SUMMARY_EXTRA,
          "warning",
          `sideEffectSummary lists "${effect}" unused by any capability.`,
          "sideEffectSummary",
          "Standards §3.4 consistency",
        ),
      );
    }
  }
}

function validateNav(
  nav: readonly UmManifestNavContribution[] | undefined,
  capabilityIds: Set<string>,
  out: UmValidationFinding[],
): void {
  if (!nav) return;
  const seen = new Map<string, number>();
  nav.forEach((item, index) => {
    const base = `navContributions[${index}]`;
    if (!isNonEmptyTrimmed(item?.contributionId)) {
      out.push(
        finding(
          UmManifestValidationCode.NAV_CONTRIBUTION_ID_REQUIRED,
          "error",
          "Navigation contributionId is required.",
          `${base}.contributionId`,
          "Spec Ch.12",
        ),
      );
    } else if (seen.has(item.contributionId)) {
      out.push(
        finding(
          UmManifestValidationCode.NAV_CONTRIBUTION_ID_DUPLICATE,
          "error",
          `Duplicate navigation contributionId "${item.contributionId}".`,
          `${base}.contributionId`,
          "Standards §2.3",
        ),
      );
    } else {
      seen.set(item.contributionId, index);
    }
    if (!NAV_CLASSES.has(item?.navClass as string)) {
      out.push(
        finding(
          UmManifestValidationCode.NAV_CLASS_INVALID,
          "error",
          `Navigation navClass "${String(item?.navClass)}" is invalid.`,
          `${base}.navClass`,
          "Spec Ch.12",
        ),
      );
    }
    if (
      isNonEmptyTrimmed(item?.capabilityId) &&
      !capabilityIds.has(item.capabilityId)
    ) {
      out.push(
        finding(
          UmManifestValidationCode.NAV_CAPABILITY_UNKNOWN,
          "error",
          `Navigation references unknown capability id "${item.capabilityId}".`,
          `${base}.capabilityId`,
          "Standards §3.4 consistency",
        ),
      );
    }
  });
}

/**
 * Validate a platform manifest. Deterministic finding order:
 * severity (error < warning < info), then code, then path.
 */
export function validatePlatformManifest(
  manifest: UmPlatformManifest,
): UmValidationResult {
  const findings: UmValidationFinding[] = [];

  if (!isNonEmptyTrimmed(manifest?.platformId)) {
    findings.push(
      finding(
        UmManifestValidationCode.PLATFORM_ID_REQUIRED,
        "error",
        "Platform id is required.",
        "platformId",
        "Standards §2 / §3.4",
      ),
    );
  } else if (!isUmMachineId(manifest.platformId)) {
    findings.push(
      finding(
        UmManifestValidationCode.PLATFORM_ID_NAMING,
        "error",
        `Platform id "${manifest.platformId}" violates machine-id naming rules.`,
        "platformId",
        "Standards §2.3",
      ),
    );
  }

  if (!isNonEmptyTrimmed(manifest?.platformVersion)) {
    findings.push(
      finding(
        UmManifestValidationCode.PLATFORM_VERSION_REQUIRED,
        "error",
        "Platform version is required.",
        "platformVersion",
        "Standards §3.4 / §6",
      ),
    );
  } else if (!isUmVersionToken(manifest.platformVersion)) {
    findings.push(
      finding(
        UmManifestValidationCode.PLATFORM_VERSION_FORMAT,
        "error",
        `Platform version "${manifest.platformVersion}" is not a valid version token.`,
        "platformVersion",
        "Standards §6",
      ),
    );
  }

  if (!isNonEmptyTrimmed(manifest?.displayName)) {
    findings.push(
      finding(
        UmManifestValidationCode.PLATFORM_DISPLAY_NAME_REQUIRED,
        "error",
        "Platform displayName is required.",
        "displayName",
        "Standards §3.4",
      ),
    );
  }

  validateOwners(manifest?.owners, findings);

  if (!isNonEmptyTrimmed(manifest?.soTStatement)) {
    findings.push(
      finding(
        UmManifestValidationCode.SOT_STATEMENT_REQUIRED,
        "error",
        "soTStatement (source-of-truth declaration) is required.",
        "soTStatement",
        "Standards §1.4 / §9",
      ),
    );
  }
  if (!isNonEmptyTrimmed(manifest?.nonOwnershipStatement)) {
    findings.push(
      finding(
        UmManifestValidationCode.NON_OWNERSHIP_STATEMENT_REQUIRED,
        "error",
        "nonOwnershipStatement is required.",
        "nonOwnershipStatement",
        "Standards §1.4 / §9",
      ),
    );
  }

  if (!manifest?.documentationRefs || manifest.documentationRefs.length === 0) {
    findings.push(
      finding(
        UmManifestValidationCode.DOCUMENTATION_REFS_REQUIRED,
        "error",
        "documentationRefs must include at least one reference.",
        "documentationRefs",
        "Standards §3.4 / §11",
      ),
    );
  }

  if (!isMaturityLevel(manifest?.maturityLevel)) {
    findings.push(
      finding(
        UmManifestValidationCode.MATURITY_LEVEL_INVALID,
        "error",
        `maturityLevel must be an integer 0–4 (received ${String(manifest?.maturityLevel)}).`,
        "maturityLevel",
        "Standards §24",
      ),
    );
  }

  if (!manifest?.health) {
    findings.push(
      finding(
        UmManifestValidationCode.HEALTH_REQUIRED,
        "error",
        "health declaration is required.",
        "health",
        "Standards §3.4 / §18",
      ),
    );
  } else if (typeof manifest.health.reportsStatus !== "boolean") {
    findings.push(
      finding(
        UmManifestValidationCode.HEALTH_REPORTS_STATUS_REQUIRED,
        "error",
        "health.reportsStatus must be a boolean.",
        "health.reportsStatus",
        "Standards §18.4",
      ),
    );
  }

  // First pass: collect capability ids for flag linking; modules need caps later.
  const preliminaryCaps = new Map<string, UmManifestCapability>();
  (manifest?.capabilities ?? []).forEach((cap) => {
    if (isNonEmptyTrimmed(cap?.capabilityId) && !preliminaryCaps.has(cap.capabilityId)) {
      preliminaryCaps.set(cap.capabilityId, cap);
    }
  });
  const capabilityIdSet = new Set(preliminaryCaps.keys());

  const flagIds = validateFlags(manifest?.flags, capabilityIdSet, findings);

  // Modules need capability map with module ownership — build after we have modules set.
  // Order: modules collect ids → capabilities validate against modules → re-check module refs.
  const moduleIds = new Set<string>();
  (manifest?.modules ?? []).forEach((mod) => {
    if (isNonEmptyTrimmed(mod?.moduleId)) moduleIds.add(mod.moduleId);
  });

  const capabilityById = validateCapabilities(
    manifest?.capabilities,
    manifest?.platformId ?? "",
    moduleIds,
    flagIds,
    findings,
  );

  // Module identity + consistency against final capability map.
  validateModules(manifest?.modules, capabilityById, findings);

  validateEvents(manifest?.providesEvents, findings);
  validateDependencies(
    manifest?.platformId ?? "",
    manifest?.requires,
    new Set(capabilityById.keys()),
    findings,
  );
  validateSideEffectSummary(
    manifest?.sideEffectSummary,
    manifest?.capabilities,
    findings,
  );
  validateNav(
    manifest?.navContributions,
    new Set(capabilityById.keys()),
    findings,
  );

  const sorted = [...findings].sort(compareFindings);
  return {
    ok: sorted.every((f) => f.severity !== "error"),
    findings: sorted,
  };
}

/**
 * Factory implementing {@link UmManifestValidator}.
 */
export function createManifestValidator(): UmManifestValidator {
  return {
    validate(manifest: UmPlatformManifest): UmValidationResult {
      return validatePlatformManifest(manifest);
    },
  };
}
