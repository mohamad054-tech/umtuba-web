import { afterEach, describe, expect, it, vi } from "vitest";
import { AiPlatformError } from "../contracts/errors";
import { loadAiPlatformConfig } from "../config";
import { createAnthropicAdapter } from "./anthropicAdapter";
import { createProviderFoundation } from "./foundation";
import { resolveProviderAdapters } from "./adapters";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const BASE_INPUT = {
  providerId: "anthropic",
  modelId: DEFAULT_MODEL,
  messages: [
    { role: "system" as const, content: "Return JSON only." },
    { role: "user" as const, content: "ping" },
  ],
  structured: true,
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

describe("createAnthropicAdapter", () => {
  it("fails closed without ANTHROPIC_API_KEY", async () => {
    const adapter = createAnthropicAdapter(
      loadAiPlatformConfig({
        mode: "live",
        anthropicApiKey: null,
        openaiApiKey: null,
        geminiApiKey: null,
        allowStub: false,
      })
    );
    await expect(adapter.execute(BASE_INPUT)).rejects.toMatchObject({
      code: "no_provider_configured",
    });
  });

  it("posts /messages with required headers/max_tokens and maps usage", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [
          { type: "text", text: JSON.stringify({ ok: true, message: "hi" }) },
        ],
        usage: {
          input_tokens: 11,
          output_tokens: 7,
          cache_read_input_tokens: 2,
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createAnthropicAdapter(
      loadAiPlatformConfig({
        mode: "live",
        anthropicApiKey: "secret-anthropic-key",
        anthropicBaseUrl: "https://api.anthropic.com/v1",
        anthropicDefaultModel: DEFAULT_MODEL,
        openaiApiKey: null,
        geminiApiKey: null,
        allowStub: false,
      })
    );

    const result = await adapter.execute(BASE_INPUT);
    expect(result.structured).toEqual({ ok: true, message: "hi" });
    expect(result.text).toBeNull();
    expect(result.usage.providerId).toBe("anthropic");
    expect(result.usage.inputTokens).toBe(11);
    expect(result.usage.outputTokens).toBe(7);
    expect(result.usage.cachedTokens).toBe(2);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-api-key"]).toBe("secret-anthropic-key");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(String(init.body)) as {
      model: string;
      max_tokens: number;
      system?: string;
      messages: Array<{ role: string }>;
      output_config?: unknown;
      stream?: boolean;
      temperature?: number;
    };
    expect(body.model).toBe(DEFAULT_MODEL);
    expect(body.max_tokens).toBe(4096);
    expect(body.max_tokens).toBeGreaterThan(0);
    expect(body.system).toBe("Return JSON only.");
    expect(body.messages[0]?.role).toBe("user");
    // Open-object json_schema is illegal (additionalProperties must be false).
    expect(body.output_config).toBeUndefined();
    expect(body.stream).toBeUndefined();
    expect(body.temperature).toBeUndefined();
  });

  it("fails closed on empty structured text content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          content: [],
        }),
      }))
    );
    const adapter = createAnthropicAdapter(
      loadAiPlatformConfig({
        mode: "live",
        anthropicApiKey: "secret-anthropic-key",
        openaiApiKey: null,
        geminiApiKey: null,
        allowStub: false,
      })
    );
    await expect(adapter.execute(BASE_INPUT)).rejects.toMatchObject({
      code: "invalid_structured_output",
    });
  });

  it("maps AbortError to timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        return await new Promise((_resolve, reject) => {
          const err = new Error("aborted");
          err.name = "AbortError";
          if (init?.signal?.aborted) {
            reject(err);
            return;
          }
          init?.signal?.addEventListener("abort", () => reject(err));
        });
      })
    );
    const adapter = createAnthropicAdapter(
      loadAiPlatformConfig({
        mode: "live",
        anthropicApiKey: "secret-anthropic-key",
        openaiApiKey: null,
        geminiApiKey: null,
        allowStub: false,
      })
    );
    await expect(
      adapter.execute({ ...BASE_INPUT, timeoutMs: 1 })
    ).rejects.toMatchObject({ code: "timeout" });
  });

  it("maps HTTP 429 to rate_limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 429,
        text: async () => "quota",
      }))
    );
    const adapter = createAnthropicAdapter(
      loadAiPlatformConfig({
        mode: "live",
        anthropicApiKey: "secret-anthropic-key",
        openaiApiKey: null,
        geminiApiKey: null,
        allowStub: false,
      })
    );
    await expect(adapter.execute(BASE_INPUT)).rejects.toBeInstanceOf(
      AiPlatformError
    );
    await expect(adapter.execute(BASE_INPUT)).rejects.toMatchObject({
      code: "rate_limited",
    });
  });

  it("maps non-JSON structured body to invalid_structured_output", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          content: [{ type: "text", text: "not-json" }],
        }),
      }))
    );
    const adapter = createAnthropicAdapter(
      loadAiPlatformConfig({
        mode: "live",
        anthropicApiKey: "secret-anthropic-key",
        openaiApiKey: null,
        geminiApiKey: null,
        allowStub: false,
      })
    );
    await expect(adapter.execute(BASE_INPUT)).rejects.toMatchObject({
      code: "invalid_structured_output",
    });
  });

  it("does not register adapter without key", () => {
    const adapters = resolveProviderAdapters(
      loadAiPlatformConfig({
        mode: "stub",
        allowStub: true,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
      })
    );
    expect(adapters.has("anthropic")).toBe(false);
  });

  it("keeps OpenAI, Gemini, and Anthropic interchangeable via preferred provider", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: false,
        openaiApiKey: "openai-key",
        geminiApiKey: "gemini-key",
        anthropicApiKey: "anthropic-key",
        openaiDefaultModel: "gpt-4o-mini",
        geminiDefaultModel: "gemini-2.5-flash",
        anthropicDefaultModel: DEFAULT_MODEL,
      })
    );
    expect(f.getAdapter("openai")?.providerId).toBe("openai");
    expect(f.getAdapter("gemini")?.providerId).toBe("gemini");
    expect(f.getAdapter("anthropic")?.providerId).toBe("anthropic");

    const anthropicRoute = f.resolveRoute({
      capabilityId: "platform.diagnostics_probe",
      preferredProviderId: "anthropic",
      preferredModelId: DEFAULT_MODEL,
      allowFallback: false,
      requiredModality: "text",
      requiresStructuredOutput: true,
      requiresTools: false,
      estimatedContextTokens: 100,
      dataClassification: "internal",
    });
    expect(anthropicRoute.providerId).toBe("anthropic");
    expect(anthropicRoute.modelId).toBe(DEFAULT_MODEL);
  });
});
