import { randomUUID } from "crypto";
import type { AiContextEnvelope, AiDataClassification } from "./types";
import { AiPlatformError } from "./errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAiUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value));
}

/**
 * Build a trusted context envelope server-side.
 * Client-supplied roles/permissions are ignored; callers must pass resolved values.
 */
export function buildTrustedContext(input: {
  userId: string;
  productDomain: string;
  surface: string;
  dataClassification: AiDataClassification;
  allowedCapabilities: string[];
  allowedToolIds: string[];
  workspaceId?: string | null;
  storeId?: string | null;
  courseId?: string | null;
  projectId?: string | null;
  role?: string | null;
  locale?: string | null;
  timezone?: string | null;
  sessionId?: string | null;
  conversationId?: string | null;
  resourceRefs?: Array<{ type: string; id: string }>;
  traceId?: string;
}): AiContextEnvelope {
  if (!isAiUuid(input.userId)) {
    throw new AiPlatformError("unauthenticated", "Valid user is required.");
  }
  if (!input.productDomain.trim() || !input.surface.trim()) {
    throw new AiPlatformError(
      "invalid_input",
      "productDomain and surface are required."
    );
  }

  for (const id of [
    input.workspaceId,
    input.storeId,
    input.courseId,
    input.projectId,
    input.sessionId,
    input.conversationId,
  ]) {
    if (id != null && id !== "" && !isAiUuid(id)) {
      throw new AiPlatformError("invalid_input", "Context IDs must be UUIDs.");
    }
  }

  return {
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    storeId: input.storeId ?? null,
    courseId: input.courseId ?? null,
    projectId: input.projectId ?? null,
    productDomain: input.productDomain.trim(),
    surface: input.surface.trim(),
    role: input.role ?? null,
    locale: input.locale ?? null,
    timezone: input.timezone ?? null,
    sessionId: input.sessionId ?? null,
    conversationId: input.conversationId ?? null,
    resourceRefs: input.resourceRefs ?? [],
    dataClassification: input.dataClassification,
    allowedCapabilities: [...input.allowedCapabilities],
    allowedToolIds: [...input.allowedToolIds],
    traceId: input.traceId ?? randomUUID(),
  };
}

export function assertCapabilityAllowed(
  context: AiContextEnvelope,
  capabilityId: string
): void {
  if (!context.allowedCapabilities.includes(capabilityId)) {
    throw new AiPlatformError(
      "permission_denied",
      "Capability is not allowed for this context."
    );
  }
}

export function estimateContextChars(parts: Array<string | null | undefined>): number {
  return parts.reduce((sum, part) => sum + (part?.length ?? 0), 0);
}
