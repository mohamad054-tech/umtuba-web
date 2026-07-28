import { randomUUID } from "crypto";
import type { AiRunStatus } from "./types";

export type AiEvaluationRecord = {
  id: string;
  runId: string;
  promptId: string;
  promptVersion: string;
  modelId: string | null;
  capabilityId: string;
  runOutcome: AiRunStatus;
  schemaValid: boolean | null;
  toolSuccess: boolean | null;
  latencyMs: number | null;
  safetyOutcome: "allowed" | "blocked" | "unknown";
  userFeedback: "up" | "down" | null;
  testCaseId: string | null;
  score: number | null;
  createdAt: string;
};

const evaluations: AiEvaluationRecord[] = [];

export function resetAiEvaluationState(): void {
  evaluations.length = 0;
}

export function recordEvaluation(
  input: Omit<AiEvaluationRecord, "id" | "createdAt">
): AiEvaluationRecord {
  const row: AiEvaluationRecord = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  evaluations.push(row);
  return row;
}

export function listEvaluations(limit = 50): AiEvaluationRecord[] {
  return evaluations.slice(-limit);
}

/** Deterministic evaluation suite for the reference capability. */
export function evaluateProductDraftSuggestion(structured: Record<string, unknown>): {
  schemaValid: boolean;
  score: number;
  notes: string[];
} {
  const notes: string[] = [];
  let score = 1;
  const title = structured.title;
  const description = structured.description;
  const tags = structured.tags;
  if (typeof title !== "string" || title.trim().length < 3) {
    score -= 0.4;
    notes.push("title_weak");
  }
  if (typeof description !== "string" || description.trim().length < 20) {
    score -= 0.3;
    notes.push("description_weak");
  }
  if (!Array.isArray(tags) || tags.length === 0) {
    score -= 0.2;
    notes.push("tags_missing");
  }
  if ("price" in structured || "inventory" in structured) {
    score = 0;
    notes.push("forbidden_fields");
  }
  return {
    schemaValid: notes.every((n) => n !== "forbidden_fields"),
    score: Math.max(0, Number(score.toFixed(2))),
    notes,
  };
}
