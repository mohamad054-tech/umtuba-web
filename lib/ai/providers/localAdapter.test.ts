import { afterEach, describe, expect, it, vi } from "vitest";
import { AiPlatformError } from "../contracts/errors";
import { loadAiPlatformConfig } from "../config";
import { createLocalAdapter } from "./localAdapter";
import { createProviderFoundation } from "./foundation";
import { resolveProviderAdapters } from "./adapters";

const OPERATOR_MODEL = "operator-hosted-model";

const BASE_INPUT = {
  providerId: "local",
  modelId: OPERATOR_MODEL,
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

describe("createLocalAdapter", () => {
  it("fails closed without LOCAL_AI_BASE_URL", async () => {
    const adapter = createLocalAdapter(
      loadAiPlatformConfig({
        mode: "live",
        localBaseUrl: null,
        localDefaultModel: OPERATOR_MODEL,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
        allowStub: false,
      })
    );
    await expect(adapter.execute(BASE_INPUT)).rejects.toMatchObject({
      code: "no_provider_configured",
    });
  });

  it("posts OpenAI-compatible chat/completions and maps usage", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ ok: true, message: "local" }),
            },
          },
        ],
        usage: {
          prompt_tokens: 9,
          completion_tokens: 4,
          prompt_tokens_details: { cached_tokens: 1 },
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createLocalAdapter(
      loadAiPlatformConfig({
        mode: "live",
        localBaseUrl: "http://127.0.0.1:11434/v1",
        localDefaultModel: OPERATOR_MODEL,
        localApiKey: "local-secret",
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
        allowStub: false,
      })
    );

    const result = await adapter.execute(BASE_INPUT);
    expect(result.structured).toEqual({ ok: true, message: "local" });
    expect(result.text).toBeNull();
    expect(result.usage.providerId).toBe("local");
    expect(result.usage.inputTokens).toBe(9);
    expect(result.usage.outputTokens).toBe(4);
    expect(result.usage.cachedTokens).toBe(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("http://127.0.0.1:11434/v1/chat/completions");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    expect(headers.authorization).toBe("Bearer local-secret");
    const body = JSON.parse(String(init.body)) as {
      model: string;
      response_format?: unknown;
      stream?: boolean;
    };
    expect(body.model).toBe(OPERATOR_MODEL);
    expect(body.response_format).toBeUndefined();
    expect(body.stream).toBeUndefined();
  });

  it("maps HTTP 429 to rate_limited", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 429,
        text: async () => "busy",
      }))
    );
    const adapter = createLocalAdapter(
      loadAiPlatformConfig({
        mode: "live",
        localBaseUrl: "http://127.0.0.1:11434/v1",
        localDefaultModel: OPERATOR_MODEL,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
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
          choices: [{ message: { content: "not-json" } }],
        }),
      }))
    );
    const adapter = createLocalAdapter(
      loadAiPlatformConfig({
        mode: "live",
        localBaseUrl: "http://127.0.0.1:11434/v1",
        localDefaultModel: OPERATOR_MODEL,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
        allowStub: false,
      })
    );
    await expect(adapter.execute(BASE_INPUT)).rejects.toMatchObject({
      code: "invalid_structured_output",
    });
  });

  it("does not register adapter without base URL + model", () => {
    const adapters = resolveProviderAdapters(
      loadAiPlatformConfig({
        mode: "stub",
        allowStub: true,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
        localBaseUrl: null,
        localDefaultModel: null,
      })
    );
    expect(adapters.has("local")).toBe(false);
  });

  it("selects local via preferred provider when configured", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: false,
        openaiApiKey: null,
        geminiApiKey: null,
        anthropicApiKey: null,
        localBaseUrl: "http://127.0.0.1:1234/v1",
        localDefaultModel: OPERATOR_MODEL,
      })
    );
    const route = f.resolveRoute({
      capabilityId: "platform.diagnostics_probe",
      preferredProviderId: "local",
      preferredModelId: OPERATOR_MODEL,
      allowFallback: false,
      requiredModality: "text",
      requiresStructuredOutput: true,
      requiresTools: false,
      estimatedContextTokens: 100,
      dataClassification: "internal",
    });
    expect(route.providerId).toBe("local");
    expect(route.modelId).toBe(OPERATOR_MODEL);
  });
});
