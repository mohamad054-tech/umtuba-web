/**
 * Local / self-hosted provider adapter (Shared AI Core).
 *
 * OpenAI-compatible Chat Completions against an operator-configured base URL
 * (Ollama OpenAI compat, LM Studio, vLLM, llama.cpp server, etc.).
 * No streaming. Structured JSON via prompt-steered parse (many local servers
 * do not reliably support response_format).
 * Fail-closed without LOCAL_AI_BASE_URL (+ model supplied on the request).
 */

import { AiPlatformError, sanitizeAiErrorMessage } from "../contracts/errors";
import type { AiPlatformConfig } from "../config";
import type {
  AiProviderAdapter,
  ProviderExecuteInput,
  ProviderExecuteResult,
} from "./adapters";

export function createLocalAdapter(config: AiPlatformConfig): AiProviderAdapter {
  return {
    providerId: "local",
    async execute(input: ProviderExecuteInput): Promise<ProviderExecuteResult> {
      const baseUrl = config.localBaseUrl?.replace(/\/$/, "") ?? null;
      if (!baseUrl) {
        throw new AiPlatformError(
          "no_provider_configured",
          "LOCAL_AI_BASE_URL is not configured."
        );
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), input.timeoutMs);

      try {
        const body: Record<string, unknown> = {
          model: input.modelId,
          messages: input.messages,
          temperature: 0.3,
        };
        // Intentionally omit response_format — local OpenAI-compatible servers
        // vary widely; gateway prompts already request JSON when structured.

        const headers: Record<string, string> = {
          "content-type": "application/json",
        };
        if (config.localApiKey) {
          headers.authorization = `Bearer ${config.localApiKey}`;
        }

        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
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

        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            prompt_tokens_details?: { cached_tokens?: number };
          };
          error?: { message?: string };
        };

        if (json.error?.message) {
          throw new AiPlatformError(
            "provider_error",
            sanitizeAiErrorMessage(json.error.message)
          );
        }

        const content = json.choices?.[0]?.message?.content ?? "";
        let structured: Record<string, unknown> | null = null;
        let text: string | null = content || null;

        if (input.structured) {
          if (!content.trim()) {
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
            inputTokens: json.usage?.prompt_tokens ?? null,
            outputTokens: json.usage?.completion_tokens ?? null,
            cachedTokens:
              json.usage?.prompt_tokens_details?.cached_tokens ?? null,
            audioUnits: null,
            imageUnits: null,
            costMinor: null,
            costCurrency: null,
            costStatus: "unavailable",
            modelId: input.modelId,
            providerId: "local",
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
