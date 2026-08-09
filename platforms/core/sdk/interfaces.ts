/**
 * Core SDK contracts (Standards §16 / Spec SDK surface).
 *
 * P1: interfaces only.
 * SDK factory foundation: thin in-process client composition over P14–P17 + P4.
 * Language-agnostic intent expressed as TypeScript interfaces in this repo.
 */

import type { UmCapabilityAsserter } from "../capability/types";
import type { UmFlagEvaluator, UmFlagEvaluationRequest, UmFlagEvaluationResult } from "../flag/types";
import type { UmEventPublisher, UmPlatformEventEnvelope } from "../event/types";
import type { UmHealthReporter, UmHealthSnapshot } from "../health/types";
import type { UmPlatformManifest } from "../manifest/types";
import type { UmCapabilityId } from "../identity/types";
import type {
  UmPlatformRegistrationResult,
  UmInMemoryPlatformRegistry,
} from "../registry/interfaces";

/**
 * Service identity presented by a runtime to Core (opaque).
 */
export interface UmServiceIdentityContext {
  readonly serviceId: string;
  readonly platformId: string;
  readonly runtimeId?: string;
}

/**
 * Explicit DI bag for the in-memory SDK factory.
 * Caller owns port construction; factory borrows exact object references.
 */
export interface UmCoreSdkFactoryDeps {
  readonly flags: UmFlagEvaluator;
  readonly capabilities: UmCapabilityAsserter;
  readonly events: Pick<UmEventPublisher, "publish">;
  readonly health: UmHealthReporter;
  /** P4 register surface — required so client.register is fully implementable. */
  readonly platforms: Pick<UmInMemoryPlatformRegistry, "register">;
}

/**
 * Core SDK client — thin facade over borrowed runtime ports.
 */
export interface UmCoreSdkClient {
  readonly identity: UmServiceIdentityContext;

  /** Pass-through P4 registration (result-returning; does not invent modules). */
  register(manifest: UmPlatformManifest): UmPlatformRegistrationResult;

  readonly flags: UmFlagEvaluator;
  readonly events: Pick<UmEventPublisher, "publish">;
  readonly health: UmHealthReporter;
  readonly capabilities: UmCapabilityAsserter;
}

/**
 * Factory port for SDK clients.
 */
export interface UmCoreSdkFactory {
  createClient(identity: UmServiceIdentityContext): UmCoreSdkClient;
}

/**
 * Convenience operation shapes (documentation aids — still interfaces/types).
 */
export type UmSdkFlagEvaluate = (
  request: UmFlagEvaluationRequest,
) => UmFlagEvaluationResult;

export type UmSdkPublishEvent = <TPayload>(
  event: UmPlatformEventEnvelope<TPayload>,
) => ReturnType<UmEventPublisher["publish"]>;

export type UmSdkReportHealth = (
  snapshot: UmHealthSnapshot,
) => ReturnType<UmHealthReporter["report"]>;

export type UmSdkAssertCapability = (
  capabilityId: UmCapabilityId,
) => ReturnType<UmCapabilityAsserter["assertEnabled"]>;
