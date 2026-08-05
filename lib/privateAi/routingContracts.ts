import type { AiCapabilityId, RoutingContract } from "./types";

/**
 * Routing contracts for future provider/model selection.
 * No runtime routing implementation in V1.
 */
export function buildDefaultRoutingContracts(): RoutingContract[] {
  const mk = (
    capabilityId: AiCapabilityId,
    primary: RoutingContract["primary"],
    fallbacks: RoutingContract["fallbacks"],
    costOptimization: boolean
  ): RoutingContract => ({
    id: `route_${capabilityId}_v1`,
    name: `${capabilityId} routing v1`,
    capabilityId,
    primary,
    fallbacks,
    costOptimization,
    notes: "Contract only — no runtime router wired.",
  });

  return [
    mk("translation", "private_model", ["external_provider", "fallback"], true),
    mk("coding", "external_provider", ["private_model", "fallback"], true),
    mk("learning", "private_model", ["external_provider", "fallback"], true),
    mk("commerce", "external_provider", ["fallback"], true),
    mk("creator", "external_provider", ["private_model", "fallback"], true),
    mk("moderation", "private_model", ["local_provider", "fallback"], false),
    mk("reasoning", "external_provider", ["private_model", "fallback"], true),
    mk("retrieval", "local_provider", ["private_model", "fallback"], true),
    mk("speech", "external_provider", ["fallback"], true),
    mk("vision", "external_provider", ["private_model", "fallback"], true),
    mk("planning", "external_provider", ["private_model", "fallback"], true),
    mk("tool_use", "external_provider", ["private_model", "fallback"], true),
  ];
}

export function assertRoutingContractShape(
  contract: RoutingContract
): string[] {
  const blockers: string[] = [];
  if (!contract.id.trim()) blockers.push("id_missing");
  if (!contract.capabilityId) blockers.push("capability_missing");
  if (!contract.primary) blockers.push("primary_missing");
  if (contract.primary === "fallback") {
    blockers.push("primary_cannot_be_fallback");
  }
  return blockers;
}
