import type { AiGatewayRequest, AiSafetyOutcome } from "../contracts/types";
import type { AiPromptDefinition } from "../prompts/registry";
import type { AiPlatformConfig } from "../config";
import { AiPlatformError } from "../contracts/errors";

const rateBuckets = new Map<string, number[]>();

export function resetAiRateLimitState(): void {
  rateBuckets.clear();
}

export function assertRateLimit(input: {
  userId: string;
  capabilityId: string;
  limitPerMinute: number;
  nowMs?: number;
  bypass?: boolean;
}): void {
  if (input.bypass) return;
  const now = input.nowMs ?? Date.now();
  const key = `${input.userId}:${input.capabilityId}`;
  const windowMs = 60_000;
  const prev = (rateBuckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (prev.length >= input.limitPerMinute) {
    throw new AiPlatformError(
      "rate_limited",
      "AI rate limit reached for this capability."
    );
  }
  prev.push(now);
  rateBuckets.set(key, prev);
}

export function runPreExecutionPolicy(input: {
  request: AiGatewayRequest;
  prompt: AiPromptDefinition;
  config: AiPlatformConfig;
  userId: string;
  eligible: boolean;
}): AiSafetyOutcome {
  const reasons: string[] = [];
  const redactions: string[] = [];

  if (input.config.mode === "disabled" && !input.request._test?.forceStub) {
    reasons.push("AI platform mode is disabled.");
  }
  if (!input.eligible) {
    reasons.push("User or account is not eligible for this capability.");
  }
  if (
    input.request.userInput.length > input.prompt.inputSchema.maxUserInputChars
  ) {
    reasons.push("User input exceeds prompt max length.");
  }
  if (input.request.userInput.length > input.config.maxInputChars) {
    reasons.push("User input exceeds platform max length.");
  }
  if (input.request.outputMode === "blocked") {
    reasons.push("Output mode blocked.");
  }

  const secretLike = /(api[_-]?key|sk-[a-z0-9]|bearer\s+[a-z0-9])/i;
  if (secretLike.test(input.request.userInput)) {
    redactions.push("secret_like_input");
    reasons.push("Input appears to contain secrets.");
  }

  const allowed = reasons.length === 0;
  if (!allowed) {
    throw new AiPlatformError(
      reasons.some((r) => r.includes("rate"))
        ? "rate_limited"
        : reasons.some((r) => r.includes("eligible") || r.includes("disabled"))
          ? "safety_block"
          : "safety_block",
      reasons[0] ?? "Blocked by safety policy."
    );
  }

  return { allowed: true, stage: "pre", reasons: [], redactions };
}

export function runPostExecutionPolicy(input: {
  prompt: AiPromptDefinition;
  text: string | null;
  structured: Record<string, unknown> | null;
}): AiSafetyOutcome {
  const reasons: string[] = [];
  const redactions: string[] = [];
  const blob = JSON.stringify(input.structured ?? {}) + (input.text ?? "");
  if (/(sk-[a-z0-9]{10,}|api[_-]?key\s*[:=])/i.test(blob)) {
    redactions.push("secret_like_output");
    reasons.push("Output contained secret-like content.");
  }
  if (input.prompt.promptId === "commerce.product_draft_assistant") {
    const s = input.structured ?? {};
    if (
      "price" in s ||
      "inventory" in s ||
      "publish" in s ||
      "amount_minor" in s
    ) {
      reasons.push("Output attempted price/inventory/publish fields.");
    }
  }
  if (reasons.length > 0) {
    throw new AiPlatformError("safety_block", reasons[0]!);
  }
  return { allowed: true, stage: "post", reasons: [], redactions };
}

export function redactForTrace(
  value: Record<string, unknown>,
  dataClassification: string
): Record<string, unknown> {
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    const key = k.toLowerCase();
    if (
      key.includes("secret") ||
      key.includes("password") ||
      key.includes("token") ||
      key.includes("authorization") ||
      key.includes("api_key")
    ) {
      clone[k] = "[REDACTED]";
      continue;
    }
    if (
      (dataClassification === "confidential" ||
        dataClassification === "restricted") &&
      (key === "userinput" ||
        key === "user_input" ||
        key === "system" ||
        key === "prompt" ||
        key === "output" ||
        key === "content")
    ) {
      clone[k] = "[REDACTED_BY_CLASSIFICATION]";
      continue;
    }
    if (typeof v === "string" && v.length > 500) {
      clone[k] = `${v.slice(0, 200)}…[truncated]`;
      continue;
    }
    clone[k] = v;
  }
  return clone;
}
