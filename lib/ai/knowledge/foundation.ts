/**
 * Knowledge & Memory Foundation facade.
 */

import { assembleContext } from "./contextAssembly";
import {
  AiKnowledgeRegistry,
  aiKnowledgeRegistry,
} from "./knowledgeRegistry";
import { AiMemoryRegistry, aiMemoryRegistry } from "./memoryRegistry";
import { retrieveKnowledgeAndMemory } from "./retrieval";
import {
  createNoopKnowledgeMemoryExtensionHooks,
  type AiAssembledContext,
  type AiKnowledgeMemoryExtensionHooks,
  type AiRetrievalQuery,
  type AiRetrievalResult,
} from "./types";

export type AiKnowledgeMemoryFoundationOptions = {
  knowledge?: AiKnowledgeRegistry;
  memory?: AiMemoryRegistry;
  hooks?: AiKnowledgeMemoryExtensionHooks;
};

export class AiKnowledgeMemoryFoundation {
  readonly knowledge: AiKnowledgeRegistry;
  readonly memory: AiMemoryRegistry;
  private hooks: AiKnowledgeMemoryExtensionHooks;

  constructor(options: AiKnowledgeMemoryFoundationOptions = {}) {
    this.knowledge = options.knowledge ?? new AiKnowledgeRegistry();
    this.memory = options.memory ?? new AiMemoryRegistry();
    this.hooks = {
      ...createNoopKnowledgeMemoryExtensionHooks(),
      ...options.hooks,
    };
  }

  retrieve(query: AiRetrievalQuery): AiRetrievalResult {
    return retrieveKnowledgeAndMemory({
      query,
      knowledge: this.knowledge,
      memory: this.memory,
      hooks: this.hooks,
    });
  }

  assembleFromQuery(
    assemblyId: string,
    query: AiRetrievalQuery,
    systemText?: string
  ): AiAssembledContext {
    const retrieval = this.retrieve(query);
    return assembleContext({
      assemblyId,
      retrieval,
      knowledge: this.knowledge,
      memory: this.memory,
      systemText,
    });
  }
}

export const aiKnowledgeMemoryFoundation = new AiKnowledgeMemoryFoundation({
  knowledge: aiKnowledgeRegistry,
  memory: aiMemoryRegistry,
});

export function resetKnowledgeMemoryFoundation(): void {
  aiKnowledgeRegistry.reset();
  aiMemoryRegistry.reset();
}
