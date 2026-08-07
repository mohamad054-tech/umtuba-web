import type { AiUsageRecord } from "../contracts/types";
import { AiPlatformError, sanitizeAiErrorMessage } from "../contracts/errors";
import {
  isLocalProviderConfigured,
  type AiPlatformConfig,
} from "../config";
import { createAnthropicAdapter } from "./anthropicAdapter";
import { createLocalAdapter } from "./localAdapter";
import {
  assertStreamingAllowed,
  iterateOpenAiCompatibleSse,
  iterateGeminiSse,
  type ProviderStreamEvent,
} from "./streaming";

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
  /** True when stream() is available and operator streaming gate is ON. */
  streamingSupport: boolean;
  execute: (input: ProviderExecuteInput) => Promise<ProviderExecuteResult>;
  stream?: (
    input: ProviderExecuteInput
  ) => AsyncGenerator<ProviderStreamEvent, void, unknown>;
};

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function createStubAdapter(options?: {
  streamingEnabled?: boolean;
}): AiProviderAdapter {
  const streamingEnabled = Boolean(options?.streamingEnabled);
  return {
    providerId: "stub",
    streamingSupport: streamingEnabled,
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
      if (input.capabilityId === "platform.translation_suggest") {
        return {
          text: null,
          structured: {
            candidateText: `[stub] ${user.slice(0, 200) || "translation"}`,
            confidence: 0.42,
            notes: "Stub translation_suggest — human review required.",
          },
          usage: {
            inputTokens: estimateTokens(user),
            outputTokens: 24,
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
      if (input.capabilityId === "platform.translation_professional_generate") {
        let sourceText = user.slice(0, 200) || "Back";
        let targetLocale = "ar";
        try {
          const jsonStart = user.indexOf("{");
          const jsonEnd = user.lastIndexOf("}");
          const blob =
            jsonStart >= 0 && jsonEnd > jsonStart
              ? user.slice(jsonStart, jsonEnd + 1)
              : user;
          const parsed = JSON.parse(blob) as Record<string, unknown>;
          if (typeof parsed.sourceText === "string") sourceText = parsed.sourceText;
          if (typeof parsed.targetLocale === "string") targetLocale = parsed.targetLocale;
        } catch {
          // user may be wrapped with notes
        }
        const phraseMap: Record<string, string> = {
          back: "رجوع",
          cancel: "إلغاء",
          refund: "استرداد",
        };
        const candidate =
          targetLocale === "ar"
            ? phraseMap[sourceText.trim().toLowerCase()] ??
              `[${targetLocale}] ${sourceText}`
            : `[${targetLocale}] ${sourceText}`;
        return {
          text: null,
          structured: {
            schemaVersion: 1,
            candidateText: candidate,
            terminologyDecisions: [],
            conciseNotes: "Stub professional generate — not a live provider.",
            confidence: 0.55,
            provider: { providerId: "stub", modelId: input.modelId },
          },
          usage: {
            inputTokens: estimateTokens(user),
            outputTokens: 48,
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
      if (input.capabilityId === "platform.translation_professional_review") {
        return {
          text: null,
          structured: {
            schemaVersion: 1,
            dimensionScores: {
              semantic_accuracy: 90,
              terminology_compliance: 100,
              contextual_fit: 88,
              fluency_naturalness: 90,
              ui_conciseness: 92,
              consistency: 90,
              grammar_spelling: 90,
              locale_conventions: 88,
              placeholder_integrity: 100,
              formatting_integrity: 100,
            },
            findings: [
              {
                severity: "info",
                dimension: "semantic_accuracy",
                message: "Stub professional reviewer — independent of generator.",
              },
            ],
            confidence: 0.5,
            provider: { providerId: "stub", modelId: input.modelId },
          },
          usage: {
            inputTokens: estimateTokens(user),
            outputTokens: 64,
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
      if (input.capabilityId === "assistant.runtime_turn") {
        const skillMatch = user.match(/skillId=([a-z_]+)/i);
        const skillId = skillMatch?.[1]?.trim() || "assistant";
        const messageMatch = user.match(/message=([^\n]+)/i);
        const message = messageMatch?.[1]?.trim() || "your request";
        return {
          text: null,
          structured: {
            content: `UMTUBA Assistant (${skillId}) received: ${message.slice(0, 240)}`,
          },
          usage: {
            inputTokens: estimateTokens(user),
            outputTokens: 24,
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
      if (String(input.capabilityId).startsWith("learning.tutor.")) {
        const lessonMatch = user.match(/Lesson:\s*([^\n]+)/i);
        const lessonName = lessonMatch?.[1]?.trim() || "this lesson";
        const outside = /outside the (course|lesson|material)/i.test(user);
        const commonRefs = [
          { type: "lesson", id: "lesson-stub", label: lessonName },
        ];
        let structured: Record<string, unknown>;
        if (input.capabilityId === "learning.tutor.summarize_lesson") {
          structured = {
            keyIdeas: [`Core ideas from ${lessonName}`],
            definitions: ["Key term (stub)"],
            mainExamples: ["Example from authorized material (stub)"],
            reviewPoints: ["Review the published blocks"],
            suggestedNextStep: "Re-read the lesson activities, then try practice.",
            sourceReferences: commonRefs,
            groundingStatus: outside ? "outside_material" : "grounded",
            limitations: ["Stub provider — not live model output."],
          };
        } else if (input.capabilityId === "learning.tutor.answer_question") {
          structured = {
            answer: outside
              ? "That question is outside the authorized lesson material provided."
              : `Based on ${lessonName}, here is a teaching-oriented explanation (stub).`,
            groundingStatus: outside ? "outside_material" : "grounded",
            sourceReferences: commonRefs,
            limitations: ["Stub provider — not live model output."],
            confidence: outside ? "low" : "medium",
          };
        } else if (input.capabilityId === "learning.tutor.generate_practice") {
          structured = {
            items: [
              {
                type: "concept_check",
                prompt: `What is one key idea from ${lessonName}?`,
                hint: "Look at the first published block.",
                selfCheck: "Compare with the lesson summary.",
              },
            ],
            labeledAiGenerated: true,
            sourceReferences: commonRefs,
            groundingStatus: "grounded",
            limitations: [
              "AI-generated practice only — not an official assessment.",
            ],
          };
        } else if (input.capabilityId === "learning.tutor.explain_wrong_answer") {
          structured = {
            explanation: outside
              ? "That attempt detail is outside the authorized learner-safe contract."
              : `Stub explanation of the incorrect answer for ${lessonName}, without revealing hidden solutions.`,
            misconception: "Likely mixed up a key concept from the lesson.",
            betterApproach:
              "Re-read the authorized material and reason from the definitions provided.",
            practiceHint: "Try a non-graded concept check on the same idea.",
            sourceReferences: commonRefs,
            groundingStatus: outside ? "outside_material" : "grounded",
            limitations: [
              "Stub provider — not live model output.",
              "Does not disclose hidden solutions.",
            ],
            labeledAiGenerated: true,
            revealsAnswerKey: false,
          };
        } else {
          structured = {
            title: `Explaining ${lessonName}`,
            explanation: `Stub explanation for ${lessonName} using only authorized published material.`,
            keyPoints: ["Point A", "Point B"],
            examples: ["Example (stub)"],
            sourceReferences: commonRefs,
            groundingStatus: outside ? "outside_material" : "grounded",
            limitations: ["Stub provider — not live model output."],
          };
        }
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
    async *stream(input) {
      assertStreamingAllowed({
        streamingEnabled,
        structured: input.structured,
      });
      const user = input.messages.find((m) => m.role === "user")?.content ?? "";
      const full = `Stub stream reply: ${user.slice(0, 80)}`;
      const mid = Math.max(1, Math.ceil(full.length / 2));
      yield { type: "delta", text: full.slice(0, mid) };
      yield { type: "delta", text: full.slice(mid) };
      yield {
        type: "completed",
        text: full,
        usage: {
          inputTokens: Math.max(1, Math.ceil(user.length / 4)),
          outputTokens: Math.max(1, Math.ceil(full.length / 4)),
          cachedTokens: 0,
        },
      };
    },
  };
}

export function createOpenAiCompatibleAdapter(
  config: AiPlatformConfig
): AiProviderAdapter {
  const streamingEnabled = Boolean(config.streamingEnabled);
  return {
    providerId: "openai",
    streamingSupport: streamingEnabled,
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
    async *stream(input) {
      assertStreamingAllowed({
        streamingEnabled,
        structured: input.structured,
      });
      if (!config.openaiApiKey) {
        throw new AiPlatformError(
          "no_provider_configured",
          "OPENAI_API_KEY is not configured."
        );
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), input.timeoutMs);
      let assembled = "";
      try {
        const res = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${config.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: input.modelId,
            messages: input.messages,
            temperature: 0.3,
            stream: true,
          }),
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
        for await (const delta of iterateOpenAiCompatibleSse(
          res.body,
          controller.signal
        )) {
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

type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

function toGeminiContents(messages: ProviderChatMessage[]): {
  systemInstruction: { parts: Array<{ text: string }> } | undefined;
  contents: GeminiContent[];
} {
  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content.trim())
    .filter(Boolean);
  const contents: GeminiContent[] = [];
  for (const message of messages) {
    if (message.role === "system") continue;
    const role = message.role === "assistant" ? "model" : "user";
    const text = message.content;
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts.push({ text });
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }
  if (contents.length === 0) {
    contents.push({ role: "user", parts: [{ text: "" }] });
  }
  return {
    systemInstruction:
      systemParts.length > 0
        ? { parts: [{ text: systemParts.join("\n\n") }] }
        : undefined,
    contents,
  };
}

/**
 * Google Gemini adapter via Generative Language REST API (no extra SDK).
 * API key stays server-side in config — never logged or returned.
 */
export function createGeminiAdapter(
  config: AiPlatformConfig
): AiProviderAdapter {
  const streamingEnabled = Boolean(config.streamingEnabled);
  return {
    providerId: "gemini",
    streamingSupport: streamingEnabled,
    async execute(input) {
      if (!config.geminiApiKey) {
        throw new AiPlatformError(
          "no_provider_configured",
          "GEMINI_API_KEY is not configured."
        );
      }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), input.timeoutMs);
      try {
        const { systemInstruction, contents } = toGeminiContents(input.messages);
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
        const base = config.geminiBaseUrl.replace(/\/+$/, "");
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
        const json = (await res.json()) as {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            cachedContentTokenCount?: number;
          };
        };
        const content =
          json.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? "")
            .join("") ?? "";
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
    async *stream(input) {
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
        const { systemInstruction, contents } = toGeminiContents(input.messages);
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
        if (systemInstruction) {
          body.systemInstruction = systemInstruction;
        }
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

export function resolveProviderAdapters(
  config: AiPlatformConfig
): Map<string, AiProviderAdapter> {
  const map = new Map<string, AiProviderAdapter>();
  if (config.allowStub || config.mode === "stub") {
    map.set("stub", createStubAdapter({ streamingEnabled: config.streamingEnabled }));
  }
  if (config.openaiApiKey) {
    map.set("openai", createOpenAiCompatibleAdapter(config));
  }
  if (config.geminiApiKey) {
    map.set("gemini", createGeminiAdapter(config));
  }
  if (config.anthropicApiKey) {
    map.set("anthropic", createAnthropicAdapter(config));
  }
  if (isLocalProviderConfigured(config)) {
    map.set("local", createLocalAdapter(config));
  }
  return map;
}
