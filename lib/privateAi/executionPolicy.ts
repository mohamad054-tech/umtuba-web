import type { ExecutionPolicy, ExecutionQuotaContract } from "./types";

export const DEFAULT_EXECUTION_POLICY: ExecutionPolicy = {
  requireReadyRuntime: true,
  requireApprovedModelLifecycle: true,
  requireInferencePermission: true,
  allowOfflineRuntime: false,
  maxTimeoutMs: 120_000,
  defaultTimeoutMs: 30_000,
};

export const DEFAULT_EXECUTION_QUOTA: ExecutionQuotaContract = {
  requestQuota: 100,
  dailyQuota: 1_000,
  tenantQuota: 5_000,
  requestsUsed: 0,
  dailyUsed: 0,
  tenantUsed: 0,
};

export function resolveExecutionPolicy(
  policy?: Partial<ExecutionPolicy> | null
): ExecutionPolicy {
  return { ...DEFAULT_EXECUTION_POLICY, ...(policy ?? {}) };
}

export function resolveExecutionQuota(
  quota?: Partial<ExecutionQuotaContract> | null
): ExecutionQuotaContract {
  return { ...DEFAULT_EXECUTION_QUOTA, ...(quota ?? {}) };
}
