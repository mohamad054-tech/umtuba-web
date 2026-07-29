import type { AiPromptDefinition } from "../../prompts/registry";
import { AiPlatformError } from "../../contracts/errors";

const LEARNING_UNSAFE =
  /(suicid|self[- ]?harm|kill yourself|how to make a bomb|explicit sex|pornograph|answer key|cheat on (the )?exam|give me the graded answers)/i;

/**
 * Learning-specific post checks layered on Shared AI safety.
 */
export function assertLearningTutorSafety(input: {
  capabilityId: string;
  userInput: string;
  structured: Record<string, unknown> | null;
}): void {
  if (LEARNING_UNSAFE.test(input.userInput)) {
    throw new AiPlatformError(
      "safety_block",
      "Request blocked by Learning safety policy."
    );
  }
  const blob = JSON.stringify(input.structured ?? {});
  if (LEARNING_UNSAFE.test(blob)) {
    throw new AiPlatformError(
      "safety_block",
      "Response blocked by Learning safety policy."
    );
  }
  if (
    input.capabilityId === "learning.tutor.generate_practice" &&
    input.structured
  ) {
    if (input.structured.labeledAiGenerated !== true) {
      throw new AiPlatformError(
        "invalid_structured_output",
        "Practice must be labeled AI-generated."
      );
    }
    if (
      "grade" in input.structured ||
      "officialAssessment" in input.structured ||
      "answerKey" in input.structured
    ) {
      throw new AiPlatformError(
        "safety_block",
        "Practice output attempted graded/official fields."
      );
    }
  }
  if (
    input.capabilityId === "learning.tutor.explain_wrong_answer" &&
    input.structured
  ) {
    if (input.structured.labeledAiGenerated !== true) {
      throw new AiPlatformError(
        "invalid_structured_output",
        "Wrong-answer explanation must be labeled AI-generated."
      );
    }
    if (input.structured.revealsAnswerKey !== false) {
      throw new AiPlatformError(
        "safety_block",
        "Wrong-answer explanation must not reveal answer keys."
      );
    }
    if (
      "answerKey" in input.structured ||
      "correctAnswer" in input.structured ||
      "answer_key" in input.structured
    ) {
      throw new AiPlatformError(
        "safety_block",
        "Wrong-answer explanation attempted key leakage fields."
      );
    }
  }
  if (input.capabilityId === "learning.tutor.give_hint" && input.structured) {
    if (input.structured.labeledAiGenerated !== true) {
      throw new AiPlatformError(
        "invalid_structured_output",
        "Hint must be labeled AI-generated."
      );
    }
    if (input.structured.revealsAnswerKey !== false) {
      throw new AiPlatformError(
        "safety_block",
        "Hint must not reveal answer keys."
      );
    }
    if (
      "answerKey" in input.structured ||
      "correctAnswer" in input.structured ||
      "answer_key" in input.structured ||
      "fullAnswer" in input.structured
    ) {
      throw new AiPlatformError(
        "safety_block",
        "Hint attempted full-answer or key leakage fields."
      );
    }
    const level = String(input.structured.hintLevel ?? "");
    if (!["gentle", "moderate", "strong"].includes(level)) {
      throw new AiPlatformError(
        "invalid_structured_output",
        "hintLevel must be gentle|moderate|strong."
      );
    }
  }
}

export function validateLearningTutorStructured(
  prompt: AiPromptDefinition,
  value: unknown
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, message: "Structured output must be an object." };
  }
  const data = value as Record<string, unknown>;
  for (const key of prompt.outputSchema?.required ?? []) {
    if (!(key in data)) {
      return { ok: false, message: `Missing required field: ${key}` };
    }
  }
  if ("groundingStatus" in data) {
    const g = String(data.groundingStatus);
    if (!["grounded", "partial", "outside_material"].includes(g)) {
      return {
        ok: false,
        message: "groundingStatus must be grounded|partial|outside_material.",
      };
    }
  }
  return { ok: true, data };
}
