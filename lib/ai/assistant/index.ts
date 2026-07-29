/**
 * AI Assistant Foundation facade — first official Shared AI Core consumer surface.
 * Registry / contracts / routing / assembly only. No Chat UI. No providers.
 */

import { assembleAssistantContext } from "./contextAssembly";
import {
  createAssistantConversation,
  createAssistantResponse,
  toClientSafeMessage,
  validateAssistantMessage,
  validateSystemContext,
  validateToolRequest,
  validateToolResponse,
} from "./conversation";
import { routeAssistantSkill } from "./routing";
import {
  AiAssistantSkillRegistry,
  aiAssistantSkillRegistry,
} from "./skillRegistry";
import {
  AiAssistantToolRegistry,
  aiAssistantToolRegistry,
  invokeAssistantTool,
} from "./toolFramework";
import {
  createNoopAssistantExtensionHooks,
  type AiAssistantAssembledContext,
  type AiAssistantExtensionHooks,
  type AiAssistantRoutingDecision,
  type AiAssistantRoutingRequest,
} from "./types";
import type { AiAssistantContextAssemblyInput } from "./contextAssembly";

export type AiAssistantFoundationOptions = {
  skills?: AiAssistantSkillRegistry;
  tools?: AiAssistantToolRegistry;
  hooks?: AiAssistantExtensionHooks;
};

export class AiAssistantFoundation {
  readonly skills: AiAssistantSkillRegistry;
  readonly tools: AiAssistantToolRegistry;
  private readonly hooks: AiAssistantExtensionHooks;

  constructor(options: AiAssistantFoundationOptions = {}) {
    this.skills = options.skills ?? new AiAssistantSkillRegistry();
    this.tools = options.tools ?? new AiAssistantToolRegistry();
    this.hooks = {
      ...createNoopAssistantExtensionHooks(),
      ...options.hooks,
    };
  }

  route(request: AiAssistantRoutingRequest): AiAssistantRoutingDecision {
    return routeAssistantSkill(request, this.skills);
  }

  assembleContext(
    input: AiAssistantContextAssemblyInput
  ): AiAssistantAssembledContext {
    return assembleAssistantContext(input);
  }

  invokeTool(input: {
    request: Parameters<typeof invokeAssistantTool>[0]["request"];
    skillId: Parameters<typeof invokeAssistantTool>[0]["skillId"];
  }) {
    return invokeAssistantTool({
      ...input,
      skills: this.skills,
      tools: this.tools,
    });
  }

  /** Future hooks — always null/noop in V1. */
  extensionHooks(): AiAssistantExtensionHooks {
    return this.hooks;
  }
}

export const aiAssistantFoundation = new AiAssistantFoundation({
  skills: aiAssistantSkillRegistry,
  tools: aiAssistantToolRegistry,
});

export function resetAssistantFoundation(): void {
  aiAssistantSkillRegistry.reset();
  aiAssistantToolRegistry.reset();
}

export {
  assembleAssistantContext,
  createAssistantConversation,
  createAssistantResponse,
  toClientSafeMessage,
  validateAssistantMessage,
  validateSystemContext,
  validateToolRequest,
  validateToolResponse,
  routeAssistantSkill,
  invokeAssistantTool,
  AiAssistantSkillRegistry,
  AiAssistantToolRegistry,
  aiAssistantSkillRegistry,
  aiAssistantToolRegistry,
};
