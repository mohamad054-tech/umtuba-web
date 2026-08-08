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
  /**
   * Optional per-request routing attribution (never trust model-claimed labels).
   * Used for independent generator×reviewer provider pairs.
   */
  resolveProvider?: (
    request: ProfessionalAiTransportRequest
  ) => ProfessionalAiProviderMetadata;
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
            provider: deps.resolveProvider?.(request) ?? deps.provider,
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
          } else if (message === "invalid_json") {
            lastFailure = reviewFailure(
              "invalid_json",
              "Provider returned invalid JSON",
              { responsePresent: true, jsonParseSucceeded: false }
            );
          } else if (message === "schema_mismatch" || message === "empty_response") {
            lastFailure = reviewFailure(
              message === "empty_response" ? "invalid_json" : "schema_mismatch",
              message === "empty_response"
                ? "Provider returned empty response"
                : "Provider response failed schema validation",
              {
                responsePresent: message !== "empty_response",
                jsonParseSucceeded: message === "schema_mismatch",
              }
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
 * Live adapter over dedicated professional AI Core capabilities.
 * Does NOT use platform.translation_suggest (too narrow for rich payloads).
 */
export type AiServiceJsonRunner = (request: {
  capabilityId: string;
  input: { text?: string; notes?: string };
  context: {
    surface: string;
    productDomain: string;
    locale?: string;
  };
  /** Allowlisted model preference for gateway routing. */
  preferredModelHint?: string;
  /** Allowlisted provider preference paired with preferredModelHint. */
  preferredProviderId?: string;
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

/**
 * Live adapter over dedicated professional AI Core capabilities.
 * Does NOT use platform.translation_suggest (too narrow).
 */
export function createAiServiceProfessionalTransport(deps: {
  runCapability: AiServiceJsonRunner;
  providerId?: string;
  /** Optional role-specific provider routing for independent gen×rev cells. */
  generatorProviderId?: string;
  reviewerProviderId?: string;
  generatorModelId?: string;
  reviewerModelId?: string;
}): ProfessionalAiTransport {
  const provider: ProfessionalAiProviderMetadata = {
    providerId: deps.providerId ?? "ai_service",
    modelId:
      deps.generatorModelId ??
      deps.reviewerModelId ??
      "platform.translation_professional",
  };
  return createBoundedProfessionalAiTransport({
    kind: "ai_service",
    provider,
    resolveProvider: (request) => {
      const modelId =
        request.role === "reviewer"
          ? deps.reviewerModelId ?? provider.modelId
          : deps.generatorModelId ?? provider.modelId;
      const roleProviderRaw =
        request.role === "reviewer"
          ? deps.reviewerProviderId ?? deps.providerId
          : deps.generatorProviderId ?? deps.providerId;
      const preferredProviderId =
        roleProviderRaw && roleProviderRaw !== "ai_service"
          ? roleProviderRaw
          : provider.providerId;
      return {
        providerId: preferredProviderId,
        modelId,
      };
    },
    async complete(request) {
      const capabilityId =
        request.role === "reviewer"
          ? "platform.translation_professional_review"
          : "platform.translation_professional_generate";
      const modelId =
        request.role === "reviewer"
          ? deps.reviewerModelId ?? provider.modelId
          : deps.generatorModelId ?? provider.modelId;
      const roleProviderRaw =
        request.role === "reviewer"
          ? deps.reviewerProviderId ?? deps.providerId
          : deps.generatorProviderId ?? deps.providerId;
      const preferredProviderId =
        roleProviderRaw && roleProviderRaw !== "ai_service"
          ? roleProviderRaw
          : undefined;

      const result = await deps.runCapability({
        capabilityId,
        input: {
          text: JSON.stringify(request.userPayload),
          notes: [
            request.systemPrompt,
            "Return ONLY JSON matching the professional capability schema.",
            `role=${request.role}`,
            `preferredModel=${modelId}`,
          ].join("\n"),
        },
        context: {
          productDomain: "platform",
          surface: "admin.translation_studio.professional",
          locale:
            typeof request.userPayload.targetLocale === "string"
              ? request.userPayload.targetLocale
              : undefined,
        },
        preferredModelHint: modelId,
        preferredProviderId,
      });
      if (!result.ok) {
        throw new Error("provider_unavailable");
      }
      const payload = result.data.result;
      if (payload == null) {
        throw new Error("empty_response");
      }
      if (typeof payload !== "object") {
        throw new Error("invalid_json");
      }
      // Preserve structured payload. Attribution uses configured/routing provider —
      // never trust model-claimed providerId labels (e.g. product name "umtuba").
      return {
        ...payload,
        provider: {
          providerId: preferredProviderId ?? provider.providerId,
          // Prefer operator/routing model id for exact matrix attribution.
          modelId,
          requestId: result.data.runId,
        },
      };
    },
  });
}
