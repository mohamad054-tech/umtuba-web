/**
 * Core SDK contracts (Standards §16 / Spec SDK surface).
 *
 * Semantic operations only — no client implementation in P1.
 * Language-agnostic intent expressed as TypeScript interfaces in this repo.
 */

import type { UmCapabilityAsserter } from "../capability/types";
import type { UmFlagEvaluator, UmFlagEvaluationRequest, UmFlagEvaluationResult } from "../flag/types";
import type { UmEventPublisher, UmPlatformEventEnvelope } from "../event/types";
import type { UmHealthReporter, UmHealthSnapshot } from "../health/types";
import type { UmPlatformManifest } from "../manifest/types";
import type { UmCapabilityId } from "../identity/types";

/**
 * Service identity presented by a runtime to Core (opaque).
 */
export interface UmServiceIdentityContext {
  readonly serviceId: string;
  readonly platformId: string;
  readonly runtimeId?: string;
}

/**
 * Core SDK client — interface only.
 */
export interface UmCoreSdkClient {
  readonly identity: UmServiceIdentityContext;

  /** Register or refresh a platform/module manifest contribution. */
  register(manifest: UmPlatformManifest): void;

  readonly flags: UmFlagEvaluator;
  readonly events: Pick<UmEventPublisher, "publish">;
  readonly health: UmHealthReporter;
  readonly capabilities: UmCapabilityAsserter;
}

/**
 * Factory port for SDK clients — interface only.
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
) => void;

export type UmSdkReportHealth = (snapshot: UmHealthSnapshot) => void;

export type UmSdkAssertCapability = (
  capabilityId: UmCapabilityId,
) => ReturnType<UmCapabilityAsserter["assertEnabled"]>;
