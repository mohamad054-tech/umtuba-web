/**
 * Retrieval contracts — lexical Foundation only (no Vector DB / RAG).
 */

import { AiPlatformError } from "../contracts/errors";
import type { AiKnowledgeRegistry } from "./knowledgeRegistry";
import type { AiMemoryRegistry } from "./memoryRegistry";
import type {
  AiKnowledgeMemoryExtensionHooks,
  AiRetrievalHit,
  AiRetrievalQuery,
  AiRetrievalResult,
} from "./types";
import { createNoopKnowledgeMemoryExtensionHooks } from "./types";

export function validateRetrievalQuery(query: AiRetrievalQuery): AiRetrievalQuery {
  const queryId = query.queryId.trim();
  const text = query.text.trim();
  if (!queryId) {
    throw new AiPlatformError("invalid_input", "queryId is required.");
  }
  if (!text) {
    throw new AiPlatformError("invalid_input", "query text is required.");
  }
  if (!Number.isFinite(query.limit) || query.limit <= 0) {
    throw new AiPlatformError(
      "invalid_input",
      "limit must be a positive finite number."
    );
  }
  return {
    queryId,
    text,
    sourceKinds: query.sourceKinds ? [...query.sourceKinds] : undefined,
    memoryKinds: query.memoryKinds ? [...query.memoryKinds] : undefined,
    subjectId: query.subjectId ?? null,
    limit: query.limit,
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9\u0600-\u06ff]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function lexicalScore(haystack: string, needles: string[]): number {
  if (needles.length === 0) return 0;
  const hay = haystack.toLowerCase();
  let hits = 0;
  for (const n of needles) {
    if (hay.includes(n)) hits += 1;
  }
  return hits / needles.length;
}

/**
 * Contract retrieval: optional future hooks first, else deterministic lexical match.
 * Never claims vector/RAG usage in V1.
 */
export function retrieveKnowledgeAndMemory(input: {
  query: AiRetrievalQuery;
  knowledge: AiKnowledgeRegistry;
  memory: AiMemoryRegistry;
  hooks?: AiKnowledgeMemoryExtensionHooks;
}): AiRetrievalResult {
  const query = validateRetrievalQuery(input.query);
  const hooks =
    input.hooks ?? createNoopKnowledgeMemoryExtensionHooks();

  const hooked =
    hooks.vectorSearch?.(query) ??
    hooks.semanticRetrieve?.(query) ??
    hooks.runRag?.(query)?.hits ??
    null;

  if (hooked) {
    const hits = [...hooked]
      .map((h) => ({
        ...h,
        score: Number.isFinite(h.score) ? h.score : 0,
      }))
      .sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        return a.refId.localeCompare(b.refId);
      })
      .slice(0, query.limit);
    return {
      queryId: query.queryId,
      hits,
      usedVectorSearch: false,
      usedRag: false,
    };
  }

  const tokens = tokenize(query.text);
  const hits: AiRetrievalHit[] = [];

  for (const record of input.knowledge.list({ enabledOnly: true })) {
    if (
      query.sourceKinds &&
      !query.sourceKinds.includes(record.sourceKind)
    ) {
      continue;
    }
    const score = lexicalScore(
      `${record.title} ${record.body} ${record.tags.join(" ")}`,
      tokens
    );
    if (score <= 0) continue;
    hits.push({
      hitId: `knowledge:${record.knowledgeId}`,
      kind: "knowledge",
      refId: record.knowledgeId,
      score,
      snippet: record.body.slice(0, 160),
    });
  }

  let memories = input.memory.list({
    enabledOnly: true,
    subjectId: query.subjectId ?? undefined,
  });
  if (query.memoryKinds) {
    memories = memories.filter((m) => query.memoryKinds!.includes(m.memoryKind));
  }
  const ranked = hooks.rankMemories?.(memories) ?? memories;
  for (const entry of ranked) {
    const blob = `${entry.key} ${JSON.stringify(entry.value)}`;
    const score = lexicalScore(blob, tokens);
    if (score <= 0) continue;
    hits.push({
      hitId: `memory:${entry.memoryId}`,
      kind: "memory",
      refId: entry.memoryId,
      score,
      snippet: blob.slice(0, 160),
    });
  }

  hits.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.refId.localeCompare(b.refId);
  });

  return {
    queryId: query.queryId,
    hits: hits.slice(0, query.limit),
    usedVectorSearch: false,
    usedRag: false,
  };
}
