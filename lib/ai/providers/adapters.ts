import type { AiUsageRecord } from "../types";
import { AiPlatformError, sanitizeAiErrorMessage } from "../errors";
import type { AiPlatformConfig } from "../config";

export type ProviderChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ProviderExecuteInput = {
  providerId: string;
  modelId: string;
  messages: ProviderChatMessage[];
  structured: boolean;
  timeoutMs: number;
  userId: string;
  runId: string;
  capabilityId: string;
  workspaceId: string | null;
};

export type ProviderExecuteResult = {
  text: string | null;
  structured: Record<string, unknown> | null;
  usage: Omit<
    AiUsageRecord,
    "capabilityId" | "userId" | "workspaceId" | "runId" | "billingClassification"
  >;
};

export type AiProviderAdapter = {
  providerId: string;
  execute: (input: ProviderExecuteInput) => Promise<ProviderExecuteResult>;
};

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function createStubAdapter(): AiProviderAdapter {
  return {
    providerId: "stub",
    async execute(input) {
      const user = input.messages.find((m) => m.role === "user")?.content ?? "";
      const titleSeed =
        user.match(/title[:\s]+([^\n]+)/i)?.[1]?.trim() ||
        user.slice(0, 60).trim() ||
        "Improved product title";
      if (input.capabilityId === "platform.diagnostics_probe") {
        return {
          text: null,
          structured: {
            ok: true,
            message: "AI gateway stub is reachable.",
          },
          usage: {
            inputTokens: estimateTokens(user),
            outputTokens: 12,
            cachedTokens: 0,
            audioUnits: null,
            imageUnits: null,
            costMinor: 0,
            costCurrency: "USD",
            costStatus: "provider_reported",
            modelId: input.modelId,
            providerId: "stub",
          },
        };
      }
      const structured = {
        title: titleSeed.slice(0, 120),
        description:
          `AI suggestion (stub): refine this listing for clarity and trust. Based on: ${user.slice(0, 400)}`.slice(
            0,
            4000
          ),
        tags: ["umtuba", "draft", "suggestion"].slice(0, 8),
        seoTitle: titleSeed.slice(0, 70),
        seoDescription: `Discover ${titleSeed.slice(0, 40)} on UMTUBA.`.slice(
          0,
          160
        ),
      };
      return {
        text: null,
        structured,
        usage: {
          inputTokens: estimateTokens(user),
          outputTokens: estimateTokens(JSON.stringify(structured)),
          cachedTokens: 0,
          audioUnits: null,
          imageUnits: null,
          costMinor: 0,
          costCurrency: "USD",
          costStatus: "provider_reported",
          modelId: input.modelId,
          providerId: "stub",
        },
      };
    },
  };
}

export function createOpenAiCompatibleAdapter(
  config: AiPlatformConfig
): AiProviderAdapter {
  return {
    providerId: "openai",
    async execute(input) {
      if (!config.openaiApiKey) {
        throw new AiPlatformError(
          "no_provider_configured",
          "OPENAI_API_KEY is not configured."
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
        if (input.structured) {
          body.response_format = { type: "json_object" };
        }
        const res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.openaiApiKey}`,
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
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            prompt_tokens_details?: { cached_tokens?: number };
          };
        };
        const content = json.choices?.[0]?.message?.content ?? "";
        let structured: Record<string, unknown> | null = null;
        let text: string | null = content || null;
        if (input.structured) {
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
        const inputTokens = json.usage?.prompt_tokens ?? null;
        const outputTokens = json.usage?.completion_tokens ?? null;
        const cachedTokens =
          json.usage?.prompt_tokens_details?.cached_tokens ?? null;
        return {
          text,
          structured,
          usage: {
            inputTokens,
            outputTokens,
            cachedTokens,
            audioUnits: null,
            imageUnits: null,
            costMinor: null,
            costCurrency: null,
            costStatus: "unavailable",
            modelId: input.modelId,
            providerId: "openai",
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

export function resolveProviderAdapters(
  config: AiPlatformConfig
): Map<string, AiProviderAdapter> {
  const map = new Map<string, AiProviderAdapter>();
  if (config.allowStub || config.mode === "stub") {
    map.set("stub", createStubAdapter());
  }
  if (config.openaiApiKey) {
    map.set("openai", createOpenAiCompatibleAdapter(config));
  }
  return map;
}
