/**
 * AI Policy Registry + Governance Registry — process-local Foundation V1.
 */

import { AiPlatformError } from "../contracts/errors";
import {
  buildDefaultGovernance,
  buildDefaultPolicies,
} from "./fixtures";
import type {
  AiCapabilityPolicyBinding,
  AiGovernanceRecord,
  AiPolicyFoundationState,
  AiPolicyKind,
  AiPolicyLifecycle,
  AiPolicyRecord,
} from "./types";
import { AI_POLICY_FOUNDATION_SCHEMA_VERSION } from "./types";

const LIFECYCLE_TRANSITIONS: Record<AiPolicyLifecycle, AiPolicyLifecycle[]> = {
  draft: ["active", "retired"],
  active: ["deprecated", "retired"],
  deprecated: ["retired", "active"],
  retired: [],
};

function emptyState(): AiPolicyFoundationState {
  return {
    schemaVersion: AI_POLICY_FOUNDATION_SCHEMA_VERSION,
    policies: buildDefaultPolicies(),
    governance: buildDefaultGovernance(),
    evaluationLog: [],
  };
}

export function normalizePolicyFoundationState(
  raw: Partial<AiPolicyFoundationState> | null | undefined
): AiPolicyFoundationState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  return {
    schemaVersion: AI_POLICY_FOUNDATION_SCHEMA_VERSION,
    policies:
      Array.isArray(raw.policies) && raw.policies.length > 0
        ? [...raw.policies]
        : base.policies,
    governance:
      Array.isArray(raw.governance) && raw.governance.length > 0
        ? [...raw.governance]
        : base.governance,
    evaluationLog: Array.isArray(raw.evaluationLog)
      ? [...raw.evaluationLog]
      : [],
  };
}

export class AiPolicyRegistry {
  private state: AiPolicyFoundationState = emptyState();

  reset(): void {
    this.state = emptyState();
  }

  load(raw: Partial<AiPolicyFoundationState>): void {
    this.state = normalizePolicyFoundationState(raw);
  }

  snapshot(): AiPolicyFoundationState {
    return {
      schemaVersion: this.state.schemaVersion,
      policies: [...this.state.policies],
      governance: [...this.state.governance],
      evaluationLog: [...this.state.evaluationLog],
    };
  }

  list(kind?: AiPolicyKind): AiPolicyRecord[] {
    return this.state.policies.filter((p) => (kind ? p.kind === kind : true));
  }

  get(policyId: string): AiPolicyRecord | null {
    return this.state.policies.find((p) => p.policyId === policyId) ?? null;
  }

  getBinding(capabilityId: string): AiCapabilityPolicyBinding | null {
    const bindings = this.state.policies.filter(
      (p): p is AiCapabilityPolicyBinding => p.kind === "capability_binding"
    );
    return (
      bindings.find(
        (b) =>
          b.capabilityId === capabilityId &&
          b.enabled &&
          b.lifecycle === "active"
      ) ?? null
    );
  }

  register(policy: AiPolicyRecord): AiPolicyRecord {
    if (!policy.policyId.trim()) {
      throw new AiPlatformError("invalid_input", "policyId required");
    }
    if (this.get(policy.policyId)) {
      throw new AiPlatformError(
        "invalid_input",
        `Duplicate policyId: ${policy.policyId}`
      );
    }
    this.state.policies.push(policy);
    return policy;
  }

  upsert(policy: AiPolicyRecord): AiPolicyRecord {
    const idx = this.state.policies.findIndex(
      (p) => p.policyId === policy.policyId
    );
    if (idx >= 0) {
      this.state.policies[idx] = policy;
      return policy;
    }
    return this.register(policy);
  }

  advanceLifecycle(
    policyId: string,
    next: AiPolicyLifecycle
  ): AiPolicyRecord {
    const policy = this.get(policyId);
    if (!policy) {
      throw new AiPlatformError("invalid_input", `Unknown policy: ${policyId}`);
    }
    const allowed = LIFECYCLE_TRANSITIONS[policy.lifecycle];
    if (!allowed.includes(next)) {
      throw new AiPlatformError(
        "invalid_input",
        `Invalid policy lifecycle: ${policy.lifecycle} → ${next}`
      );
    }
    const updated = { ...policy, lifecycle: next } as AiPolicyRecord;
    return this.upsert(updated);
  }

  listVersions(policyIdPrefix: string): AiPolicyRecord[] {
    return this.state.policies.filter(
      (p) =>
        p.policyId === policyIdPrefix ||
        p.policyId.startsWith(`${policyIdPrefix}.`) ||
        p.supersedesPolicyId === policyIdPrefix
    );
  }

  appendEvaluationLog(entry: AiPolicyFoundationState["evaluationLog"][number]): void {
    this.state.evaluationLog.push(entry);
    if (this.state.evaluationLog.length > 2000) {
      this.state.evaluationLog.shift();
    }
  }

  listEvaluationLog(limit = 50) {
    return this.state.evaluationLog.slice(-limit);
  }
}

export class AiGovernanceRegistry {
  constructor(private readonly policies: AiPolicyRegistry) {}

  list(): AiGovernanceRecord[] {
    return this.policies.snapshot().governance;
  }

  get(governanceId: string): AiGovernanceRecord | null {
    return this.list().find((g) => g.policyId === governanceId) ?? null;
  }

  register(record: AiGovernanceRecord): AiGovernanceRecord {
    if (!record.policyId.trim()) {
      throw new AiPlatformError("invalid_input", "governance id required");
    }
    if (this.get(record.policyId)) {
      throw new AiPlatformError(
        "invalid_input",
        `Duplicate governance id: ${record.policyId}`
      );
    }
    const snap = this.policies.snapshot();
    snap.governance.push(record);
    this.policies.load(snap);
    return record;
  }

  relatedPolicies(governanceId: string): AiPolicyRecord[] {
    const gov = this.get(governanceId);
    if (!gov) return [];
    return gov.relatedPolicyIds
      .map((id) => this.policies.get(id))
      .filter((p): p is AiPolicyRecord => Boolean(p));
  }

  advanceLifecycle(
    governanceId: string,
    next: AiPolicyLifecycle
  ): AiGovernanceRecord {
    const gov = this.get(governanceId);
    if (!gov) {
      throw new AiPlatformError(
        "invalid_input",
        `Unknown governance: ${governanceId}`
      );
    }
    const allowed = LIFECYCLE_TRANSITIONS[gov.lifecycle];
    if (!allowed.includes(next)) {
      throw new AiPlatformError(
        "invalid_input",
        `Invalid governance lifecycle: ${gov.lifecycle} → ${next}`
      );
    }
    const updated = { ...gov, lifecycle: next };
    const snap = this.policies.snapshot();
    snap.governance = snap.governance.map((g) =>
      g.policyId === governanceId ? updated : g
    );
    this.policies.load(snap);
    return updated;
  }
}

export const aiPolicyRegistry = new AiPolicyRegistry();
export const aiGovernanceRegistry = new AiGovernanceRegistry(aiPolicyRegistry);

export function resetPolicyGovernanceFoundation(): void {
  aiPolicyRegistry.reset();
}
