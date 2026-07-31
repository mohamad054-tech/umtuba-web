/**
 * Process-local orchestration run store for admin diagnostics.
 */

import type { AiOrchestrationPipelineResult } from "./types";

const MAX = 500;

export class AiOrchestrationStore {
  private readonly runs: AiOrchestrationPipelineResult[] = [];

  reset(): void {
    this.runs.length = 0;
  }

  record(run: AiOrchestrationPipelineResult): void {
    this.runs.push(run);
    if (this.runs.length > MAX) this.runs.shift();
  }

  listRecent(limit = 50): AiOrchestrationPipelineResult[] {
    return this.runs.slice(-limit);
  }

  get(orchestrationId: string): AiOrchestrationPipelineResult | null {
    return this.runs.find((r) => r.orchestrationId === orchestrationId) ?? null;
  }
}

export const aiOrchestrationStore = new AiOrchestrationStore();
