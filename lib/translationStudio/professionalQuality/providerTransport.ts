/**
 * Provider-neutral professional AI transport (timeout, retries, fail-closed).
 * No browser secrets. No service_role. Injectable for tests.
 */

import {
  reviewFailure,
  type ProfessionalReviewFailure,
} from "./reviewFailures";
import type { ProfessionalAiProviderMetadata } from "./aiContracts";

export type ProfessionalAiTransportRole = "reviewer" | "generator";

export type ProfessionalAiTransportRequest = {
  role: ProfessionalAiTransportRole;
  systemPrompt: string;
  userPayload: Record<string, unknown>;
  timeoutMs?: number;
  maxRetries?: number;
};

export type ProfessionalAiTransportSuccess = {
  ok: true;
  json: unknown;
  provider: ProfessionalAiProviderMetadata;
  durationMs: number;
  attempts: number;
};

export type ProfessionalAiTransportFailure = {
  ok: false;
  failure: ProfessionalReviewFailure;
  durationMs: number;
  attempts: number;
};

export type ProfessionalAiTransportResult =
  | ProfessionalAiTransportSuccess
  | ProfessionalAiTransportFailure;

export type ProfessionalAiTransport = {
  readonly kind: "fake" | "scripted" | "ai_service" | "unavailable";
  completeJson(
    request: ProfessionalAiTransportRequest
  ): Promise<ProfessionalAiTransportResult>;
};

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 1;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("provider_timeout"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Wrap an underlying JSON completer with timeout + bounded retries.
 */
export function createBoundedProfessionalAiTransport(deps: {
  kind: ProfessionalAiTransport["kind"];
  provider: ProfessionalAiProviderMetadata;
  complete: (
    request: ProfessionalAiTransportRequest
  ) => Promise<unknown>;
}): ProfessionalAiTransport {
  return {
    kind: deps.kind,
    async completeJson(request) {
      const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const maxRetries = Math.max(0, Math.min(2, request.maxRetries ?? DEFAULT_RETRIES));
      const started = Date.now();
      let attempts = 0;
      let lastFailure: ProfessionalReviewFailure | null = null;

      while (attempts <= maxRetries) {
        attempts += 1;
        try {
          const json = await withTimeout(deps.complete(request), timeoutMs);
          return {
            ok: true,
            json,
            provider: deps.provider,
            durationMs: Date.now() - started,
            attempts,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "transport_error";
          if (message === "provider_timeout") {
            lastFailure = reviewFailure(
              "provider_timeout",
              "Professional AI provider timed out"
            );
          } else if (message === "content_rejected") {
            lastFailure = reviewFailure(
              "content_rejected",
              "Provider rejected content"
            );
          } else if (message === "provider_unavailable") {
            lastFailure = reviewFailure(
              "provider_unavailable",
              "Professional AI provider unavailable"
            );
          } else {
            lastFailure = reviewFailure("transport_error", message.slice(0, 200));
          }
          if (attempts > maxRetries) break;
        }
      }

      return {
        ok: false,
        failure:
          lastFailure ??
          reviewFailure("transport_error", "Professional AI transport failed"),
        durationMs: Date.now() - started,
        attempts,
      };
    },
  };
}

/** Always-unavailable transport (runtime provider not configured). */
export function createUnavailableProfessionalAiTransport(
  reason = "RUNTIME_PROVIDER_NOT_CONFIGURED"
): ProfessionalAiTransport {
  return {
    kind: "unavailable",
    async completeJson() {
      return {
        ok: false,
        failure: reviewFailure("provider_unavailable", reason),
        durationMs: 0,
        attempts: 0,
      };
    },
  };
}

/** Scripted fake transport for tests — returns fixed JSON by role. */
export function createScriptedProfessionalAiTransport(script: {
  reviewer?: unknown;
  generator?: unknown;
  provider?: ProfessionalAiProviderMetadata;
  failWith?: ProfessionalReviewFailure;
  delayMs?: number;
}): ProfessionalAiTransport {
  const provider = script.provider ?? {
    providerId: "fake",
    modelId: "scripted-v1",
  };
  return createBoundedProfessionalAiTransport({
    kind: "scripted",
    provider,
    async complete(request) {
      if (script.delayMs && script.delayMs > 0) {
        await new Promise((r) => setTimeout(r, script.delayMs));
      }
      if (script.failWith) {
        const err = new Error(script.failWith.code);
        throw err;
      }
      if (request.role === "reviewer") {
        if (script.reviewer === undefined) {
          throw new Error("provider_unavailable");
        }
        return script.reviewer;
      }
      if (script.generator === undefined) {
        throw new Error("provider_unavailable");
      }
      return script.generator;
    },
  });
}

/**
 * Live adapter over existing AI Core `runCapability` (platform.translation_suggest).
 * Structured review/generate JSON is requested via notes; response parsed from result.
 * Does not introduce a duplicate provider stack.
 */
export type AiServiceJsonRunner = (request: {
  capabilityId: string;
  input: { text?: string; notes?: string };
  context: {
    surface: string;
    productDomain: string;
    locale?: string;
  };
}) => Promise<
  | {
      ok: true;
      data: {
        result: Record<string, unknown>;
        runId?: string;
      };
    }
  | { ok: false; error: { message: string } }
>;

export function createAiServiceProfessionalTransport(deps: {
  runCapability: AiServiceJsonRunner;
  providerId?: string;
  modelId?: string;
}): ProfessionalAiTransport {
  const provider: ProfessionalAiProviderMetadata = {
    providerId: deps.providerId ?? "ai_service",
    modelId: deps.modelId ?? "platform.translation_suggest",
  };
  return createBoundedProfessionalAiTransport({
    kind: "ai_service",
    provider,
    async complete(request) {
      const result = await deps.runCapability({
        capabilityId: "platform.translation_suggest",
        input: {
          text: JSON.stringify(request.userPayload),
          notes: [
            request.systemPrompt,
            "Return ONLY JSON matching the requiredOutput schema.",
            `role=${request.role}`,
          ].join("\n"),
        },
        context: {
          productDomain: "platform",
          surface: "admin.translation_studio.professional_review",
          locale:
            typeof request.userPayload.targetLocale === "string"
              ? request.userPayload.targetLocale
              : undefined,
        },
      });
      if (!result.ok) {
        throw new Error(result.error.message || "transport_error");
      }
      const payload = result.data.result;
      // Prefer nested professionalReview / professionalGenerate, else whole result.
      if (
        request.role === "reviewer" &&
        payload.professionalReview &&
        typeof payload.professionalReview === "object"
      ) {
        return {
          ...(payload.professionalReview as object),
          provider: {
            ...provider,
            requestId: result.data.runId,
          },
        };
      }
      if (
        request.role === "generator" &&
        (payload.candidateText || payload.professionalGenerate)
      ) {
        if (
          payload.professionalGenerate &&
          typeof payload.professionalGenerate === "object"
        ) {
          return {
            ...(payload.professionalGenerate as object),
            provider: {
              ...provider,
              requestId: result.data.runId,
            },
          };
        }
        return {
          candidateText: payload.candidateText,
          confidence: payload.confidence,
          rationaleNotes: payload.notes,
          provider: {
            ...provider,
            requestId: result.data.runId,
          },
        };
      }
      // If provider returned JSON string in content/notes, try parse.
      for (const key of ["content", "notes", "json"] as const) {
        const v = payload[key];
        if (typeof v === "string" && v.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(v) as unknown;
            if (parsed && typeof parsed === "object") {
              return {
                ...(parsed as object),
                provider: {
                  ...provider,
                  requestId: result.data.runId,
                },
              };
            }
          } catch {
            throw new Error("invalid_json");
          }
        }
      }
      // Fall through: treat structured result as the JSON body if it looks useful.
      if (payload.dimensionScores || payload.findings || payload.candidateText) {
        return {
          ...payload,
          provider: {
            ...provider,
            requestId: result.data.runId,
          },
        };
      }
      throw new Error("schema_mismatch");
    },
  });
}
