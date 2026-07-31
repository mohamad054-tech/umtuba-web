/**
 * Assistant Tool Invocation Framework — registry + fail-closed invoke.
 * Tools are not implemented in V1; invoke always denies execution.
 */

import { AiPlatformError } from "../contracts/errors";
import {
  AI_ASSISTANT_TOOL_IDS,
  type AiAssistantSkillId,
  type AiAssistantToolDefinition,
  type AiAssistantToolId,
  type AiAssistantToolRequest,
  type AiAssistantToolResponse,
} from "./types";
import {
  assertAssistantToolId,
  validateToolRequest,
  validateToolResponse,
} from "./conversation";
import type { AiAssistantSkillRegistry } from "./skillRegistry";

const DEFAULT_TOOLS: AiAssistantToolDefinition[] = [
  {
    toolId: "search",
    description: "Platform search (future).",
    domainOwner: "search",
    available: false,
    mutating: false,
    requiredArgKeys: ["query"],
  },
  {
    toolId: "recommendations",
    description: "Recommendation lookup (future).",
    domainOwner: "assistant",
    available: false,
    mutating: false,
    requiredArgKeys: ["surface"],
  },
  {
    toolId: "learning",
    description: "Learning domain tool (future).",
    domainOwner: "learning",
    available: false,
    mutating: false,
    requiredArgKeys: [],
  },
  {
    toolId: "commerce",
    description: "Commerce domain tool (future).",
    domainOwner: "commerce",
    available: false,
    mutating: false,
    requiredArgKeys: [],
  },
  {
    toolId: "creator",
    description: "Creator domain tool (future).",
    domainOwner: "creator",
    available: false,
    mutating: false,
    requiredArgKeys: [],
  },
  {
    toolId: "world",
    description: "World domain tool (future).",
    domainOwner: "world",
    available: false,
    mutating: false,
    requiredArgKeys: [],
  },
  {
    toolId: "video",
    description: "Video domain tool (future).",
    domainOwner: "video",
    available: false,
    mutating: false,
    requiredArgKeys: [],
  },
  {
    toolId: "marketing",
    description: "Marketing domain tool (future).",
    domainOwner: "marketing",
    available: false,
    mutating: false,
    requiredArgKeys: [],
  },
  {
    toolId: "ads",
    description: "Ads domain tool (future).",
    domainOwner: "ads",
    available: false,
    mutating: false,
    requiredArgKeys: [],
  },
];

export class AiAssistantToolRegistry {
  private readonly tools = new Map<AiAssistantToolId, AiAssistantToolDefinition>();

  constructor(seed: AiAssistantToolDefinition[] = DEFAULT_TOOLS) {
    for (const tool of seed) {
      this.register(tool);
    }
  }

  register(tool: AiAssistantToolDefinition): void {
    assertAssistantToolId(tool.toolId);
    if (tool.available !== false) {
      throw new AiPlatformError(
        "configuration_invalid",
        `Assistant tool ${tool.toolId} must remain unavailable in Foundation V1.`
      );
    }
    this.tools.set(tool.toolId, {
      ...tool,
      description: tool.description.trim(),
      requiredArgKeys: [...tool.requiredArgKeys],
      available: false,
    });
  }

  get(toolId: AiAssistantToolId): AiAssistantToolDefinition | null {
    return this.tools.get(toolId) ?? null;
  }

  list(): AiAssistantToolDefinition[] {
    return AI_ASSISTANT_TOOL_IDS.map((id) => this.tools.get(id)).filter(
      (t): t is AiAssistantToolDefinition => Boolean(t)
    );
  }

  reset(seed: AiAssistantToolDefinition[] = DEFAULT_TOOLS): void {
    this.tools.clear();
    for (const tool of seed) {
      this.register(tool);
    }
  }
}

export const aiAssistantToolRegistry = new AiAssistantToolRegistry();

export type AiAssistantToolInvokeInput = {
  request: AiAssistantToolRequest;
  skillId: AiAssistantSkillId;
  skills: AiAssistantSkillRegistry;
  tools?: AiAssistantToolRegistry;
};

/**
 * Fail-closed invoke: validates contracts, then denies execution (tools not wired).
 */
export function invokeAssistantTool(
  input: AiAssistantToolInvokeInput
): AiAssistantToolResponse {
  const request = validateToolRequest(input.request);
  const tools = input.tools ?? aiAssistantToolRegistry;
  const def = tools.get(request.toolId);
  if (!def) {
    throw new AiPlatformError(
      "tool_denied",
      `Unknown assistant tool: ${request.toolId}`
    );
  }

  const skill = input.skills.require(input.skillId);
  if (!skill.allowedToolIds.includes(request.toolId)) {
    throw new AiPlatformError(
      "tool_denied",
      `Tool ${request.toolId} not allowed for skill ${input.skillId}.`
    );
  }

  for (const key of def.requiredArgKeys) {
    if (!(key in request.args)) {
      throw new AiPlatformError(
        "invalid_input",
        `Missing required tool arg: ${key}`
      );
    }
  }

  // V1: no execution — fail closed with structured response (does not throw to callers
  // that prefer result objects; foundation tests expect ok:false).
  return validateToolResponse({
    toolRequestId: request.toolRequestId,
    toolId: request.toolId,
    ok: false,
    data: {},
    errorCode: "tool_not_implemented",
  });
}
