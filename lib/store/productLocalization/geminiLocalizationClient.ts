type GeminiUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type GeminiGenerateJsonResult = {
  json: unknown;
  usage: GeminiUsage;
  model: string;
};

export class GeminiHttpError extends Error {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  readonly quotaExhausted: boolean;

  constructor(status: number, retryAfterSeconds: number | null, quotaExhausted = false) {
    super(`gemini_http_${status}`);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.quotaExhausted = quotaExhausted;
  }
}

const FLASH = "gemini-2.5-flash";
const PRO = "gemini-2.5-pro";
const FLASH_ALIASES = [
  "gemini-2.5-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
] as const;

function flashCostUsd(input: number, output: number): number {
  return (input / 1_000_000) * 0.15 + (output / 1_000_000) * 0.6;
}

function proCostUsd(input: number, output: number): number {
  return (input / 1_000_000) * 1.25 + (output / 1_000_000) * 10;
}

export function estimateGeminiUsd(model: string, input: number, output: number): number {
  return model.includes("pro") ? proCostUsd(input, output) : flashCostUsd(input, output);
}

export function geminiFlashModel(): string {
  return FLASH;
}

export function geminiProModel(): string {
  return PRO;
}

export function parseRetryAfterSeconds(header: string | null): number | null {
  if (!header) return null;
  const asNumber = Number(header);
  if (Number.isFinite(asNumber) && asNumber >= 0) return Math.min(asNumber, 180);
  const asDate = Date.parse(header);
  if (!Number.isNaN(asDate)) {
    const seconds = Math.ceil((asDate - Date.now()) / 1000);
    if (seconds > 0) return Math.min(seconds, 180);
  }
  return null;
}

export function backoffSeconds(attempt: number, retryAfterSeconds: number | null): number {
  if (retryAfterSeconds != null) return retryAfterSeconds;
  return Math.min(15 * 2 ** Math.max(0, attempt - 1), 180);
}

export function parseRetryDelayFromBody(text: string): number | null {
  const match = text.match(/"retryDelay"\s*:\s*"(\d+)(?:\.\d+)?s"/i);
  if (!match) return null;
  const seconds = Number(match[1]);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return Math.min(seconds, 180);
}

export function looksLikeQuotaExhausted(text: string): boolean {
  return /RESOURCE_EXHAUSTED|exceeded your current quota|Quota exceeded/i.test(text);
}

export const GEMINI_MAX_ATTEMPTS = 5;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type GeminiRetryResult =
  | {
      ok: true;
      result: GeminiGenerateJsonResult;
      http429Count: number;
    }
  | {
      ok: false;
      http429Count: number;
      lastError: string;
      quotaExhausted: boolean;
      authFailed: boolean;
    };

export async function listUsableFlashModels(apiKey: string): Promise<{
  status: number | "timeout";
  quotaExhausted: boolean;
  models: string[];
}> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(15_000) });
    if (res.status === 429) {
      const quotaExhausted = looksLikeQuotaExhausted(await res.text().catch(() => ""));
      return { status: 429, quotaExhausted, models: [] };
    }
    if (!res.ok) return { status: res.status, quotaExhausted: false, models: [] };
    const json = (await res.json()) as {
      models?: Array<{ name?: string; supportedGenerationMethods?: string[] }>;
    };
    const usable: string[] = [];
    for (const model of json.models ?? []) {
      const name = (model.name ?? "").replace(/^models\//, "");
      const methods = model.supportedGenerationMethods ?? [];
      if (!methods.includes("generateContent")) continue;
      if (!/flash/i.test(name) || /pro|image|tts|embed|robotics/i.test(name)) continue;
      if (!usable.includes(name)) usable.push(name);
    }
    return { status: res.status, quotaExhausted: false, models: usable };
  } catch {
    return { status: "timeout", quotaExhausted: false, models: [] };
  }
}

export async function resolveAvailableFlashModel(apiKey: string): Promise<{
  status: number | "timeout";
  quotaExhausted: boolean;
  model: string | null;
}> {
  const listed = await listUsableFlashModels(apiKey);
  if (listed.status === 429 || listed.quotaExhausted) {
    return { status: 429, quotaExhausted: true, model: null };
  }
  if (listed.status !== 200) return { status: listed.status, quotaExhausted: false, model: null };
  for (const alias of FLASH_ALIASES) {
    if (listed.models.includes(alias)) return { status: 200, quotaExhausted: false, model: alias };
  }
  return { status: 200, quotaExhausted: false, model: listed.models[0] ?? null };
}

export async function selectWorkingFlashGenerate(
  apiKey: string,
  skipModels: string[] = []
): Promise<{
  status: number | "timeout";
  quotaExhausted: boolean;
  model: string | null;
  apiVersion: "v1beta";
}> {
  const listed = await listUsableFlashModels(apiKey);
  if (listed.status === 429 || listed.quotaExhausted) {
    return { status: 429, quotaExhausted: true, model: null, apiVersion: "v1beta" };
  }
  const skip = new Set(skipModels);
  const candidates = [
    ...FLASH_ALIASES.filter((alias) => listed.models.includes(alias) && !skip.has(alias)),
    ...listed.models.filter((name) => !FLASH_ALIASES.includes(name as (typeof FLASH_ALIASES)[number]) && !skip.has(name)),
  ];
  let lastStatus: number | "timeout" = listed.status;
  let tries = 0;
  for (const model of candidates) {
    tries += 1;
    if (tries > 2) break;
    try {
      await generateGeminiJson({
        apiKey,
        model,
        apiVersion: "v1beta",
        timeoutMs: 20_000,
        system: "Return JSON only.",
        user: '{"ok":true}',
      });
      process.stdout.write(`flash_ready=true tries=${tries}\n`);
      return { status: 200, quotaExhausted: false, model, apiVersion: "v1beta" };
    } catch (error) {
      if (error instanceof GeminiHttpError) {
        lastStatus = error.status;
        process.stdout.write(`flash_try=${tries} status=${error.status}\n`);
        if (error.status === 429) {
          return { status: 429, quotaExhausted: true, model: null, apiVersion: "v1beta" };
        }
        if (error.status === 401 || error.status === 403) {
          return { status: error.status, quotaExhausted: false, model: null, apiVersion: "v1beta" };
        }
        continue;
      }
      lastStatus = "timeout";
      process.stdout.write(`flash_try=${tries} status=timeout\n`);
    }
  }
  process.stdout.write("flash_ready=false\n");
  return { status: lastStatus, quotaExhausted: false, model: null, apiVersion: "v1beta" };
}

export async function probeGeminiFlash(apiKey: string): Promise<{
  status: number | "timeout";
  quotaExhausted: boolean;
}> {
  const resolved = await resolveAvailableFlashModel(apiKey);
  return { status: resolved.status, quotaExhausted: resolved.quotaExhausted };
}

export async function discoverWorkingFlashGenerate(apiKey: string): Promise<{
  status: number | "timeout";
  quotaExhausted: boolean;
  model: string | null;
  apiVersion: "v1beta" | "v1";
}> {
  const listed = await resolveAvailableFlashModel(apiKey);
  if (listed.status === 429 || listed.quotaExhausted) {
    return { status: 429, quotaExhausted: true, model: null, apiVersion: "v1beta" };
  }
  const candidates = [...new Set([listed.model, ...FLASH_ALIASES].filter((item): item is string => Boolean(item)))];
  const versions: Array<"v1beta" | "v1"> = ["v1beta", "v1"];
  let lastStatus: number | "timeout" = listed.status;
  let tries = 0;
  for (const model of candidates) {
    for (const apiVersion of versions) {
      tries += 1;
      if (tries > 6) break;
      try {
        await generateGeminiJson({
          apiKey,
          model,
          apiVersion,
          timeoutMs: 20_000,
          system: "Return JSON only.",
          user: '{"ok":true}',
        });
        process.stdout.write(`discover_ready=true tries=${tries}\n`);
        return { status: 200, quotaExhausted: false, model, apiVersion };
      } catch (error) {
        if (error instanceof GeminiHttpError) {
          lastStatus = error.status;
          process.stdout.write(`discover_try=${tries} status=${error.status}\n`);
          if (error.status === 429) {
            return { status: 429, quotaExhausted: true, model: null, apiVersion };
          }
          if (error.status === 401 || error.status === 403) {
            return { status: error.status, quotaExhausted: false, model: null, apiVersion };
          }
          continue;
        }
        lastStatus = "timeout";
        process.stdout.write(`discover_try=${tries} status=timeout\n`);
      }
    }
  }
  process.stdout.write("discover_ready=false\n");
  return { status: lastStatus, quotaExhausted: false, model: null, apiVersion: "v1beta" };
}

export async function generateGeminiJsonWithRetry(input: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  timeoutMs?: number;
  apiVersion?: "v1beta" | "v1";
  sleep?: (ms: number) => Promise<void>;
}): Promise<GeminiRetryResult> {
  const sleep = input.sleep ?? defaultSleep;
  let http429Count = 0;
  let lastError = "gemini_error";
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt += 1) {
    process.stdout.write(`gemini_attempt=${attempt}\n`);
    try {
      const result = await generateGeminiJson(input);
      process.stdout.write("gemini_status=200\n");
      return { ok: true, result, http429Count };
    } catch (error) {
      if (error instanceof GeminiHttpError) {
        lastError = error.message;
        process.stdout.write(`gemini_status=${error.status}\n`);
        if (error.status === 401 || error.status === 403) {
          return { ok: false, http429Count, lastError, quotaExhausted: false, authFailed: true };
        }
        if (error.status === 404) {
          return { ok: false, http429Count, lastError, quotaExhausted: false, authFailed: false };
        }
        if (error.status === 429) {
          http429Count += 1;
          if (error.quotaExhausted || attempt === GEMINI_MAX_ATTEMPTS) {
            return { ok: false, http429Count, lastError, quotaExhausted: true, authFailed: false };
          }
          await sleep(backoffSeconds(attempt, error.retryAfterSeconds) * 1000);
          continue;
        }
        if (attempt === GEMINI_MAX_ATTEMPTS) {
          return { ok: false, http429Count, lastError, quotaExhausted: false, authFailed: false };
        }
        await sleep(backoffSeconds(attempt, error.retryAfterSeconds) * 1000);
        continue;
      }
      lastError =
        error instanceof Error ? error.message.replace(/key=[^&\s]+/gi, "key=redacted") : "gemini_error";
      if (attempt === GEMINI_MAX_ATTEMPTS) {
        return { ok: false, http429Count, lastError, quotaExhausted: false, authFailed: false };
      }
      await sleep(backoffSeconds(attempt, null) * 1000);
    }
  }
  return { ok: false, http429Count, lastError, quotaExhausted: false, authFailed: false };
}

export async function generateGeminiJson(input: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  timeoutMs?: number;
  apiVersion?: "v1beta" | "v1";
}): Promise<GeminiGenerateJsonResult> {
  const base = `https://generativelanguage.googleapis.com/${input.apiVersion ?? "v1beta"}`;
  const url = `${base}/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 45_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{ role: "user", parts: [{ text: input.user }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const retryAfterSeconds = parseRetryAfterSeconds(res.headers.get("retry-after"));
      const errText = res.status === 429 || res.status >= 500 ? await res.text().catch(() => "") : "";
      const retryFromBody = parseRetryDelayFromBody(errText);
      const quotaExhausted = res.status === 429 && looksLikeQuotaExhausted(errText);
      throw new GeminiHttpError(res.status, retryAfterSeconds ?? retryFromBody, quotaExhausted);
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = (json.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("gemini_empty");
    return {
      json: JSON.parse(text) as unknown,
      usage: {
        inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
      },
      model: input.model,
    };
  } finally {
    clearTimeout(timer);
  }
}
