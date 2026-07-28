/**
 * Context Assembly Foundation — deterministic block ordering.
 */

import { AiPlatformError } from "../contracts/errors";
import type { AiKnowledgeRegistry } from "./knowledgeRegistry";
import type { AiMemoryRegistry } from "./memoryRegistry";
import type {
  AiAssembledContext,
  AiAssembledContextBlock,
  AiRetrievalResult,
} from "./types";

export type AiContextAssemblyInput = {
  assemblyId: string;
  retrieval: AiRetrievalResult;
  knowledge: AiKnowledgeRegistry;
  memory: AiMemoryRegistry;
  /** Optional system preamble. */
  systemText?: string;
};

/**
 * Assembles retrieval hits into ordered context blocks.
 * Missing refs fail closed. Order is deterministic by retrieval hit order.
 */
export function assembleContext(
  input: AiContextAssemblyInput
): AiAssembledContext {
  const assemblyId = input.assemblyId.trim();
  if (!assemblyId) {
    throw new AiPlatformError("invalid_input", "assemblyId is required.");
  }

  const blocks: AiAssembledContextBlock[] = [];
  const knowledgeIds: string[] = [];
  const memoryIds: string[] = [];
  let order = 0;

  if (input.systemText?.trim()) {
    blocks.push({
      blockId: `${assemblyId}:system`,
      origin: "system",
      label: "system",
      text: input.systemText.trim(),
      order: order++,
    });
  }

  for (const hit of input.retrieval.hits) {
    if (hit.kind === "knowledge") {
      const record = input.knowledge.require(hit.refId);
      knowledgeIds.push(record.knowledgeId);
      blocks.push({
        blockId: `${assemblyId}:knowledge:${record.knowledgeId}`,
        origin: "knowledge",
        label: `${record.sourceKind}:${record.title}`,
        text: record.body,
        order: order++,
      });
      continue;
    }
    if (hit.kind === "memory") {
      const entry = input.memory.require(hit.refId);
      memoryIds.push(entry.memoryId);
      blocks.push({
        blockId: `${assemblyId}:memory:${entry.memoryId}`,
        origin: "memory",
        label: `${entry.memoryKind}:${entry.key}`,
        text: JSON.stringify(entry.value),
        order: order++,
      });
      continue;
    }
    throw new AiPlatformError(
      "invalid_input",
      `Unknown retrieval hit kind: ${String((hit as { kind: string }).kind)}`
    );
  }

  return {
    assemblyId,
    blocks,
    knowledgeIds,
    memoryIds,
  };
}
