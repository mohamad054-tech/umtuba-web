/**
 * In-memory UM Core SDK / client factory foundation.
 *
 * Thin consumer composition over already-created runtime ports (P14–P17 + P4 register).
 * SDK FACTORY IS NOT REGISTRY CONSTRUCTION.
 * SDK FACTORY IS NOT DIAGNOSTICS JOIN.
 * SDK FACTORY IS NOT FLEET AGGREGATION.
 * SDK FACTORY IS NOT REFERENTIAL INTEGRITY.
 * SDK FACTORY IS NOT A PRODUCT INTEGRATION LAYER.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§16)
 */

import type { UmPlatformManifest } from "../manifest/types";
import { isNonEmptyTrimmed, isUmMachineId } from "../validation/naming";
import type {
  UmCoreSdkClient,
  UmCoreSdkFactory,
  UmCoreSdkFactoryDeps,
  UmServiceIdentityContext,
} from "./interfaces";

function requirePort<T extends object>(
  value: T | null | undefined,
  name: string,
): T {
  if (value == null || typeof value !== "object") {
    throw new Error(
      `UmCoreSdkFactoryDeps.${name} is required and must be an object.`,
    );
  }
  return value;
}

function freezeIdentity(
  identity: UmServiceIdentityContext,
): UmServiceIdentityContext {
  if (!isNonEmptyTrimmed(identity.serviceId)) {
    throw new Error(
      'UmServiceIdentityContext.serviceId is required and must be a non-empty string.',
    );
  }
  if (!isNonEmptyTrimmed(identity.platformId)) {
    throw new Error(
      'UmServiceIdentityContext.platformId is required and must be a non-empty string.',
    );
  }
  if (!isUmMachineId(identity.platformId)) {
    throw new Error(
      'UmServiceIdentityContext.platformId must be a valid UM machine id.',
    );
  }

  return Object.freeze({
    serviceId: identity.serviceId,
    platformId: identity.platformId,
    ...(identity.runtimeId !== undefined
      ? { runtimeId: identity.runtimeId }
      : {}),
  });
}

/**
 * Create a pure in-memory SDK factory that borrows caller-owned Core ports.
 * Does not construct catalogs, join diagnostics, aggregate fleet health, or network.
 */
export function createInMemoryUmCoreSdkFactory(
  deps: UmCoreSdkFactoryDeps,
): UmCoreSdkFactory {
  const flags = requirePort(deps.flags, "flags");
  const capabilities = requirePort(deps.capabilities, "capabilities");
  const events = requirePort(deps.events, "events");
  const health = requirePort(deps.health, "health");
  const platforms = requirePort(deps.platforms, "platforms");

  if (typeof events.publish !== "function") {
    throw new Error(
      'UmCoreSdkFactoryDeps.events.publish is required and must be a function.',
    );
  }
  if (typeof platforms.register !== "function") {
    throw new Error(
      'UmCoreSdkFactoryDeps.platforms.register is required and must be a function.',
    );
  }

  return Object.freeze({
    createClient(identity: UmServiceIdentityContext): UmCoreSdkClient {
      const frozenIdentity = freezeIdentity(identity);

      return Object.freeze({
        identity: frozenIdentity,
        flags,
        capabilities,
        events,
        health,
        register(manifest: UmPlatformManifest) {
          return platforms.register({ manifest });
        },
      });
    },
  });
}
