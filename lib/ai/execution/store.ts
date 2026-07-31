import type {
  AiUnifiedAuditRecord,
  AiUnifiedCapabilityExecutionResult,
} from "./types";

const MAX = 500;

export class AiUnifiedExecutionStore {
  private readonly runs: AiUnifiedCapabilityExecutionResult[] = [];
  private readonly audits: AiUnifiedAuditRecord[] = [];

  reset(): void {
    this.runs.length = 0;
    this.audits.length = 0;
  }

  record(run: AiUnifiedCapabilityExecutionResult): void {
    this.runs.push(run);
    this.audits.push(run.audit);
    if (this.runs.length > MAX) this.runs.shift();
    if (this.audits.length > MAX) this.audits.shift();
  }

  listRecent(limit = 50): AiUnifiedCapabilityExecutionResult[] {
    return this.runs.slice(-limit);
  }

  listAudits(limit = 50): AiUnifiedAuditRecord[] {
    return this.audits.slice(-limit);
  }

  get(executionId: string): AiUnifiedCapabilityExecutionResult | null {
    return this.runs.find((r) => r.executionId === executionId) ?? null;
  }
}

export const aiUnifiedExecutionStore = new AiUnifiedExecutionStore();
