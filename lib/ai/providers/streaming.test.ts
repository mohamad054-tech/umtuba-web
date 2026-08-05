/**
 * Provider Streaming Foundation V1 — unit tests (mocked SSE / no live keys).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { AiPlatformError } from "../contracts/errors";
import { loadAiPlatformConfig } from "../config";
import { buildProviderRegistry } from "../models/registry";
import {
  createOpenAiCompatibleAdapter,
  createStubAdapter,
} from "./adapters";
import { createAnthropicAdapter } from "./anthropicAdapter";
import { createGeminiAdapter } from "./geminiAdapter";
import { createLocalAdapter } from "./localAdapter";
import { createProviderFoundation } from "./foundation";
import {
  assertStreamingAllowed,
  encodeSseFixture,
  iterateAnthropicSse,
  iterateGeminiSse,
  iterateOpenAiCompatibleSse,
} from "./streaming";

const BASE_INPUT = {
  providerId: "openai",
  modelId: "gpt-4o-mini",
  messages: [{ role: "user" as const, content: "hello stream" }],
  structured: false,
  timeoutMs: 5_000,
  userId: "11111111-1111-4111-8111-111111111111",
  runId: "22222222-2222-4222-8222-222222222222",
  capabilityId: "platform.diagnostics_probe",
  workspaceId: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("assertStreamingAllowed", () => {
  it("fails closed when streaming gate is OFF", () => {
    expect(() =>
      assertStreamingAllowed({ streamingEnabled: false, structured: false })
    ).toThrow(AiPlatformError);
    try {
      assertStreamingAllowed({ streamingEnabled: false, structured: false });
    } catch (e) {
      expect((e as AiPlatformError).code).toBe("streaming_unsupported");
    }
  });

  it("rejects structured-output streaming", () => {
    try {
      assertStreamingAllowed({ streamingEnabled: true, structured: true });
      expect.unreachable();
    } catch (e) {
      expect((e as AiPlatformError).code).toBe("streaming_unsupported");
    }
  });
});

describe("SSE parsers", () => {
  it("parses OpenAI-compatible chat.completion.chunk deltas", async () => {
    const body = encodeSseFixture([
      'data: {"choices":[{"delta":{"content":"Hel"}}]}',
      'data: {"choices":[{"delta":{"content":"lo"}}]}',
      "data: [DONE]",
    ]);
    const parts: string[] = [];
    for await (const d of iterateOpenAiCompatibleSse(body)) parts.push(d);
    expect(parts.join("")).toBe("Hello");
  });

  it("parses Anthropic content_block_delta text", async () => {
    const body = encodeSseFixture([
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"!"}}',
    ]);
    const parts: string[] = [];
    for await (const d of iterateAnthropicSse(body)) parts.push(d);
    expect(parts.join("")).toBe("Hi!");
  });

  it("parses Gemini streamGenerateContent SSE", async () => {
    const body = encodeSseFixture([
      'data: {"candidates":[{"content":{"parts":[{"text":"Ge"}]}}]}',
      'data: {"candidates":[{"content":{"parts":[{"text":"mini"}]}}]}',
    ]);
    const parts: string[] = [];
    for await (const d of iterateGeminiSse(body)) parts.push(d);
    expect(parts.join("")).toBe("Gemini");
  });
});

describe("adapter.stream fail-closed / happy path", () => {
  it("stub stream fails when gate OFF", async () => {
    const adapter = createStubAdapter({ streamingEnabled: false });
    expect(adapter.streamingSupport).toBe(false);
    await expect(async () => {
      const gen = adapter.stream!(BASE_INPUT);
      await gen.next();
    }).rejects.toMatchObject({ code: "streaming_unsupported" });
  });

  it("stub stream yields deltas when gate ON", async () => {
    const adapter = createStubAdapter({ streamingEnabled: true });
    expect(adapter.streamingSupport).toBe(true);
    const events = [];
    for await (const ev of adapter.stream!(BASE_INPUT)) events.push(ev);
    expect(events.some((e) => e.type === "delta")).toBe(true);
    expect(events.at(-1)?.type).toBe("completed");
  });

  it("openai stream uses SSE body when gate ON", async () => {
    const sse = encodeSseFixture([
      'data: {"choices":[{"delta":{"content":"A"}}]}',
      'data: {"choices":[{"delta":{"content":"B"}}]}',
      "data: [DONE]",
    ]);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      body: sse,
      text: async () => "",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createOpenAiCompatibleAdapter(
      loadAiPlatformConfig({
        mode: "live",
        openaiApiKey: "sk-test",
        streamingEnabled: true,
        allowStub: false,
      })
    );
    const events = [];
    for await (const ev of adapter.stream!({
      ...BASE_INPUT,
      providerId: "openai",
    })) {
      events.push(ev);
    }
    expect(events.filter((e) => e.type === "delta").map((e) => (e as { text: string }).text).join("")).toBe(
      "AB"
    );
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { stream?: boolean };
    expect(body.stream).toBe(true);
  });

  it("anthropic stream posts stream:true when gate ON", async () => {
    const sse = encodeSseFixture([
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}',
    ]);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      body: sse,
      text: async () => "",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createAnthropicAdapter(
      loadAiPlatformConfig({
        mode: "live",
        anthropicApiKey: "anthropic-test",
        openaiApiKey: null,
        geminiApiKey: null,
        streamingEnabled: true,
        allowStub: false,
      })
    );
    const events = [];
    for await (const ev of adapter.stream!({
      ...BASE_INPUT,
      providerId: "anthropic",
      modelId: "claude-haiku-4-5-20251001",
      messages: [
        { role: "user", content: "ping" },
      ],
    })) {
      events.push(ev);
    }
    expect(events.some((e) => e.type === "delta")).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).stream).toBe(true);
  });

  it("gemini stream hits streamGenerateContent when gate ON", async () => {
    const sse = encodeSseFixture([
      'data: {"candidates":[{"content":{"parts":[{"text":"g"}]}}]}',
    ]);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      body: sse,
      text: async () => "",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createGeminiAdapter(
      loadAiPlatformConfig({
        mode: "live",
        geminiApiKey: "gemini-test",
        openaiApiKey: null,
        anthropicApiKey: null,
        streamingEnabled: true,
        allowStub: false,
      })
    );
    const events = [];
    for await (const ev of adapter.stream!({
      ...BASE_INPUT,
      providerId: "gemini",
      modelId: "gemini-2.5-flash",
    })) {
      events.push(ev);
    }
    expect(events.some((e) => e.type === "delta")).toBe(true);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain(":streamGenerateContent");
  });

  it("local stream uses OpenAI-compatible SSE when gate ON", async () => {
    const sse = encodeSseFixture([
      'data: {"choices":[{"delta":{"content":"L"}}]}',
      "data: [DONE]",
    ]);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      body: sse,
      text: async () => "",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createLocalAdapter(
      loadAiPlatformConfig({
        mode: "live",
        localBaseUrl: "http://127.0.0.1:11434/v1",
        localDefaultModel: "llama-test",
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
        streamingEnabled: true,
        allowStub: false,
      })
    );
    const events = [];
    for await (const ev of adapter.stream!({
      ...BASE_INPUT,
      providerId: "local",
      modelId: "llama-test",
    })) {
      events.push(ev);
    }
    expect(events.at(-1)?.type).toBe("completed");
  });
});

describe("config + registry streaming gate", () => {
  it("loadAiPlatformConfig defaults streamingEnabled false", () => {
    const cfg = loadAiPlatformConfig({ allowStub: true });
    expect(cfg.streamingEnabled).toBe(false);
  });

  it("registry mirrors streamingEnabled onto models", () => {
    const off = buildProviderRegistry({
      openaiConfigured: true,
      stubEligible: true,
      openaiDefaultModel: "gpt-4o-mini",
      defaultTimeoutMs: 1000,
      streamingEnabled: false,
    });
    expect(off.flatMap((p) => p.models).every((m) => !m.streamingSupport)).toBe(
      true
    );

    const on = buildProviderRegistry({
      openaiConfigured: true,
      stubEligible: true,
      openaiDefaultModel: "gpt-4o-mini",
      defaultTimeoutMs: 1000,
      streamingEnabled: true,
    });
    expect(on.flatMap((p) => p.models).every((m) => m.streamingSupport)).toBe(
      true
    );
  });

  it("foundation adapter streamingSupport follows config", () => {
    const foundation = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "stub",
        allowStub: true,
        streamingEnabled: true,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
      })
    );
    const stub = foundation.getAdapter("stub");
    expect(stub?.streamingSupport).toBe(true);
  });
});
