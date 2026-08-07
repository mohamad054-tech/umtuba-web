/**
 * Server-side professional provider selection (browser cannot pick models).
 */

import type { StudioLanguageCode } from "../types";
import type { ProfessionalQualityProfileId } from "./thresholds";
import {
  createFailClosedStubGenerator,
  type ProfessionalTranslationGenerator,
  type ProfessionalTranslationReviewer,
} from "./aiContracts";
import { createHeuristicProfessionalReviewer } from "./heuristicReviewer";
import { createGlossaryAwareProfessionalGenerator } from "./glossaryAwareGenerator";
import {
  createAiServiceProfessionalTransport,
  createUnavailableProfessionalAiTransport,
  type AiServiceJsonRunner,
  type ProfessionalAiTransport,
} from "./providerTransport";
import {
  createTransportBackedProfessionalGenerator,
  createTransportBackedProfessionalReviewer,
} from "./transportAdapters";

export type ProfessionalProviderMode =
  | "live_ai_service"
  | "heuristic_offline"
  | "unavailable";

export type ProfessionalProviderSelection = {
  mode: ProfessionalProviderMode;
  generator: ProfessionalTranslationGenerator;
  reviewer: ProfessionalTranslationReviewer;
  transportKind: ProfessionalAiTransport["kind"] | "heuristic";
  providerLabel: string;
  modelLabel: string;
  note: string;
};

export type ProfessionalProviderSelectionInput = {
  locale: StudioLanguageCode;
  profileId: ProfessionalQualityProfileId;
  /** When set and mode is live, use AI Core transport. */
  liveTransport?: ProfessionalAiTransport | null;
  /** Force offline/heuristic (tests). */
  forceOffline?: boolean;
};

/**
 * Explicit V1 selection policy — environment/availability driven.
 * Client cannot pass arbitrary provider/model names.
 */
export function selectProfessionalProviders(
  input: ProfessionalProviderSelectionInput
): ProfessionalProviderSelection {
  if (input.forceOffline) {
    return {
      mode: "heuristic_offline",
      generator: createGlossaryAwareProfessionalGenerator(),
      reviewer: createHeuristicProfessionalReviewer(),
      transportKind: "heuristic",
      providerLabel: "heuristic",
      modelLabel: "glossary-aware+heuristic-reviewer-v1",
      note: "Forced offline / heuristic mode",
    };
  }

  if (input.liveTransport && input.liveTransport.kind === "ai_service") {
    return {
      mode: "live_ai_service",
      generator: createTransportBackedProfessionalGenerator(input.liveTransport),
      reviewer: createTransportBackedProfessionalReviewer(input.liveTransport),
      transportKind: "ai_service",
      providerLabel: "ai_service",
      modelLabel: "platform.translation_suggest",
      note: "Live AI Core transport selected",
    };
  }

  // Default production-safe path when live provider not configured.
  return {
    mode: "heuristic_offline",
    generator: createGlossaryAwareProfessionalGenerator(),
    reviewer: createHeuristicProfessionalReviewer(),
    transportKind: "heuristic",
    providerLabel: "heuristic",
    modelLabel: "glossary-aware+heuristic-reviewer-v1",
    note: "RUNTIME_PROVIDER_NOT_CONFIGURED — using offline heuristic path",
  };
}

export function createLiveTransportFromAiServiceRunner(
  runCapability: AiServiceJsonRunner
): ProfessionalAiTransport {
  return createAiServiceProfessionalTransport({ runCapability });
}

export function createUnavailableSelection(): ProfessionalProviderSelection {
  const transport = createUnavailableProfessionalAiTransport();
  return {
    mode: "unavailable",
    generator: createTransportBackedProfessionalGenerator(transport),
    reviewer: createTransportBackedProfessionalReviewer(transport),
    transportKind: "unavailable",
    providerLabel: "unavailable",
    modelLabel: "none",
    note: "Professional generation unavailable",
  };
}

/** Test helper — stub generator + heuristic reviewer (independent). */
export function createScriptedOfflineSelection(): ProfessionalProviderSelection {
  return {
    mode: "heuristic_offline",
    generator: createFailClosedStubGenerator(),
    reviewer: createHeuristicProfessionalReviewer(),
    transportKind: "heuristic",
    providerLabel: "stub+heuristic",
    modelLabel: "stub-v1+heuristic-reviewer-v1",
    note: "Scripted offline selection for tests",
  };
}
