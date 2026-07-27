/**
 * Structured logging — no secrets / tokens / full payloads.
 */

const REDACT_KEYS = /key|secret|token|password|authorization|cookie|service_role/i;

export type MediaLogEvent = {
  event: string;
  processorKind?: string;
  jobId?: string;
  durationMs?: number;
  exitCode?: number | null;
  attempt?: number;
  state?: string;
  errorCode?: string;
  ok?: boolean;
};

function scrubFields(
  fields?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!fields) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (REDACT_KEYS.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && value.length > 240) {
      out[key] = `${value.slice(0, 240)}…`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function createMediaLogger(scope: string) {
  return function logMedia(
    event: string,
    fields?: Record<string, unknown>
  ): MediaLogEvent {
    const entry: MediaLogEvent = {
      event,
      ...scrubFields(fields),
    };
    const line = JSON.stringify({ scope, ...entry, at: new Date().toISOString() });
    if (fields?.ok === false || event.includes("fail")) {
      console.error(line);
    } else {
      console.log(line);
    }
    return entry;
  };
}
