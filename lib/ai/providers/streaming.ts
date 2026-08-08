/**
 * Provider Streaming Foundation V1 — Shared AI Core.
 *
 * Contracts + helpers for text delta streaming. No live network in tests;
 * adapters mock fetch. Structured-output streaming is deferred (fail-closed).
 * Operator gate: UMTUBA_AI_STREAMING=1/true (default OFF).
 */

import { AiPlatformError } from "../contracts/errors";
import type { ProviderExecuteInput } from "./adapters";

export type ProviderStreamEvent =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "completed";
      text: string;
      usage: {
        inputTokens: number | null;
        outputTokens: number | null;
        cachedTokens: number | null;
      };
    }
  | {
      type: "error";
      code: string;
      message: string;
    };

export type ProviderStreamHandler = (
  input: ProviderExecuteInput
) => AsyncGenerator<ProviderStreamEvent, void, unknown>;

export function assertStreamingAllowed(input: {
  streamingEnabled: boolean;
  structured: boolean;
}): void {
  if (!input.streamingEnabled) {
    throw new AiPlatformError(
      "streaming_unsupported",
      "Provider streaming is disabled (set UMTUBA_AI_STREAMING=1 to enable)."
    );
  }
  if (input.structured) {
    throw new AiPlatformError(
      "streaming_unsupported",
      "Structured-output streaming is not supported in Streaming Foundation V1."
    );
  }
}

/**
 * Parse OpenAI-compatible SSE chat.completion.chunk lines into text deltas.
 */
export async function* iterateOpenAiCompatibleSse(
  body: ReadableStream<Uint8Array> | null,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  if (!body) {
    throw new AiPlatformError(
      "provider_error",
      "Streaming response body is empty."
    );
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) {
        throw new AiPlatformError("cancelled", "AI stream cancelled.");
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const rawLine of parts) {
        const line = rawLine.trim();
        if (!line || line.startsWith(":")) continue;
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        let parsed: {
          choices?: Array<{ delta?: { content?: string | null } }>;
        };
        try {
          parsed = JSON.parse(data) as typeof parsed;
        } catch {
          continue;
        }
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) {
          yield delta;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse Anthropic Messages SSE (`content_block_delta` text deltas).
 */
export async function* iterateAnthropicSse(
  body: ReadableStream<Uint8Array> | null,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  if (!body) {
    throw new AiPlatformError(
      "provider_error",
      "Streaming response body is empty."
    );
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) {
        throw new AiPlatformError("cancelled", "AI stream cancelled.");
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const rawLine of parts) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let parsed: {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        try {
          parsed = JSON.parse(data) as typeof parsed;
        } catch {
          continue;
        }
        if (
          parsed.type === "content_block_delta" &&
          parsed.delta?.type === "text_delta" &&
          typeof parsed.delta.text === "string" &&
          parsed.delta.text.length > 0
        ) {
          yield parsed.delta.text;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Parse Gemini `streamGenerateContent` SSE / NDJSON text chunks.
 */
export async function* iterateGeminiSse(
  body: ReadableStream<Uint8Array> | null,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  if (!body) {
    throw new AiPlatformError(
      "provider_error",
      "Streaming response body is empty."
    );
  }
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) {
        throw new AiPlatformError("cancelled", "AI stream cancelled.");
      }
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const rawLine of parts) {
        const line = rawLine.trim();
        if (!line) continue;
        const payload = line.startsWith("data:") ? line.slice(5).trim() : line;
        if (!payload || payload === "[DONE]") continue;
        let parsed: {
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
          }>;
        };
        try {
          parsed = JSON.parse(payload) as typeof parsed;
        } catch {
          continue;
        }
        const text = (parsed.candidates?.[0]?.content?.parts ?? [])
          .map((p) => (typeof p.text === "string" ? p.text : ""))
          .join("");
        if (text.length > 0) yield text;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function encodeSseFixture(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const payload = lines.map((l) => (l.endsWith("\n") ? l : `${l}\n`)).join("");
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    },
  });
}
