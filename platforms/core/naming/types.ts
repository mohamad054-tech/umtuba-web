/**
 * Naming artifact catalog contracts (Standards §2).
 *
 * P1: interfaces only.
 * P11: pure deterministic derived read-only index over existing Core registries.
 *
 * NAMING INDEXING IS NOT NAME AUTHORING.
 * Specialized registries remain identity SoT; validation/naming.ts remains policy SoT.
 */

import type {
  UmArtifactStability,
  UmNamedArtifactKind,
  UmPlatformId,
} from "../identity/types";
import type { UmCapabilityRegistry } from "../capability/types";
import type { UmEventTypeRegistry } from "../event/types";
import type { UmFlagRegistry } from "../flag/types";
import type { UmPlatformRegistry } from "../registry/interfaces";

/**
 * Cross-kind named artifact row (Standards §2.4).
 * Stability is optional: several source catalogs do not provide it.
 */
export interface UmNamedArtifact {
  readonly id: string;
  readonly kind: UmNamedArtifactKind;
  readonly ownerPlatformId: UmPlatformId;
  /** Present only when the source catalog provides stability. */
  readonly stability?: UmArtifactStability;
  /** Present only when the source catalog provides a display name. */
  readonly displayName?: string;
}

/**
 * Naming registry — derived cross-kind lookup/index (Standards §2).
 * Read-only: does not author or reserve names.
 */
export interface UmNamingRegistry {
  get(kind: UmNamedArtifactKind, id: string): UmNamedArtifact | undefined;
  listByKind(kind: UmNamedArtifactKind): readonly UmNamedArtifact[];
  list(): readonly UmNamedArtifact[];
  listByPlatform(platformId: UmPlatformId): readonly UmNamedArtifact[];
  has(kind: UmNamedArtifactKind, id: string): boolean;
  size(): number;
}

/**
 * P11 in-memory naming index.
 * Construction indexes current deps; `rebuild()` refreshes from the same deps.
 */
export interface UmInMemoryNamingRegistry extends UmNamingRegistry {
  /** Re-index from current dependency registry state (deterministic snapshot refresh). */
  rebuild(): void;
}

export interface UmNamingRegistryDeps {
  readonly platforms: UmPlatformRegistry;
  /** Preferred capability SoT when provided. */
  readonly capabilities?: UmCapabilityRegistry;
  readonly eventTypes?: UmEventTypeRegistry;
  readonly flags?: UmFlagRegistry;
}
