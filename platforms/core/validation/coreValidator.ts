/**
 * Core Validator Composition Foundation (UM Core P13).
 *
 * Model C: compose existing P2 validators with registry-backed
 * dependency completeness/drift review.
 *
 * VALIDATOR COMPOSITION IS NOT DEPENDENCY RESOLUTION.
 * VALIDATOR COMPOSITION IS NOT A SECOND DEPENDENCY REGISTRY.
 */

import type { UmCapabilityRegistry } from "../capability/types";
import type { UmDependencyRegistry } from "../dependency/types";
import type { UmPlatformId } from "../identity/types";
import type { UmPlatformRegistry } from "../registry/interfaces";
import {
  validatePlatformDependencies,
  type UmPlatformDependencyValidationDeps,
} from "./dependencyValidation";
import type {
  UmCoreValidator,
  UmManifestValidator,
  UmRegistrationValidator,
} from "./interfaces";
import { createManifestValidator } from "./manifestValidator";
import { createRegistrationValidator } from "./registrationValidator";

/**
 * Minimal DI for Model C composition.
 * Do not require UmCoreRegistry (not a service locator).
 */
export interface UmCoreValidatorDeps {
  readonly platforms: UmPlatformRegistry;
  readonly dependencies: UmDependencyRegistry;
  readonly capabilities?: UmCapabilityRegistry;
  readonly manifests?: UmManifestValidator;
  readonly registration?: UmRegistrationValidator;
}

/**
 * Create a composed UmCoreValidator over existing P2 validators and P13 review.
 * Does not mutate injected registries or validators.
 */
export function createUmCoreValidator(
  deps: UmCoreValidatorDeps,
): UmCoreValidator {
  const manifests = deps.manifests ?? createManifestValidator();
  const registration = deps.registration ?? createRegistrationValidator();
  const reviewDeps: UmPlatformDependencyValidationDeps = {
    platforms: deps.platforms,
    dependencies: deps.dependencies,
    ...(deps.capabilities !== undefined
      ? { capabilities: deps.capabilities }
      : {}),
  };

  return {
    manifests,
    registration,
    validateDependencies(platformId: UmPlatformId) {
      return validatePlatformDependencies(platformId, reviewDeps);
    },
  };
}
