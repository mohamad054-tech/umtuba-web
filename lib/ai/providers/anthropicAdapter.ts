/**
 * Anthropic Claude provider adapter (Shared AI Core).
 *
 * Implements AiProviderAdapter via Anthropic Messages REST API.
 * No streaming. Structured JSON via prompt-steered JSON + fail-closed parse
 * (open-object output_config schemas are rejected by Anthropic).
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

type AnthropicContentBlock = {
  type?: string;
  text?: string;
};

type AnthropicMessagesResponse = {
  content?: AnthropicContentBlock[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
  };
  error?: { type?: string; message?: string };
};

function mapChatMessages(messages: ProviderChatMessage[]): {
  system: string | undefined;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
} {
  const systemParts: string[] = [];
  const mapped: Array<{ role: "user" | "assistant"; content: string }> = [];

  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(message.content);
      continue;
    }
    mapped.push({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    });
  }

  return {
    system: systemParts.length > 0 ? systemParts.join("\n\n") : undefined,
    messages: mapped,
  };
}

function extractText(response: AnthropicMessagesResponse): string {
  const blocks = response.content ?? [];
  return blocks
    .filter((block) => block.type === "text" || typeof block.text === "string")
    .map((block) => (typeof block.text === "string" ? block.text : ""))
    .join("")
    .trim();
}

export function createAnthropicAdapter(
  config: AiPlatformConfig
): AiProviderAdapter {
  return {
    providerId: "anthropic",
    async execute(input: ProviderExecuteInput): Promise<ProviderExecuteResult> {
      if (!config.anthropicApiKey) {
        throw new AiPlatformError(
          "no_provider_configured",
          "ANTHROPIC_API_KEY is not configured."
        );
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), input.timeoutMs);

      try {
        const mapped = mapChatMessages(input.messages);
        if (mapped.messages.length === 0) {
          throw new AiPlatformError(
            "invalid_input",
            "Anthropic request requires at least one user or assistant message."
          );
        }

        // Messages body: model + max_tokens (required, positive) + messages.
        // Structured JSON: do NOT send output_config with an open object schema.
        // Official Anthropic structured outputs require additionalProperties:false
        // on every object; an unconstrained object schema is rejected (HTTP 400).
        // Capability-specific schemas are not available on ProviderExecuteInput,
        // so we steer JSON via existing gateway prompts and fail-closed on parse.
        const body: Record<string, unknown> = {
          model: input.modelId,
          max_tokens: 4096,
          messages: mapped.messages,
        };
        if (mapped.system) {
          body.system = mapped.system;
        }

        const base = config.anthropicBaseUrl.replace(/\/$/, "");
        const res = await fetch(`${base}/messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": config.anthropicApiKey,
            "anthropic-version": "2023-06-01",
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

        const json = (await res.json()) as AnthropicMessagesResponse;
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
            inputTokens: json.usage?.input_tokens ?? null,
            outputTokens: json.usage?.output_tokens ?? null,
            cachedTokens: json.usage?.cache_read_input_tokens ?? null,
            audioUnits: null,
            imageUnits: null,
            costMinor: null,
            costCurrency: null,
            costStatus: "unavailable",
            modelId: input.modelId,
            providerId: "anthropic",
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
