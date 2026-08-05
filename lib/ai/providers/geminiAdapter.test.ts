import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAiPlatformConfig } from "../config";
import { AiPlatformError, sanitizeAiErrorMessage } from "../contracts/errors";
import {
  createGeminiAdapter,
  createStubAdapter,
  resolveProviderAdapters,
  type ProviderExecuteInput,
} from "./adapters";
import { createProviderFoundation } from "./foundation";

const SECRET = "AIzaSyTestGeminiKeyDoNotLeak1234567890";

function baseInput(
  overrides?: Partial<ProviderExecuteInput>
): ProviderExecuteInput {
  return {
    providerId: "gemini",
    modelId: "gemini-2.5-flash",
    messages: [
      { role: "system", content: "Be concise." },
      { role: "user", content: "Say hello" },
    ],
    structured: false,
    timeoutMs: 5_000,
    userId: "11111111-1111-4111-8111-111111111111",
    runId: "run-test",
    capabilityId: "platform.diagnostics_probe",
    workspaceId: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Gemini adapter wiring", () => {
  it("registers gemini adapter when GEMINI_API_KEY is present", () => {
    const config = loadAiPlatformConfig({
      mode: "live",
      openaiApiKey: null,
      geminiApiKey: SECRET,
      allowStub: false,
    });
    const adapters = resolveProviderAdapters(config);
    expect(adapters.has("gemini")).toBe(true);
    expect(adapters.get("gemini")?.providerId).toBe("gemini");
    expect(adapters.has("openai")).toBe(false);
  });

  it("fail-closes safely when GEMINI_API_KEY is absent", async () => {
    const config = loadAiPlatformConfig({
      mode: "live",
      openaiApiKey: null,
      geminiApiKey: null,
      allowStub: false,
    });
    expect(resolveProviderAdapters(config).has("gemini")).toBe(false);

    const adapter = createGeminiAdapter(config);
    await expect(adapter.execute(baseInput())).rejects.toMatchObject({
      code: "no_provider_configured",
    });
  });

  it("does not print or leak the API key in errors or JSON bodies", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: `bad key ${SECRET}` } }), {
        status: 401,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const config = loadAiPlatformConfig({
      mode: "live",
      openaiApiKey: null,
      geminiApiKey: SECRET,
      allowStub: false,
    });
    const adapter = createGeminiAdapter(config);

    let thrown: unknown;
    try {
      await adapter.execute(baseInput());
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(AiPlatformError);
    const message = String((thrown as Error).message);
    expect(message).not.toContain(SECRET);
    expect(message.toLowerCase()).not.toContain("aiza");
    expect(sanitizeAiErrorMessage(`auth failed with ${SECRET}`)).not.toContain(
      SECRET
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0] as unknown as
      | [string, RequestInit]
      | undefined;
    expect(call).toBeTruthy();
    const url = String(call?.[0] ?? "");
    const init = call?.[1] ?? {};
    expect(url).not.toContain(SECRET);
    expect(url).not.toMatch(/[?&]key=/i);
    const body = String(init.body ?? "");
    expect(body).not.toContain(SECRET);
    const headers = init.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe(SECRET);
    // Serialized error / debug surfaces must not echo the header value.
    expect(JSON.stringify({ url, body })).not.toContain(SECRET);
  });

  it("does not break stub/openai adapter resolution", () => {
    const both = resolveProviderAdapters(
      loadAiPlatformConfig({
        mode: "live",
        allowStub: true,
        openaiApiKey: "sk-test-openai",
        geminiApiKey: SECRET,
      })
    );
    expect(both.get("stub")?.providerId).toBe("stub");
    expect(both.get("openai")?.providerId).toBe("openai");
    expect(both.get("gemini")?.providerId).toBe("gemini");

    const stubOnly = resolveProviderAdapters(
      loadAiPlatformConfig({
        mode: "stub",
        allowStub: true,
        openaiApiKey: null,
        geminiApiKey: null,
      })
    );
    expect(stubOnly.has("stub")).toBe(true);
    expect(stubOnly.has("gemini")).toBe(false);
    expect(createStubAdapter().providerId).toBe("stub");
  });

  it("executes generateContent and maps usage (mocked)", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidates: [
            { content: { parts: [{ text: '{"ok":true,"message":"hi"}' }] } },
          ],
          usageMetadata: {
            promptTokenCount: 11,
            candidatesTokenCount: 5,
            cachedContentTokenCount: 2,
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const config = loadAiPlatformConfig({
      mode: "live",
      openaiApiKey: null,
      geminiApiKey: SECRET,
      geminiDefaultModel: "gemini-2.5-flash",
      allowStub: false,
    });
    const adapter = createGeminiAdapter(config);
    const result = await adapter.execute(
      baseInput({
        structured: true,
        messages: [{ role: "user", content: "ping" }],
      })
    );

    expect(result.structured).toEqual({ ok: true, message: "hi" });
    expect(result.text).toBeNull();
    expect(result.usage.providerId).toBe("gemini");
    expect(result.usage.modelId).toBe("gemini-2.5-flash");
    expect(result.usage.inputTokens).toBe(11);
    expect(result.usage.outputTokens).toBe(5);
    expect(result.usage.cachedTokens).toBe(2);

    const call = fetchMock.mock.calls[0] as unknown as
      | [string, RequestInit]
      | undefined;
    expect(call).toBeTruthy();
    const url = String(call?.[0] ?? "");
    const init = call?.[1] ?? {};
    expect(url).toContain("/models/gemini-2.5-flash:generateContent");
    const parsed = JSON.parse(String(init.body ?? "{}")) as {
      generationConfig: { responseMimeType?: string };
    };
    expect(parsed.generationConfig.responseMimeType).toBe("application/json");
  });

  it("foundation loads gemini model gemini-2.5-flash when key present", () => {
    const f = createProviderFoundation(
      loadAiPlatformConfig({
        mode: "live",
        openaiApiKey: null,
        geminiApiKey: SECRET,
        geminiDefaultModel: "gemini-2.5-flash",
        allowStub: false,
      })
    );
    expect(f.snapshot().executableProviderIds).toContain("gemini");
    expect(f.getModel("gemini", "gemini-2.5-flash")?.available).toBe(true);
  });
});

describe("Gemini live smoke (opt-in)", () => {
  const enabled =
    process.env.UMTUBA_GEMINI_SMOKE === "1" &&
    Boolean(process.env.GEMINI_API_KEY?.trim());

  const smokeIt = enabled ? it : it.skip;

  smokeIt(
    "reaches Gemini generateContent without leaking the key",
    async () => {
      const key = process.env.GEMINI_API_KEY!.trim();
      const config = loadAiPlatformConfig({
        mode: "live",
        openaiApiKey: null,
        geminiApiKey: key,
        allowStub: false,
        defaultTimeoutMs: 20_000,
      });
      const adapter = createGeminiAdapter(config);
      const result = await adapter.execute(
        baseInput({
          messages: [
            {
              role: "user",
              content: 'Reply with exactly: {"ok":true}',
            },
          ],
          structured: true,
          timeoutMs: 20_000,
        })
      );
      expect(result.structured).toBeTruthy();
      expect(JSON.stringify(result)).not.toContain(key);
      expect(result.usage.providerId).toBe("gemini");
    },
    25_000
  );
});
