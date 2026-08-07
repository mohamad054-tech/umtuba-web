/**
 * Future live benchmark phases — planning only (no paid execution).
 */

export type LiveBenchmarkPhaseId = "A" | "B" | "C" | "D";

export type LiveBenchmarkPhasePlan = {
  id: LiveBenchmarkPhaseId;
  name: string;
  description: string;
  locales: string[];
  maxCases: number;
  caseFilter: string;
  requiresHumanReviewGate: boolean;
  requiresExplicitGo: true;
};

export const LIVE_BENCHMARK_PHASES: LiveBenchmarkPhasePlan[] = [
  {
    id: "A",
    name: "Small smoke",
    description:
      "5 representative cases, AR primary, generation + independent review, structured reliability",
    locales: ["ar"],
    maxCases: 5,
    caseFilter: "smoke_representative",
    requiresHumanReviewGate: false,
    requiresExplicitGo: true,
  },
  {
    id: "B",
    name: "Arabic professional benchmark",
    description: "Full AR corpus with Arabic acceptance bar",
    locales: ["ar"],
    maxCases: 50,
    caseFilter: "full_ar",
    requiresHumanReviewGate: false,
    requiresExplicitGo: true,
  },
  {
    id: "C",
    name: "Multilingual",
    description: "FR/ES/DE/PT quality floors",
    locales: ["fr", "es", "de", "pt"],
    maxCases: 50,
    caseFilter: "multilingual",
    requiresHumanReviewGate: false,
    requiresExplicitGo: true,
  },
  {
    id: "D",
    name: "Sensitive cases",
    description: "Commerce/legal/financial — mandatory human review",
    locales: ["ar", "fr", "es", "de", "pt"],
    maxCases: 30,
    caseFilter: "sensitive_only",
    requiresHumanReviewGate: true,
    requiresExplicitGo: true,
  },
];

/** Smoke case ids for Phase A (subset of corpus) — locked order. */
export const PHASE_A_SMOKE_CASE_IDS = [
  "appshell_back",
  "appshell_cancel",
  "collab_workspace",
  "commerce_refund",
  "ph_hello_name",
] as const;
