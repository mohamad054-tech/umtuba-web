/**
 * Aggregate Core registry facade (UM Core P12).
 *
 * Model A: pure deterministic composition of already-created specialized registries.
 * AGGREGATE REGISTRY COMPOSITION IS NOT RUNTIME ORCHESTRATION.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1
 */

import type { UmCoreRegistry, UmCoreRegistryDeps } from "./interfaces";

/**
 * Create a read-oriented aggregate facade over caller-owned registries.
 *
 * - Assigns supplied object references directly (exact identity preserved).
 * - Does not construct, register into, or mutate any specialized registry.
 * - Does not auto-rebuild naming; caller owns `naming.rebuild()` when needed.
 * - Freezes the facade object only (not the specialized registries).
 */
export function createUmCoreRegistry(deps: UmCoreRegistryDeps): UmCoreRegistry {
  return Object.freeze({
    platforms: deps.platforms,
    capabilities: deps.capabilities,
    events: deps.events,
    flags: deps.flags,
    health: deps.health,
    dependencies: deps.dependencies,
    naming: deps.naming,
  });
}
