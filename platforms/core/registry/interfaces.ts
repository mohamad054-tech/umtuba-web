/**
 * Core registries — control-plane interfaces only (Spec §4.1, Architecture P1).
 *
 * No storage, no memory maps, no runtime registration logic in P1.
 */

import type { UmCapabilityRegistry } from "../capability/types";
import type { UmDependencyRegistry } from "../dependency/types";
import type { UmEventTypeRegistry } from "../event/types";
import type { UmFlagRegistry } from "../flag/types";
import type { UmHealthRegistry } from "../health/types";
import type { UmPlatformManifest } from "../manifest/types";
import type { UmNamingRegistry } from "../naming/types";
import type { UmPlatformId } from "../identity/types";
import type { UmMaturityLevel } from "../maturity/types";
import type { UmComplianceStatus } from "../compliance/types";

/**
 * Platform catalog record.
 */
export interface UmPlatformRecord {
  readonly platformId: UmPlatformId;
  readonly displayName: string;
  readonly platformVersion: string;
  readonly maturityLevel: UmMaturityLevel;
  readonly complianceStatus: UmComplianceStatus;
  readonly manifest: UmPlatformManifest;
  readonly registeredAt?: string;
}

/**
 * Platform registry — interface only (Standards §15).
 */
export interface UmPlatformRegistry {
  get(platformId: UmPlatformId): UmPlatformRecord | undefined;
  list(): readonly UmPlatformRecord[];
}

/**
 * Aggregate Core registry facade — interface only.
 * Implementations MUST NOT import product platforms (Spec §5.3).
 */
export interface UmCoreRegistry {
  readonly platforms: UmPlatformRegistry;
  readonly capabilities: UmCapabilityRegistry;
  readonly events: UmEventTypeRegistry;
  readonly flags: UmFlagRegistry;
  readonly health: UmHealthRegistry;
  readonly dependencies: UmDependencyRegistry;
  readonly naming: UmNamingRegistry;
}
