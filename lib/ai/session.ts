import { randomUUID } from "crypto";
import { AiPlatformError } from "./errors";
import { isAiUuid } from "./context";

export type AiSession = {
  id: string;
  userId: string;
  productDomain: string;
  workspaceId: string | null;
  locale: string | null;
  status: "active" | "closed";
  conversationId: string | null;
  recentRunIds: string[];
  createdAt: string;
  updatedAt: string;
};

const sessions = new Map<string, AiSession>();

export function resetAiSessionState(): void {
  sessions.clear();
}

export function createAiSession(input: {
  userId: string;
  productDomain: string;
  workspaceId?: string | null;
  locale?: string | null;
  conversationId?: string | null;
}): AiSession {
  if (!isAiUuid(input.userId)) {
    throw new AiPlatformError("unauthenticated", "Valid user required.");
  }
  const now = new Date().toISOString();
  const session: AiSession = {
    id: randomUUID(),
    userId: input.userId,
    productDomain: input.productDomain,
    workspaceId: input.workspaceId ?? null,
    locale: input.locale ?? null,
    status: "active",
    conversationId: input.conversationId ?? null,
    recentRunIds: [],
    createdAt: now,
    updatedAt: now,
  };
  sessions.set(session.id, session);
  return session;
}

export function getAiSessionForUser(
  sessionId: string,
  userId: string
): AiSession {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new AiPlatformError("session_missing", "AI session not found.");
  }
  if (session.userId !== userId) {
    throw new AiPlatformError(
      "permission_denied",
      "Session does not belong to this user."
    );
  }
  return session;
}

export function assertSessionWorkspace(
  session: AiSession,
  workspaceId: string | null | undefined
): void {
  if (
    session.workspaceId &&
    workspaceId &&
    session.workspaceId !== workspaceId
  ) {
    throw new AiPlatformError(
      "permission_denied",
      "Cross-workspace AI session access denied."
    );
  }
}

export function attachRunToSession(sessionId: string, runId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.recentRunIds = [...session.recentRunIds, runId].slice(-20);
  session.updatedAt = new Date().toISOString();
}

export function listSessionsForUser(userId: string): AiSession[] {
  return [...sessions.values()].filter((s) => s.userId === userId);
}
