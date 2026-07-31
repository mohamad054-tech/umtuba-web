import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AiPlatformError,
  sanitizeAiErrorMessage,
} from "../contracts/errors";
import { loadAiPlatformConfig } from "../config";
import { createGeminiAdapter } from "./geminiAdapter";
import { createProviderFoundation } from "./foundation";
import { resolveProviderAdapters } from "./adapters";

/** Fixture secret for leak assertions only — never a real key. */
const FIXTURE_SECRET = "AIzaSyTestGeminiKeyDoNotLeak1234567890";

const BASE_INPUT = {
  providerId: "gemini",
  modelId: "gemini-2.5-flash",
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

describe("createGeminiAdapter", () => {
  it("fails closed without GEMINI_API_KEY", async () => {
    const adapter = createGeminiAdapter(
      loadAiPlatformConfig({
        mode: "live",
        geminiApiKey: null,
        openaiApiKey: null,
        allowStub: false,
      })
    );
    await expect(adapter.execute(BASE_INPUT)).rejects.toMatchObject({
      code: "no_provider_configured",
    });
  });

  it("posts generateContent with JSON mime type and maps usage", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ ok: true, message: "hi" }) }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 11,
          candidatesTokenCount: 7,
          cachedContentTokenCount: 2,
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createGeminiAdapter(
      loadAiPlatformConfig({
        mode: "live",
        geminiApiKey: "secret-gemini-key",
        geminiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
        geminiDefaultModel: "gemini-2.5-flash",
        openaiApiKey: null,
        allowStub: false,
      })
    );

    const result = await adapter.execute(BASE_INPUT);
    expect(result.structured).toEqual({ ok: true, message: "hi" });
    expect(result.text).toBeNull();
    expect(result.usage.providerId).toBe("gemini");
    expect(result.usage.inputTokens).toBe(11);
    expect(result.usage.outputTokens).toBe(7);
    expect(result.usage.cachedTokens).toBe(2);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toContain("/models/gemini-2.5-flash:generateContent");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      "secret-gemini-key"
    );
    const body = JSON.parse(String(init.body)) as {
      generationConfig: { responseMimeType?: string; temperature?: number };
      systemInstruction?: { parts: Array<{ text: string }> };
      contents: Array<{ role: string }>;
      stream?: boolean;
    };
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.temperature).toBe(0.3);
    expect(body.systemInstruction?.parts[0]?.text).toBe("Return JSON only.");
    expect(body.contents[0]?.role).toBe("user");
    expect(body.stream).toBeUndefined();
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
    const adapter = createGeminiAdapter(
      loadAiPlatformConfig({
        mode: "live",
        geminiApiKey: "secret-gemini-key",
        openaiApiKey: null,
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
          candidates: [{ content: { parts: [{ text: "not-json" }] } }],
        }),
      }))
    );
    const adapter = createGeminiAdapter(
      loadAiPlatformConfig({
        mode: "live",
        geminiApiKey: "secret-gemini-key",
        openaiApiKey: null,
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
      })
    );
    expect(adapters.has("gemini")).toBe(false);
  });

  it("keeps OpenAI and Gemini interchangeable via preferred provider", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: false,
        openaiApiKey: "openai-key",
        geminiApiKey: "gemini-key",
        openaiDefaultModel: "gpt-4o-mini",
        geminiDefaultModel: "gemini-2.5-flash",
      })
    );
    expect(f.getAdapter("openai")?.providerId).toBe("openai");
    expect(f.getAdapter("gemini")?.providerId).toBe("gemini");

    const openaiRoute = f.resolveRoute({
      capabilityId: "platform.diagnostics_probe",
      preferredProviderId: "openai",
      preferredModelId: "gpt-4o-mini",
      allowFallback: false,
      requiredModality: "text",
      requiresStructuredOutput: true,
      requiresTools: false,
      estimatedContextTokens: 100,
      dataClassification: "internal",
    });
    expect(openaiRoute.providerId).toBe("openai");

    const geminiRoute = f.resolveRoute({
      capabilityId: "platform.diagnostics_probe",
      preferredProviderId: "gemini",
      preferredModelId: "gemini-2.5-flash",
      allowFallback: false,
      requiredModality: "text",
      requiresStructuredOutput: true,
      requiresTools: false,
      estimatedContextTokens: 100,
      dataClassification: "internal",
    });
    expect(geminiRoute.providerId).toBe("gemini");
  });

  it("does not leak API key in URL, body, or sanitized errors", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 401,
      text: async () => `bad key ${FIXTURE_SECRET}`,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const adapter = createGeminiAdapter(
      loadAiPlatformConfig({
        mode: "live",
        geminiApiKey: FIXTURE_SECRET,
        openaiApiKey: null,
        allowStub: false,
      })
    );

    let thrown: unknown;
    try {
      await adapter.execute(BASE_INPUT);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(AiPlatformError);
    const message = String((thrown as Error).message);
    expect(message).not.toContain(FIXTURE_SECRET);
    expect(message.toLowerCase()).not.toContain("aiza");
    expect(
      sanitizeAiErrorMessage(`auth failed with ${FIXTURE_SECRET}`)
    ).not.toContain(FIXTURE_SECRET);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as unknown as
      | [string, RequestInit]
      | undefined;
    expect(call).toBeTruthy();
    const url = String(call?.[0] ?? "");
    const init = call?.[1] ?? {};
    expect(url).not.toContain(FIXTURE_SECRET);
    expect(url).not.toMatch(/[?&]key=/i);
    expect(String(init.body ?? "")).not.toContain(FIXTURE_SECRET);
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(
      FIXTURE_SECRET
    );
  });

  it("registers gemini adapter when key present without breaking openai/stub", () => {
    const both = resolveProviderAdapters(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: true,
        openaiApiKey: "sk-test-openai",
        geminiApiKey: FIXTURE_SECRET,
      })
    );
    expect(both.get("stub")?.providerId).toBe("stub");
    expect(both.get("openai")?.providerId).toBe("openai");
    expect(both.get("gemini")?.providerId).toBe("gemini");
  });
});

describe("Gemini live smoke (opt-in; do not use exposed keys)", () => {
  const enabled =
    process.env.UMTUBA_GEMINI_SMOKE === "1" &&
    Boolean(process.env.GEMINI_API_KEY?.trim());
  const smokeIt = enabled ? it : it.skip;

  smokeIt(
    "reaches Gemini generateContent without leaking the key",
    async () => {
      const key = process.env.GEMINI_API_KEY!.trim();
      const modelId =
        process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
      const adapter = createGeminiAdapter(
        loadAiPlatformConfig({
          mode: "live",
          openaiApiKey: null,
          geminiApiKey: key,
          geminiDefaultModel: modelId,
          allowStub: false,
          defaultTimeoutMs: 20_000,
        })
      );
      const result = await adapter.execute({
        ...BASE_INPUT,
        modelId,
        timeoutMs: 20_000,
        messages: [
          {
            role: "user",
            content: 'Reply with exactly: {"ok":true}',
          },
        ],
      });
      expect(result.structured).toBeTruthy();
      expect(JSON.stringify(result)).not.toContain(key);
      expect(result.usage.providerId).toBe("gemini");
    },
    25_000
  );
});
