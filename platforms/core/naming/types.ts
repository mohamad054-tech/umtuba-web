/**
 * Naming artifact catalog contracts (Standards §2).
 */

import type {
  UmArtifactStability,
  UmNamedArtifactKind,
  UmPlatformId,
} from "../identity/types";

export interface UmNamedArtifact {
  readonly id: string;
  readonly kind: UmNamedArtifactKind;
  readonly ownerPlatformId: UmPlatformId;
  readonly stability: UmArtifactStability;
  readonly displayName?: string;
}

/**
 * Naming registry — interface only.
 */
export interface UmNamingRegistry {
  get(kind: UmNamedArtifactKind, id: string): UmNamedArtifact | undefined;
  listByKind(kind: UmNamedArtifactKind): readonly UmNamedArtifact[];
}
