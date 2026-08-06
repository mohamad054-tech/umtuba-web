/**
 * Validation interfaces (Standards §3.8, §7.8, §15.8).
 * No validators implemented in P1.
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
 * Manifest validator — interface only.
 */
export interface UmManifestValidator {
  validate(manifest: UmPlatformManifest): UmValidationResult;
}

/**
 * Registration admission validator — interface only.
 */
export interface UmRegistrationValidator {
  validateAdmission(manifest: UmPlatformManifest): UmValidationResult;
}

/**
 * Composite Core validator surface — interface only.
 */
export interface UmCoreValidator {
  readonly manifests: UmManifestValidator;
  readonly registration: UmRegistrationValidator;
  validateDependencies(
    platformId: UmPlatformId,
  ): UmDependencyValidationResult | UmValidationResult;
}
