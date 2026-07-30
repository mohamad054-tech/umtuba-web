/**
 * AI Knowledge & Memory Foundation V1 — shared contracts.
 * Domain-agnostic. No DB. No UI. No RAG/vector execution.
 */

export const AI_KNOWLEDGE_SOURCE_KINDS = [
  "platform_knowledge",
  "course_knowledge",
  "commerce_knowledge",
  "creator_knowledge",
  "world_knowledge",
  "user_knowledge",
  "uploaded_documents",
  "external_knowledge",
] as const;
export type AiKnowledgeSourceKind = (typeof AI_KNOWLEDGE_SOURCE_KINDS)[number];

export const AI_MEMORY_KINDS = [
  "session_memory",
  "short_term_memory",
  "long_term_memory",
  "preference_memory",
  "interaction_history",
] as const;
export type AiMemoryKind = (typeof AI_MEMORY_KINDS)[number];

export type AiKnowledgeRecord = {
  knowledgeId: string;
  sourceKind: AiKnowledgeSourceKind;
  title: string;
  /** Opaque text body for future indexing — not retrieved via vectors in V1. */
  body: string;
  tags: string[];
  ownerId: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiMemoryEntry = {
  memoryId: string;
  memoryKind: AiMemoryKind;
  subjectId: string;
  key: string;
  value: Record<string, string | number | boolean | null>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AiRetrievalQuery = {
  queryId: string;
  text: string;
  sourceKinds?: AiKnowledgeSourceKind[];
  memoryKinds?: AiMemoryKind[];
  subjectId?: string | null;
  limit: number;
};

export type AiRetrievalHit = {
  hitId: string;
  kind: "knowledge" | "memory";
  refId: string;
  score: number;
  snippet: string;
};

export type AiRetrievalResult = {
  queryId: string;
  hits: AiRetrievalHit[];
  /** Always false in V1 — vector/RAG not wired. */
  usedVectorSearch: false;
  usedRag: false;
};

export type AiAssembledContextBlock = {
  blockId: string;
  origin: "knowledge" | "memory" | "system";
  label: string;
  text: string;
  order: number;
};

export type AiAssembledContext = {
  assemblyId: string;
  blocks: AiAssembledContextBlock[];
  knowledgeIds: string[];
  memoryIds: string[];
};

/**
 * Reserved future hooks — noop in V1.
 */
export type AiKnowledgeMemoryExtensionHooks = {
  embedText?: (text: string) => number[] | null;
  indexDocument?: (record: AiKnowledgeRecord) => void;
  vectorSearch?: (query: AiRetrievalQuery) => AiRetrievalHit[] | null;
  semanticRetrieve?: (query: AiRetrievalQuery) => AiRetrievalHit[] | null;
  runRag?: (query: AiRetrievalQuery) => AiRetrievalResult | null;
  rankMemories?: (entries: AiMemoryEntry[]) => AiMemoryEntry[] | null;
};

export function createNoopKnowledgeMemoryExtensionHooks(): AiKnowledgeMemoryExtensionHooks {
  return {
    embedText: () => null,
    indexDocument: () => undefined,
    vectorSearch: () => null,
    semanticRetrieve: () => null,
    runRag: () => null,
    rankMemories: () => null,
  };
}
