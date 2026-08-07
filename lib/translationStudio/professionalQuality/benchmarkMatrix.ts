/**
 * Provider/model matrix for professional generator × reviewer benchmarks.
 * Server-side only — browser cannot inject arbitrary models.
 */

import type { ProfessionalLiveProviderId } from "./liveProviderConfig";

export type BenchmarkMatrixSlot = {
  id: string;
  label: string;
  generator: { providerId: ProfessionalLiveProviderId; modelId: string };
  reviewer: { providerId: ProfessionalLiveProviderId; modelId: string };
  /** True when generator and reviewer differ (preferred). */
  independent: boolean;
  forSensitiveReviewer?: boolean;
};

/**
 * Conceptual matrix templates — filled with configured model ids at run time.
 * Does not activate live calls by itself.
 */
export function buildProfessionalBenchmarkMatrix(input: {
  candidates: Array<{
    providerId: ProfessionalLiveProviderId;
    modelId: string;
    role?: "generator" | "reviewer" | "both";
  }>;
}): BenchmarkMatrixSlot[] {
  const gens = input.candidates.filter(
    (c) => c.role === "generator" || c.role === "both" || c.role == null
  );
  const revs = input.candidates.filter(
    (c) => c.role === "reviewer" || c.role === "both" || c.role == null
  );
  const slots: BenchmarkMatrixSlot[] = [];
  let i = 0;
  for (const g of gens) {
    for (const r of revs) {
      i += 1;
      slots.push({
        id: `G${gens.indexOf(g) + 1}_R${revs.indexOf(r) + 1}`,
        label: `${g.providerId}/${g.modelId || "unset"} × ${r.providerId}/${r.modelId || "unset"}`,
        generator: { providerId: g.providerId, modelId: g.modelId },
        reviewer: { providerId: r.providerId, modelId: r.modelId },
        independent:
          g.providerId !== r.providerId ||
          (Boolean(g.modelId) &&
            Boolean(r.modelId) &&
            g.modelId !== r.modelId),
      });
      if (slots.length >= 16) return slots; // guardrail
    }
  }
  if (slots.length === 0) {
    slots.push({
      id: "G_heuristic_R_heuristic",
      label: "heuristic × heuristic (offline baseline)",
      generator: { providerId: "heuristic", modelId: "glossary-aware-generator-v1" },
      reviewer: { providerId: "heuristic", modelId: "heuristic-reviewer-v1" },
      independent: true,
    });
  }
  void i;
  return slots;
}

/** Default offline matrix for readiness (no live credentials). */
export function defaultOfflineBenchmarkMatrix(): BenchmarkMatrixSlot[] {
  return buildProfessionalBenchmarkMatrix({
    candidates: [
      {
        providerId: "heuristic",
        modelId: "glossary-aware-generator-v1",
        role: "generator",
      },
      {
        providerId: "heuristic",
        modelId: "heuristic-reviewer-v1",
        role: "reviewer",
      },
    ],
  });
}
