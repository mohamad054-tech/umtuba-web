import { AiPlatformError } from "../contracts/errors";
import { buildCreatorPromptTemplates } from "./templates";
import type {
  CreatorAiSession,
  CreatorContentRequest,
  CreatorContentResult,
  CreatorDraft,
  CreatorDraftVersion,
  CreatorHistoryEntry,
  CreatorPromptTemplate,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class CreatorStudioTemplateRegistry {
  private readonly templates: CreatorPromptTemplate[];

  constructor(templates: CreatorPromptTemplate[] = buildCreatorPromptTemplates()) {
    this.templates = templates;
  }

  list(): CreatorPromptTemplate[] {
    return [...this.templates];
  }

  get(templateId: string): CreatorPromptTemplate | null {
    return this.templates.find((t) => t.templateId === templateId) ?? null;
  }

  require(templateId: string): CreatorPromptTemplate {
    const t = this.get(templateId);
    if (!t || !t.enabled) {
      throw new AiPlatformError("invalid_input", `Unknown template: ${templateId}`);
    }
    return t;
  }
}

export class CreatorStudioStore {
  private sessions = new Map<string, CreatorAiSession>();
  private drafts = new Map<string, CreatorDraft>();
  private history: CreatorHistoryEntry[] = [];
  private results: CreatorContentResult[] = [];

  reset(): void {
    this.sessions.clear();
    this.drafts.clear();
    this.history = [];
    this.results = [];
  }

  createSession(input: {
    userId: string;
    tenantId: string;
    locale?: string;
  }): CreatorAiSession {
    const now = new Date().toISOString();
    const session: CreatorAiSession = {
      sessionId: newId("csess"),
      userId: input.userId,
      tenantId: input.tenantId,
      createdAt: now,
      updatedAt: now,
      locale: input.locale ?? "en",
      favoriteTemplateIds: [],
      activeDraftId: null,
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  getOrCreateSession(input: {
    userId: string;
    tenantId: string;
    locale?: string;
  }): CreatorAiSession {
    for (const session of this.sessions.values()) {
      if (session.userId === input.userId && session.tenantId === input.tenantId) {
        return session;
      }
    }
    return this.createSession(input);
  }

  getSession(sessionId: string): CreatorAiSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  toggleFavorite(sessionId: string, templateId: string): CreatorAiSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new AiPlatformError("invalid_input", "Unknown session.");
    }
    const set = new Set(session.favoriteTemplateIds);
    if (set.has(templateId)) set.delete(templateId);
    else set.add(templateId);
    const next = {
      ...session,
      favoriteTemplateIds: [...set],
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, next);
    return next;
  }

  createDraft(input: {
    sessionId: string;
    templateId: string;
    title: string;
    prompt: string;
  }): CreatorDraft {
    const now = new Date().toISOString();
    const draftId = newId("cdraft");
    const version: CreatorDraftVersion = {
      versionId: newId("cver"),
      draftId,
      version: 1,
      prompt: input.prompt,
      mockOutput: null,
      createdAt: now,
    };
    const draft: CreatorDraft = {
      draftId,
      sessionId: input.sessionId,
      templateId: input.templateId,
      title: input.title,
      latestVersion: 1,
      versions: [version],
      updatedAt: now,
    };
    this.drafts.set(draftId, draft);
    const session = this.sessions.get(input.sessionId);
    if (session) {
      this.sessions.set(input.sessionId, {
        ...session,
        activeDraftId: draftId,
        updatedAt: now,
      });
    }
    return draft;
  }

  addDraftVersion(
    draftId: string,
    prompt: string,
    mockOutput: string | null
  ): CreatorDraft {
    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new AiPlatformError("invalid_input", "Unknown draft.");
    }
    const version: CreatorDraftVersion = {
      versionId: newId("cver"),
      draftId,
      version: draft.latestVersion + 1,
      prompt,
      mockOutput,
      createdAt: new Date().toISOString(),
    };
    const next: CreatorDraft = {
      ...draft,
      latestVersion: version.version,
      versions: [...draft.versions, version],
      updatedAt: version.createdAt,
    };
    this.drafts.set(draftId, next);
    return next;
  }

  listDrafts(sessionId: string): CreatorDraft[] {
    return [...this.drafts.values()].filter((d) => d.sessionId === sessionId);
  }

  recordHistory(entry: Omit<CreatorHistoryEntry, "historyId">): CreatorHistoryEntry {
    const full: CreatorHistoryEntry = {
      historyId: newId("chist"),
      ...entry,
    };
    this.history.push(full);
    return full;
  }

  listHistory(sessionId: string, limit = 50): CreatorHistoryEntry[] {
    return this.history.filter((h) => h.sessionId === sessionId).slice(-limit);
  }

  recordResult(result: CreatorContentResult): void {
    this.results.push(result);
  }

  listResults(limit = 50): CreatorContentResult[] {
    return this.results.slice(-limit);
  }

  buildRequest(input: Omit<CreatorContentRequest, "requestId">): CreatorContentRequest {
    return { requestId: newId("creq"), ...input };
  }
}

export const creatorStudioTemplateRegistry = new CreatorStudioTemplateRegistry();
export const creatorStudioStore = new CreatorStudioStore();

export function resetCreatorStudioFoundation(): void {
  creatorStudioStore.reset();
}
