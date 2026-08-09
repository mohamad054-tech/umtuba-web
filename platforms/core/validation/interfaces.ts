/**
 * Validation interfaces and P2/P13 engines.
 *
 * P1: contracts only.
 * P2: manifest + admission validators (pure; no registry/runtime).
 * P13: composed UmCoreValidator + registry-backed dependency review.
 */

import type { UmDependencyValidationResult } from "../dependency/types";
import type { UmPlatformManifest } from "../manifest/types";
import type { UmPlatformId } from "../identity/types";

export type UmValidationSeverity = "info" | "warning" | "error";

export interface UmValidationFinding {
  readonly code: string;
  readonly severity: UmValidationSeverity;
  readonly message: string;
  readonly path?: string;
  readonly standardRef?: string;
}

export interface UmValidationResult {
  readonly ok: boolean;
  readonly findings: readonly UmValidationFinding[];
}

/**
 * Manifest validator port.
 */
export interface UmManifestValidator {
  validate(manifest: UmPlatformManifest): UmValidationResult;
}

/**
 * Registration admission validator port.
 */
export interface UmRegistrationValidator {
  validateAdmission(manifest: UmPlatformManifest): UmValidationResult;
}

/**
 * Composite Core validator surface.
 * P2: manifests + registration.
 * P13: registry-backed validateDependencies(platformId) completeness/drift review.
 */
export interface UmCoreValidator {
  readonly manifests: UmManifestValidator;
  readonly registration: UmRegistrationValidator;
  /**
   * Post-admission platform-scoped dependency review.
   * Returns UmDependencyValidationResult (completeness / drift only).
   */
  validateDependencies(platformId: UmPlatformId): UmDependencyValidationResult;
}

export {
  UmManifestValidationCode,
  type UmManifestValidationCodeName,
} from "./codes";
export {
  UmDependencyValidationCode,
  type UmDependencyValidationCodeName,
} from "./dependencyValidationCodes";
export {
  isNonEmptyTrimmed,
  isScopedUnderPlatform,
  isUmMachineId,
  isUmVersionToken,
} from "./naming";
export {
  createManifestValidator,
  validatePlatformManifest,
} from "./manifestValidator";
export {
  createRegistrationValidator,
  validateManifestAdmission,
} from "./registrationValidator";
export {
  validatePlatformDependencies,
  type UmPlatformDependencyValidationDeps,
} from "./dependencyValidation";
export {
  createUmCoreValidator,
  type UmCoreValidatorDeps,
} from "./coreValidator";
export {
  UmReferentialIntegrityCode,
  type UmReferentialIntegrityCodeName,
} from "./referentialIntegrityCodes";
export {
  validateReferentialIntegrity,
  type UmHealthObservationList,
  type UmReferentialIntegrityDeps,
} from "./referentialIntegrity";
