"use server";

import {
  creatorStudioStore,
  creatorStudioTemplateRegistry,
  runCreatorStudioRequest,
  type CreatorOutputKind,
  type CreatorStudioOperation,
} from "../../../lib/ai/creatorStudio";

export async function creatorStudioRunAction(input: {
  sessionId: string;
  templateId: string;
  operation: CreatorStudioOperation;
  prompt: string;
  locale: string;
  targetLocale: string;
  outputKind: CreatorOutputKind;
  structuredOutput: boolean;
  draftId: string | null;
}) {
  try {
    const { result } = runCreatorStudioRequest({
      sessionId: input.sessionId,
      templateId: input.templateId,
      operation: input.operation,
      prompt: input.prompt,
      locale: input.locale,
      targetLocale: input.targetLocale || null,
      outputKind: input.outputKind,
      structuredOutput: input.structuredOutput,
      draftId: input.draftId,
    });
    return {
      ok: true as const,
      result,
      drafts: creatorStudioStore.listDrafts(input.sessionId),
      history: creatorStudioStore.listHistory(input.sessionId),
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Creator Studio request failed.",
    };
  }
}

export async function creatorStudioToggleFavoriteAction(input: {
  sessionId: string;
  templateId: string;
}) {
  creatorStudioTemplateRegistry.require(input.templateId);
  const session = creatorStudioStore.toggleFavorite(
    input.sessionId,
    input.templateId
  );
  return { favorites: session.favoriteTemplateIds };
}

export async function creatorStudioCreateDraftAction(input: {
  sessionId: string;
  templateId: string;
  title: string;
  prompt: string;
}) {
  creatorStudioTemplateRegistry.require(input.templateId);
  const draft = creatorStudioStore.createDraft(input);
  return {
    draft,
    drafts: creatorStudioStore.listDrafts(input.sessionId),
  };
}
