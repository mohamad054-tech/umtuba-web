import type { CorrectionFeedback, FeedbackOutcome } from "./types";

/** Simple Levenshtein distance for correction metadata (not semantic). */
export function editDistance(a: string, b: string): number {
  const s = a ?? "";
  const t = b ?? "";
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0)
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  return dp[m]![n]!;
}

export function classifyEditOutcome(
  candidateText: string | null,
  approvedText: string
): FeedbackOutcome {
  if (!candidateText) return "accepted_without_edits";
  if (candidateText.trim() === approvedText.trim()) {
    return "accepted_without_edits";
  }
  const dist = editDistance(candidateText.trim(), approvedText.trim());
  const maxLen = Math.max(candidateText.length, approvedText.length) || 1;
  const ratio = dist / maxLen;
  if (ratio <= 0.15) return "accepted_with_minor_edits";
  return "accepted_with_major_edits";
}

export function buildCorrectionFeedback(input: {
  outcome?: FeedbackOutcome;
  candidateText: string | null;
  approvedText: string;
  notes?: string | null;
  recordedBy?: string | null;
  recordedAt?: string;
}): CorrectionFeedback {
  const candidate = input.candidateText;
  const approved = input.approvedText;
  const outcome =
    input.outcome ?? classifyEditOutcome(candidate, approved);
  return {
    outcome,
    candidateText: candidate,
    approvedText: approved,
    editDistance: editDistance(candidate ?? "", approved),
    notes: input.notes ?? null,
    recordedAt: input.recordedAt ?? new Date().toISOString(),
    recordedBy: input.recordedBy ?? null,
  };
}
