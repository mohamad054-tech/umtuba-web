/**
 * Validation interfaces and P2 engines.
 *
 * P1: contracts only.
 * P2: manifest + admission validators (pure; no registry/runtime).
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
 * P2 implements manifests + registration only.
 * `validateDependencies(platformId)` remains unimplemented (needs registry).
 */
export interface UmCoreValidator {
  readonly manifests: UmManifestValidator;
  readonly registration: UmRegistrationValidator;
  validateDependencies(
    platformId: UmPlatformId,
  ): UmDependencyValidationResult | UmValidationResult;
}

export {
  UmManifestValidationCode,
  type UmManifestValidationCodeName,
} from "./codes";
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
