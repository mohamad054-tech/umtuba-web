import { randomUUID } from "crypto";
import type { AiTraceEvent, AiTraceEventType } from "../contracts/types";
import { redactForTrace } from "../safety/hooks";

const events: AiTraceEvent[] = [];
const MAX_EVENTS = 2000;

export type TraceSink = {
  append: (event: AiTraceEvent) => void | Promise<void>;
};

let externalSink: TraceSink | null = null;

export function setAiTraceSink(sink: TraceSink | null): void {
  externalSink = sink;
}

export function resetAiTraceState(): void {
  events.length = 0;
}

export function listRecentTraceEvents(limit = 50): AiTraceEvent[] {
  return events.slice(-limit);
}

export async function appendTraceEvent(input: {
  runId: string;
  traceId: string;
  type: AiTraceEventType;
  summary: string;
  detail?: Record<string, unknown>;
  dataClassification?: string;
}): Promise<AiTraceEvent> {
  const event: AiTraceEvent = {
    id: randomUUID(),
    runId: input.runId,
    traceId: input.traceId,
    type: input.type,
    at: new Date().toISOString(),
    summary: input.summary,
    detail: redactForTrace(
      input.detail ?? {},
      input.dataClassification ?? "internal"
    ),
  };
  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  try {
    await externalSink?.append(event);
  } catch {
    // Trace write failures must not break the user path; gateway may surface separately.
  }
  return event;
}

export function countTraceEventsByType(
  type: AiTraceEventType,
  sinceMs = 24 * 60 * 60 * 1000
): number {
  const since = Date.now() - sinceMs;
  return events.filter(
    (e) => e.type === type && Date.parse(e.at) >= since
  ).length;
}
