/**
 * Pure cross-catalog referential-integrity review (UM Core contract V1).
 *
 * Reads existing registered Core catalogs / optional observation store and
 * emits deterministic missing-reference findings. Does not mutate any store,
 * does not network, and does not change admission paths (P4–P10 / P17).
 *
 * REFERENTIAL INTEGRITY REVIEW IS NOT DEPENDENCY RESOLUTION.
 * REFERENTIAL INTEGRITY REVIEW IS NOT HEALTH DIAGNOSTICS JOIN.
 */

import type { UmCapabilityRegistry } from "../capability/types";
import type { UmDependencyRegistry } from "../dependency/types";
import type {
  UmEventRoutingRegistry,
  UmEventTypeRegistry,
} from "../event/types";
import type { UmFlagRegistry } from "../flag/types";
import type {
  UmHealthRegistry,
  UmHealthSnapshot,
} from "../health/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import type { UmValidationFinding, UmValidationResult } from "./interfaces";
import { UmReferentialIntegrityCode } from "./referentialIntegrityCodes";

/**
 * Optional observation list surface (P17 `list()` or compatible read model).
 * Intentionally narrower than UmHealthReporter so diagnostics join stays separate.
 */
export interface UmHealthObservationList {
  list(): readonly UmHealthSnapshot[];
}

export interface UmReferentialIntegrityDeps {
  readonly platforms: UmPlatformRegistry;
  readonly capabilities?: UmCapabilityRegistry;
  readonly eventTypes?: UmEventTypeRegistry;
  readonly eventRoutes?: UmEventRoutingRegistry;
  readonly flags?: UmFlagRegistry;
  readonly dependencies?: UmDependencyRegistry;
  readonly healthDeclarations?: UmHealthRegistry;
  /** Optional — only reviewed when provided (P17 available on verified alpha). */
  readonly healthObservations?: UmHealthObservationList;
}

function finding(
  code: string,
  message: string,
  path?: string,
): UmValidationFinding {
  return {
    code,
    severity: "error",
    message,
    ...(path !== undefined ? { path } : {}),
    standardRef: "UM_CORE_PLATFORM_REFERENTIAL_INTEGRITY_CONTRACT_V1",
  };
}

function compareFindings(
  a: UmValidationFinding,
  b: UmValidationFinding,
): number {
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  const path = (a.path ?? "").localeCompare(b.path ?? "");
  if (path !== 0) return path;
  return a.message.localeCompare(b.message);
}

function reviewCapabilities(
  deps: UmReferentialIntegrityDeps,
  findings: UmValidationFinding[],
): void {
  const { platforms, capabilities, flags } = deps;
  if (!capabilities) return;

  for (const record of capabilities.list()) {
    if (!platforms.get(record.platformId)) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.CAPABILITY_UNKNOWN_PLATFORM,
          `Capability "${record.capabilityId}" references unknown platform "${record.platformId}".`,
          `capabilities[${record.capabilityId}].platformId`,
        ),
      );
    }

    if (
      flags &&
      record.flagId !== undefined &&
      !flags.get(record.flagId)
    ) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.CAPABILITY_UNKNOWN_FLAG,
          `Capability "${record.capabilityId}" references unknown flag "${record.flagId}".`,
          `capabilities[${record.capabilityId}].flagId`,
        ),
      );
    }
  }
}

function reviewEventTypes(
  deps: UmReferentialIntegrityDeps,
  findings: UmValidationFinding[],
): void {
  const { platforms, eventTypes } = deps;
  if (!eventTypes) return;

  for (const record of eventTypes.list()) {
    if (!platforms.get(record.producerPlatformId)) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.EVENT_TYPE_UNKNOWN_PRODUCER,
          `Event type "${record.eventType}" references unknown producer platform "${record.producerPlatformId}".`,
          `eventTypes[${record.eventType}].producerPlatformId`,
        ),
      );
    }
  }
}

function reviewRoutes(
  deps: UmReferentialIntegrityDeps,
  findings: UmValidationFinding[],
): void {
  const { platforms, eventTypes, eventRoutes } = deps;
  if (!eventRoutes) return;

  for (const record of eventRoutes.list()) {
    if (eventTypes && !eventTypes.get(record.eventType)) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.ROUTE_UNKNOWN_EVENT_TYPE,
          `Route "${record.routeId}" references unknown event type "${record.eventType}".`,
          `eventRoutes[${record.routeId}].eventType`,
        ),
      );
    }

    if (!platforms.get(record.destinationPlatformId)) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.ROUTE_UNKNOWN_DESTINATION,
          `Route "${record.routeId}" references unknown destination platform "${record.destinationPlatformId}".`,
          `eventRoutes[${record.routeId}].destinationPlatformId`,
        ),
      );
    }

    if (!platforms.get(record.producerPlatformId)) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.ROUTE_UNKNOWN_PRODUCER,
          `Route "${record.routeId}" references unknown producer platform "${record.producerPlatformId}".`,
          `eventRoutes[${record.routeId}].producerPlatformId`,
        ),
      );
    }
  }
}

function reviewFlags(
  deps: UmReferentialIntegrityDeps,
  findings: UmValidationFinding[],
): void {
  const { platforms, capabilities, flags } = deps;
  if (!flags) return;

  for (const record of flags.list()) {
    if (!platforms.get(record.ownerPlatformId)) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.FLAG_UNKNOWN_PLATFORM,
          `Flag "${record.flagId}" references unknown owner platform "${record.ownerPlatformId}".`,
          `flags[${record.flagId}].ownerPlatformId`,
        ),
      );
    }

    if (!capabilities) continue;
    for (const capabilityId of record.linkedCapabilityIds) {
      if (!capabilities.get(capabilityId)) {
        findings.push(
          finding(
            UmReferentialIntegrityCode.FLAG_UNKNOWN_LINKED_CAPABILITY,
            `Flag "${record.flagId}" references unknown linked capability "${capabilityId}".`,
            `flags[${record.flagId}].linkedCapabilityIds`,
          ),
        );
      }
    }
  }
}

function reviewDependencies(
  deps: UmReferentialIntegrityDeps,
  findings: UmValidationFinding[],
): void {
  const { platforms, capabilities, dependencies } = deps;
  if (!dependencies) return;

  for (const record of dependencies.list()) {
    if (!platforms.get(record.fromPlatformId)) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.DEPENDENCY_UNKNOWN_OWNER,
          `Dependency edge "${record.edgeId}" references unknown owner platform "${record.fromPlatformId}".`,
          `dependencies[${record.edgeId}].fromPlatformId`,
        ),
      );
    }

    if (record.targetKind === "platform" && !platforms.get(record.targetId)) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.DEPENDENCY_UNKNOWN_PLATFORM_TARGET,
          `Dependency edge "${record.edgeId}" references unknown platform target "${record.targetId}".`,
          `dependencies[${record.edgeId}].targetId`,
        ),
      );
    }

    if (
      record.targetKind === "capability" &&
      capabilities &&
      !capabilities.get(record.targetId)
    ) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.DEPENDENCY_UNKNOWN_CAPABILITY_TARGET,
          `Dependency edge "${record.edgeId}" references unknown capability target "${record.targetId}".`,
          `dependencies[${record.edgeId}].targetId`,
        ),
      );
    }

    // peer_kernel targets remain opaque by P9 law — never invent a SoT.
  }
}

function reviewHealthDeclarations(
  deps: UmReferentialIntegrityDeps,
  findings: UmValidationFinding[],
): void {
  const { platforms, healthDeclarations } = deps;
  if (!healthDeclarations) return;

  for (const record of healthDeclarations.list()) {
    if (!platforms.get(record.platformId)) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.HEALTH_DECLARATION_UNKNOWN_PLATFORM,
          `Health declaration for "${record.platformId}" references an unknown platform.`,
          `healthDeclarations[${record.platformId}].platformId`,
        ),
      );
    }
  }
}

function declaredDependencyTargets(
  dependencies: UmDependencyRegistry,
  platformId: string,
): Set<string> {
  const targets = new Set<string>();
  for (const record of dependencies.list()) {
    if (record.fromPlatformId === platformId) {
      targets.add(record.targetId);
    }
  }
  return targets;
}

function reviewHealthObservations(
  deps: UmReferentialIntegrityDeps,
  findings: UmValidationFinding[],
): void {
  const { platforms, capabilities, dependencies, healthObservations } = deps;
  if (!healthObservations) return;

  for (const snapshot of healthObservations.list()) {
    if (!platforms.get(snapshot.platformId)) {
      findings.push(
        finding(
          UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_PLATFORM,
          `Health observation for "${snapshot.platformId}" references an unknown platform.`,
          `healthObservations[${snapshot.platformId}].platformId`,
        ),
      );
    }

    if (capabilities) {
      for (const capabilityId of snapshot.affectedCapabilityIds) {
        if (!capabilities.get(capabilityId)) {
          findings.push(
            finding(
              UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_CAPABILITY,
              `Health observation for "${snapshot.platformId}" references unknown capability "${capabilityId}".`,
              `healthObservations[${snapshot.platformId}].affectedCapabilityIds`,
            ),
          );
        }
      }
    }

    if (dependencies) {
      const declared = declaredDependencyTargets(
        dependencies,
        snapshot.platformId,
      );
      for (const dep of snapshot.dependencyStatuses) {
        const known =
          declared.has(dep.targetId) ||
          Boolean(platforms.get(dep.targetId)) ||
          Boolean(capabilities?.get(dep.targetId));
        if (!known) {
          findings.push(
            finding(
              UmReferentialIntegrityCode.HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET,
              `Health observation for "${snapshot.platformId}" references unknown dependency target "${dep.targetId}".`,
              `healthObservations[${snapshot.platformId}].dependencyStatuses`,
            ),
          );
        }
      }
    }
  }
}

/**
 * Review supplied Core catalogs / optional observations for missing references.
 * Pure and deterministic: sorted findings, no mutation, no I/O.
 */
export function validateReferentialIntegrity(
  deps: UmReferentialIntegrityDeps,
): UmValidationResult {
  const findings: UmValidationFinding[] = [];

  reviewCapabilities(deps, findings);
  reviewEventTypes(deps, findings);
  reviewRoutes(deps, findings);
  reviewFlags(deps, findings);
  reviewDependencies(deps, findings);
  reviewHealthDeclarations(deps, findings);
  reviewHealthObservations(deps, findings);

  const sorted = [...findings].sort(compareFindings);
  return {
    ok: sorted.length === 0,
    findings: sorted,
  };
}
