/**
 * Assistant skill routing — deterministic by request kind.
 * Prompt text alone never selects a skill in V1.
 */

import { AiPlatformError } from "../contracts/errors";
import {
  assertAssistantRequestKind,
  assertAssistantSkillId,
} from "./conversation";
import type { AiAssistantSkillRegistry } from "./skillRegistry";
import type {
  AiAssistantRoutingDecision,
  AiAssistantRoutingRequest,
} from "./types";

/**
 * Route an assistant request to a skill.
 * Primary signal: requestKind. preferredSkillId may only confirm ownership.
 * promptText is ignored for routing (documented anti-pattern for V1).
 */
export function routeAssistantSkill(
  request: AiAssistantRoutingRequest,
  skills: AiAssistantSkillRegistry
): AiAssistantRoutingDecision {
  assertAssistantRequestKind(request.requestKind);

  const byKind = skills.findByRequestKind(request.requestKind);
  if (!byKind) {
    throw new AiPlatformError(
      "no_eligible_route",
      `No skill for request kind: ${request.requestKind}`
    );
  }

  if (request.preferredSkillId) {
    assertAssistantSkillId(request.preferredSkillId);
    const preferred = skills.require(request.preferredSkillId);
    if (!preferred.requestKinds.includes(request.requestKind)) {
      throw new AiPlatformError(
        "no_eligible_route",
        `Preferred skill ${request.preferredSkillId} does not own ${request.requestKind}.`
      );
    }
    if (preferred.skillId !== byKind.skillId) {
      // Preferred must match kind ownership; kind map is authoritative when conflict.
      throw new AiPlatformError(
        "no_eligible_route",
        "Preferred skill conflicts with request-kind ownership."
      );
    }
    return {
      skillId: preferred.skillId,
      requestKind: request.requestKind,
      reason: "preferred_skill_validated",
      policyId: "assistant_skill_route_v1",
    };
  }

  // Explicitly ignore promptText for routing.
  void request.promptText;

  return {
    skillId: byKind.skillId,
    requestKind: request.requestKind,
    reason: "request_kind",
    policyId: "assistant_skill_route_v1",
  };
}
