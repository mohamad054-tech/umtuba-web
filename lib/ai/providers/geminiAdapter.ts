/**
 * Google Gemini provider adapter (Shared AI Core).
 *
 * Implements AiProviderAdapter via Gemini generateContent REST.
 * Streaming via streamGenerateContent SSE when UMTUBA_AI_STREAMING is enabled.
 * Structured JSON via responseMimeType=application/json.
 * Fail-closed: missing key / HTTP errors map to AiPlatformError codes.
 */

import { AiPlatformError, sanitizeAiErrorMessage } from "../contracts/errors";
import type { AiPlatformConfig } from "../config";
import type {
  AiProviderAdapter,
  ProviderChatMessage,
  ProviderExecuteInput,
  ProviderExecuteResult,
} from "./adapters";
import {
  assertStreamingAllowed,
  iterateGeminiSse,
} from "./streaming";

type GeminiPart = { text?: string };
type GeminiContent = { role?: string; parts?: GeminiPart[] };

type GeminiGenerateResponse = {
  candidates?: Array<{
    content?: GeminiContent;
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
    cachedContentTokenCount?: number;
  };
  error?: { message?: string; status?: string; code?: number };
};

function mapChatMessages(messages: ProviderChatMessage[]): {
  systemInstruction: { parts: GeminiPart[] } | undefined;
  contents: GeminiContent[];
} {
  const systemParts: GeminiPart[] = [];
  const contents: GeminiContent[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push({ text: message.content });
      continue;
    }
    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    });
  }

  return {
    systemInstruction:
      systemParts.length > 0 ? { parts: systemParts } : undefined,
    contents,
  };
}

function extractText(response: GeminiGenerateResponse): string {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

export function createGeminiAdapter(config: AiPlatformConfig): AiProviderAdapter {
  const streamingEnabled = Boolean(config.streamingEnabled);
  return {
    providerId: "gemini",
    streamingSupport: streamingEnabled,
    async execute(input: ProviderExecuteInput): Promise<ProviderExecuteResult> {
      if (!config.geminiApiKey) {
        throw new AiPlatformError(
          "no_provider_configured",
          "GEMINI_API_KEY is not configured."
        );
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), input.timeoutMs);

      try {
        const { systemInstruction, contents } = mapChatMessages(input.messages);
        if (contents.length === 0) {
          throw new AiPlatformError(
            "invalid_input",
            "Gemini request requires at least one user or assistant message."
          );
        }

        const generationConfig: Record<string, unknown> = {
          temperature: 0.3,
        };
        if (input.structured) {
          generationConfig.responseMimeType = "application/json";
        }

        const body: Record<string, unknown> = {
          contents,
          generationConfig,
        };
        if (systemInstruction) {
          body.systemInstruction = systemInstruction;
        }

        const base = config.geminiBaseUrl.replace(/\/$/, "");
        const url = `${base}/models/${encodeURIComponent(input.modelId)}:generateContent`;

        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": config.geminiApiKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          if (res.status === 429) {
            throw new AiPlatformError("rate_limited", "Provider rate limited.");
          }
          throw new AiPlatformError(
            "provider_error",
            sanitizeAiErrorMessage(errText || `Provider HTTP ${res.status}`)
          );
        }

        const json = (await res.json()) as GeminiGenerateResponse;
        if (json.error?.message) {
          throw new AiPlatformError(
            "provider_error",
            sanitizeAiErrorMessage(json.error.message)
          );
        }

        const content = extractText(json);
        let structured: Record<string, unknown> | null = null;
        let text: string | null = content || null;

        if (input.structured) {
          if (!content) {
            throw new AiPlatformError(
              "invalid_structured_output",
              "Provider returned empty structured output."
            );
          }
          try {
            structured = JSON.parse(content) as Record<string, unknown>;
            text = null;
          } catch {
            throw new AiPlatformError(
              "invalid_structured_output",
              "Provider returned non-JSON structured output."
            );
          }
        }

        return {
          text,
          structured,
          usage: {
            inputTokens: json.usageMetadata?.promptTokenCount ?? null,
            outputTokens: json.usageMetadata?.candidatesTokenCount ?? null,
            cachedTokens: json.usageMetadata?.cachedContentTokenCount ?? null,
            audioUnits: null,
            imageUnits: null,
            costMinor: null,
            costCurrency: null,
            costStatus: "unavailable",
            modelId: input.modelId,
            providerId: "gemini",
          },
        };
      } catch (error) {
        if (error instanceof AiPlatformError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new AiPlatformError("timeout", "AI provider timed out.");
        }
        throw new AiPlatformError(
          "provider_unavailable",
          sanitizeAiErrorMessage(
            error instanceof Error ? error.message : "Provider unavailable"
          )
        );
      } finally {
        clearTimeout(timer);
      }
    },
    async *stream(input: ProviderExecuteInput) {
      assertStreamingAllowed({
        streamingEnabled,
        structured: input.structured,
      });
      if (!config.geminiApiKey) {
        throw new AiPlatformError(
          "no_provider_configured",
          "GEMINI_API_KEY is not configured."
        );
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), input.timeoutMs);
      let assembled = "";
      try {
        const { systemInstruction, contents } = mapChatMessages(input.messages);
        if (contents.length === 0) {
          throw new AiPlatformError(
            "invalid_input",
            "Gemini request requires at least one user or assistant message."
          );
        }
        const body: Record<string, unknown> = {
          contents,
          generationConfig: { temperature: 0.3 },
        };
        if (systemInstruction) body.systemInstruction = systemInstruction;
        const base = config.geminiBaseUrl.replace(/\/+$/, "");
        const url = `${base}/models/${encodeURIComponent(input.modelId)}:streamGenerateContent?alt=sse`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": config.geminiApiKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          if (res.status === 429) {
            throw new AiPlatformError("rate_limited", "Provider rate limited.");
          }
          throw new AiPlatformError(
            "provider_error",
            sanitizeAiErrorMessage(errText || `Provider HTTP ${res.status}`)
          );
        }
        for await (const delta of iterateGeminiSse(res.body, controller.signal)) {
          assembled += delta;
          yield { type: "delta", text: delta };
        }
        yield {
          type: "completed",
          text: assembled,
          usage: {
            inputTokens: null,
            outputTokens: null,
            cachedTokens: null,
          },
        };
      } catch (error) {
        if (error instanceof AiPlatformError) throw error;
        if (error instanceof Error && error.name === "AbortError") {
          throw new AiPlatformError("timeout", "AI provider timed out.");
        }
        throw new AiPlatformError(
          "provider_unavailable",
          sanitizeAiErrorMessage(
            error instanceof Error ? error.message : "Provider unavailable"
          )
        );
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
