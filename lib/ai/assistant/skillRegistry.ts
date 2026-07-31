/**
 * Assistant Skills Registry — definitions only.
 * Skills must never bind to providers or models.
 */

import { AiPlatformError } from "../contracts/errors";
import {
  AI_ASSISTANT_SKILL_IDS,
  type AiAssistantRequestKind,
  type AiAssistantSkillDefinition,
  type AiAssistantSkillId,
  type AiAssistantToolId,
} from "./types";
import { assertAssistantSkillId } from "./conversation";

const DEFAULT_SKILLS: AiAssistantSkillDefinition[] = [
  {
    skillId: "assistant",
    description: "General cross-product UMTUBA assistant skill.",
    requestKinds: ["general_help"],
    allowedToolIds: ["search"],
    enabled: true,
    providerBindingForbidden: true,
  },
  {
    skillId: "learning",
    description: "Learning / academy help skill.",
    requestKinds: ["learning_help"],
    allowedToolIds: ["learning", "search"],
    enabled: true,
    providerBindingForbidden: true,
  },
  {
    skillId: "commerce",
    description: "Commerce / storefront help skill.",
    requestKinds: ["commerce_help"],
    allowedToolIds: ["commerce", "search", "recommendations"],
    enabled: true,
    providerBindingForbidden: true,
  },
  {
    skillId: "creator",
    description: "Creator studio help skill.",
    requestKinds: ["creator_help"],
    allowedToolIds: ["creator", "search"],
    enabled: true,
    providerBindingForbidden: true,
  },
  {
    skillId: "search",
    description: "Search-oriented assistant skill.",
    requestKinds: ["search_query"],
    allowedToolIds: ["search", "recommendations"],
    enabled: true,
    providerBindingForbidden: true,
  },
  {
    skillId: "world",
    description: "World / local discovery help skill.",
    requestKinds: ["world_help"],
    allowedToolIds: ["world", "search"],
    enabled: true,
    providerBindingForbidden: true,
  },
  {
    skillId: "video",
    description: "Video / watch surface help skill.",
    requestKinds: ["video_help"],
    allowedToolIds: ["video", "recommendations", "search"],
    enabled: true,
    providerBindingForbidden: true,
  },
  {
    skillId: "marketing",
    description: "Marketing help skill.",
    requestKinds: ["marketing_help"],
    allowedToolIds: ["marketing", "search"],
    enabled: true,
    providerBindingForbidden: true,
  },
  {
    skillId: "ads",
    description: "Ads help skill.",
    requestKinds: ["ads_help"],
    allowedToolIds: ["ads", "marketing", "search"],
    enabled: true,
    providerBindingForbidden: true,
  },
];

function assertNoProviderBinding(skill: AiAssistantSkillDefinition): void {
  if (skill.providerBindingForbidden !== true) {
    throw new AiPlatformError(
      "configuration_invalid",
      `Skill ${skill.skillId} must forbid provider binding.`
    );
  }
  const banned = skill as AiAssistantSkillDefinition & {
    providerId?: unknown;
    modelId?: unknown;
    modelRef?: unknown;
  };
  if (
    banned.providerId != null ||
    banned.modelId != null ||
    banned.modelRef != null
  ) {
    throw new AiPlatformError(
      "configuration_invalid",
      `Skill ${skill.skillId} must not bind to provider/model.`
    );
  }
}

export class AiAssistantSkillRegistry {
  private readonly skills = new Map<AiAssistantSkillId, AiAssistantSkillDefinition>();

  constructor(seed: AiAssistantSkillDefinition[] = DEFAULT_SKILLS) {
    for (const skill of seed) {
      this.register(skill);
    }
  }

  register(skill: AiAssistantSkillDefinition): void {
    assertAssistantSkillId(skill.skillId);
    assertNoProviderBinding(skill);
    if (!skill.description.trim()) {
      throw new AiPlatformError(
        "invalid_input",
        "Skill description is required."
      );
    }
    if (skill.requestKinds.length === 0) {
      throw new AiPlatformError(
        "invalid_input",
        "Skill must declare at least one request kind."
      );
    }
    this.skills.set(skill.skillId, {
      ...skill,
      description: skill.description.trim(),
      allowedToolIds: [...skill.allowedToolIds],
      requestKinds: [...skill.requestKinds],
      providerBindingForbidden: true,
    });
  }

  get(skillId: AiAssistantSkillId): AiAssistantSkillDefinition | null {
    return this.skills.get(skillId) ?? null;
  }

  require(skillId: AiAssistantSkillId): AiAssistantSkillDefinition {
    const skill = this.get(skillId);
    if (!skill || !skill.enabled) {
      throw new AiPlatformError(
        "invalid_input",
        `Skill unavailable: ${skillId}`
      );
    }
    return skill;
  }

  list(): AiAssistantSkillDefinition[] {
    return AI_ASSISTANT_SKILL_IDS.map((id) => this.skills.get(id)).filter(
      (s): s is AiAssistantSkillDefinition => Boolean(s)
    );
  }

  findByRequestKind(
    requestKind: AiAssistantRequestKind
  ): AiAssistantSkillDefinition | null {
    for (const skill of this.list()) {
      if (skill.enabled && skill.requestKinds.includes(requestKind)) {
        return skill;
      }
    }
    return null;
  }

  allowsTool(
    skillId: AiAssistantSkillId,
    toolId: AiAssistantToolId
  ): boolean {
    const skill = this.get(skillId);
    if (!skill?.enabled) return false;
    return skill.allowedToolIds.includes(toolId);
  }

  reset(seed: AiAssistantSkillDefinition[] = DEFAULT_SKILLS): void {
    this.skills.clear();
    for (const skill of seed) {
      this.register(skill);
    }
  }
}

export const aiAssistantSkillRegistry = new AiAssistantSkillRegistry();
