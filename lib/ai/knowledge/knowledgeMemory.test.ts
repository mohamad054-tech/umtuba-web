import { beforeEach, describe, expect, it } from "vitest";
import { AiPlatformError } from "../contracts/errors";
import { assembleContext } from "./contextAssembly";
import {
  AiKnowledgeMemoryFoundation,
  resetKnowledgeMemoryFoundation,
} from "./foundation";
import { AiKnowledgeRegistry } from "./knowledgeRegistry";
import { AiMemoryRegistry } from "./memoryRegistry";
import { retrieveKnowledgeAndMemory, validateRetrievalQuery } from "./retrieval";
import {
  AI_KNOWLEDGE_SOURCE_KINDS,
  AI_MEMORY_KINDS,
  createNoopKnowledgeMemoryExtensionHooks,
} from "./types";

beforeEach(() => {
  resetKnowledgeMemoryFoundation();
});

describe("Knowledge Registry", () => {
  it("registers and lists knowledge by source kind", () => {
    const registry = new AiKnowledgeRegistry();
    registry.register({
      knowledgeId: "k1",
      sourceKind: "platform_knowledge",
      title: "Safety",
      body: "Never expose secrets.",
      tags: ["safety"],
      ownerId: null,
      enabled: true,
    });
    expect(registry.require("k1").title).toBe("Safety");
    expect(registry.list({ sourceKind: "platform_knowledge" })).toHaveLength(1);
    expect(AI_KNOWLEDGE_SOURCE_KINDS).toContain("course_knowledge");
  });

  it("fail-closed on unknown source and duplicates", () => {
    const registry = new AiKnowledgeRegistry();
    expect(() =>
      registry.register({
        knowledgeId: "k1",
        sourceKind: "secret_sauce" as never,
        title: "x",
        body: "y",
        tags: [],
        ownerId: null,
        enabled: true,
      })
    ).toThrow(/Unknown knowledge source/i);
    registry.register({
      knowledgeId: "k1",
      sourceKind: "commerce_knowledge",
      title: "Pricing",
      body: "Prices are confidential.",
      tags: [],
      ownerId: null,
      enabled: true,
    });
    expect(() =>
      registry.register({
        knowledgeId: "k1",
        sourceKind: "commerce_knowledge",
        title: "Pricing",
        body: "Prices are confidential.",
        tags: [],
        ownerId: null,
        enabled: true,
      })
    ).toThrow(/already registered/i);
  });
});

describe("Memory Registry", () => {
  it("registers memory kinds", () => {
    const registry = new AiMemoryRegistry();
    for (const memoryKind of AI_MEMORY_KINDS) {
      registry.register({
        memoryId: `m-${memoryKind}`,
        memoryKind,
        subjectId: "user-1",
        key: "pref",
        value: { ok: true },
        enabled: true,
      });
    }
    expect(registry.list({ subjectId: "user-1" })).toHaveLength(
      AI_MEMORY_KINDS.length
    );
  });

  it("fail-closed on unknown memory kind and empty key", () => {
    const registry = new AiMemoryRegistry();
    expect(() =>
      registry.register({
        memoryId: "m1",
        memoryKind: "dream_memory" as never,
        subjectId: "u1",
        key: "x",
        value: { a: 1 },
        enabled: true,
      })
    ).toThrow(/Unknown memory kind/i);
    expect(() =>
      registry.register({
        memoryId: "m2",
        memoryKind: "session_memory",
        subjectId: "u1",
        key: "  ",
        value: { a: 1 },
        enabled: true,
      })
    ).toThrow(/key is required/i);
  });
});

describe("Retrieval + Context Assembly", () => {
  it("retrieval contracts are deterministic and never claim vector/RAG", () => {
    const foundation = new AiKnowledgeMemoryFoundation();
    foundation.knowledge.register({
      knowledgeId: "k-ai",
      sourceKind: "platform_knowledge",
      title: "AI Core",
      body: "Shared AI Core routes models safely.",
      tags: ["ai", "core"],
      ownerId: null,
      enabled: true,
    });
    foundation.memory.register({
      memoryId: "mem-1",
      memoryKind: "preference_memory",
      subjectId: "user-1",
      key: "tone",
      value: { style: "concise" },
      enabled: true,
    });

    const q = {
      queryId: "q1",
      text: "AI Core models",
      subjectId: "user-1",
      limit: 10,
    };
    const a = foundation.retrieve(q);
    const b = foundation.retrieve(q);
    expect(a.hits.map((h) => h.refId)).toEqual(b.hits.map((h) => h.refId));
    expect(a.usedVectorSearch).toBe(false);
    expect(a.usedRag).toBe(false);
    expect(a.hits.some((h) => h.kind === "knowledge")).toBe(true);
  });

  it("assembles context blocks in deterministic order", () => {
    const foundation = new AiKnowledgeMemoryFoundation();
    foundation.knowledge.register({
      knowledgeId: "k1",
      sourceKind: "world_knowledge",
      title: "World",
      body: "World map facts.",
      tags: ["world"],
      ownerId: null,
      enabled: true,
    });
    const retrieval = retrieveKnowledgeAndMemory({
      query: validateRetrievalQuery({
        queryId: "q2",
        text: "world map",
        limit: 5,
      }),
      knowledge: foundation.knowledge,
      memory: foundation.memory,
    });
    const first = assembleContext({
      assemblyId: "asm-1",
      retrieval,
      knowledge: foundation.knowledge,
      memory: foundation.memory,
      systemText: "Be helpful.",
    });
    const second = assembleContext({
      assemblyId: "asm-1",
      retrieval,
      knowledge: foundation.knowledge,
      memory: foundation.memory,
      systemText: "Be helpful.",
    });
    expect(first.blocks.map((b) => b.blockId)).toEqual(
      second.blocks.map((b) => b.blockId)
    );
    expect(first.blocks[0]?.origin).toBe("system");
    expect(first.knowledgeIds).toContain("k1");
  });

  it("fail-closed on invalid retrieval query and missing assembly refs", () => {
    expect(() =>
      validateRetrievalQuery({
        queryId: "q",
        text: " ",
        limit: 1,
      })
    ).toThrow(/query text/i);

    const knowledge = new AiKnowledgeRegistry();
    const memory = new AiMemoryRegistry();
    expect(() =>
      assembleContext({
        assemblyId: "asm",
        retrieval: {
          queryId: "q",
          hits: [
            {
              hitId: "x",
              kind: "knowledge",
              refId: "missing",
              score: 1,
              snippet: "x",
            },
          ],
          usedVectorSearch: false,
          usedRag: false,
        },
        knowledge,
        memory,
      })
    ).toThrow(/Unknown knowledge/i);
  });

  it("skips disabled knowledge and exposes noop future hooks", () => {
    const foundation = new AiKnowledgeMemoryFoundation();
    foundation.knowledge.register({
      knowledgeId: "off",
      sourceKind: "uploaded_documents",
      title: "Doc",
      body: "Secret draft document text",
      tags: ["doc"],
      ownerId: "u1",
      enabled: false,
    });
    const result = foundation.retrieve({
      queryId: "q3",
      text: "document",
      limit: 5,
    });
    expect(result.hits).toHaveLength(0);

    const hooks = createNoopKnowledgeMemoryExtensionHooks();
    expect(hooks.embedText?.("x")).toBeNull();
    expect(hooks.vectorSearch?.({} as never)).toBeNull();
    expect(hooks.semanticRetrieve?.({} as never)).toBeNull();
    expect(hooks.runRag?.({} as never)).toBeNull();
    expect(hooks.rankMemories?.([])).toBeNull();
    expect(() => hooks.indexDocument?.({} as never)).not.toThrow();
  });

  it("fail-closed when subject memory lookup requested without matching entries still valid", () => {
    const foundation = new AiKnowledgeMemoryFoundation();
    foundation.memory.register({
      memoryId: "m1",
      memoryKind: "interaction_history",
      subjectId: "other",
      key: "last",
      value: { action: "view" },
      enabled: true,
    });
    const result = foundation.retrieve({
      queryId: "q4",
      text: "view action",
      subjectId: "user-1",
      limit: 5,
    });
    expect(result.hits).toHaveLength(0);
  });

  it("assembleFromQuery facade works", () => {
    const foundation = new AiKnowledgeMemoryFoundation();
    foundation.knowledge.register({
      knowledgeId: "k-creator",
      sourceKind: "creator_knowledge",
      title: "Creator tips",
      body: "Creators should label AI content.",
      tags: ["creator"],
      ownerId: null,
      enabled: true,
    });
    const ctx = foundation.assembleFromQuery("asm-2", {
      queryId: "q5",
      text: "creator AI",
      limit: 3,
    });
    expect(ctx.blocks.length).toBeGreaterThan(0);
    expect(ctx.knowledgeIds).toContain("k-creator");
  });

  it("rejects unknown knowledge id via require", () => {
    const registry = new AiKnowledgeRegistry();
    expect(() => registry.require("nope")).toThrow(AiPlatformError);
  });
});
