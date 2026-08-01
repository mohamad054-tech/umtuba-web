/**
 * Commerce Commission Policy Activation V1.
 * Safe activate/deactivate lifecycle for currency-scoped commission policies.
 * Server-only. Fail closed. Idempotent. Does not invent rates or mutate money paths.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const COMMISSION_POLICY_ACTIVATION_ID =
  "commerce.revenue.commission_policy_activation_v1" as const;

export const STORE_COMMISSION_POLICY_ACTIVATE_RPC =
  "activate_store_commission_policy" as const;

export const STORE_COMMISSION_POLICY_DEACTIVATE_RPC =
  "deactivate_store_commission_policy" as const;

type AnyClient = SupabaseClient;

export type CommissionPolicyActivationResult =
  | {
      status: "activated";
      replayed: boolean;
      policyCode: string;
      policyVersion: number;
      currency: string;
      fromStatus: string;
      toStatus: string;
      supersededPolicyCode: string | null;
      supersededPolicyVersion: number | null;
      data: Record<string, unknown>;
    }
  | { status: "failed"; message: string };

export type CommissionPolicyDeactivationResult =
  | {
      status: "deactivated";
      replayed: boolean;
      policyCode: string;
      policyVersion: number;
      currency: string;
      fromStatus: string;
      toStatus: string;
      data: Record<string, unknown>;
    }
  | { status: "failed"; message: string };

export function buildCommissionPolicyActivateEventKey(input: {
  policyCode: string;
  version: number;
  nonce: string;
}): string {
  return `commission:activate:${input.policyCode.trim().toLowerCase()}:v${input.version}:${input.nonce.trim()}`;
}

export function buildCommissionPolicyDeactivateEventKey(input: {
  policyCode: string;
  version: number;
  nonce: string;
}): string {
  return `commission:deactivate:${input.policyCode.trim().toLowerCase()}:v${input.version}:${input.nonce.trim()}`;
}

function validateEventKey(
  eventKey: string
): { ok: true; key: string } | { ok: false; message: string } {
  const key = eventKey.trim();
  if (key.length < 8 || key.length > 160) {
    return {
      ok: false,
      message: "event_key must be 8..160 characters.",
    };
  }
  return { ok: true, key };
}

function validateCorrelationId(
  correlationId: string
): { ok: true; id: string } | { ok: false; message: string } {
  const id = correlationId.trim();
  if (id.length < 8 || id.length > 128) {
    return {
      ok: false,
      message: "correlation_id must be 8..128 characters.",
    };
  }
  return { ok: true, id };
}

export async function activateCommissionPolicy(
  supabase: AnyClient,
  input: {
    policyCode: string;
    version: number;
    eventKey: string;
    correlationId: string;
  }
): Promise<CommissionPolicyActivationResult> {
  const code = input.policyCode.trim().toLowerCase();
  if (!code) {
    return { status: "failed", message: "policy_code is required." };
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    return {
      status: "failed",
      message: "policy version must be an integer >= 1.",
    };
  }
  const eventKey = validateEventKey(input.eventKey);
  if (!eventKey.ok) return { status: "failed", message: eventKey.message };
  const correlation = validateCorrelationId(input.correlationId);
  if (!correlation.ok) {
    return { status: "failed", message: correlation.message };
  }

  const { data, error } = await supabase.rpc(
    STORE_COMMISSION_POLICY_ACTIVATE_RPC,
    {
      p_policy_code: code,
      p_version: input.version,
      p_event_key: eventKey.key,
      p_correlation_id: correlation.id,
    }
  );

  if (error) {
    return {
      status: "failed",
      message:
        error.message?.trim() || "Commission policy activation failed.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  if (!Boolean(payload.ok)) {
    return {
      status: "failed",
      message: "Commission policy activation returned a non-ok payload.",
    };
  }

  return {
    status: "activated",
    replayed: Boolean(payload.replayed),
    policyCode: String(payload.policy_code ?? code),
    policyVersion: Number(payload.policy_version ?? input.version),
    currency: String(payload.currency ?? ""),
    fromStatus: String(payload.from_status ?? ""),
    toStatus: String(payload.to_status ?? "active"),
    supersededPolicyCode:
      typeof payload.superseded_policy_code === "string"
        ? payload.superseded_policy_code
        : null,
    supersededPolicyVersion:
      payload.superseded_policy_version == null
        ? null
        : Number(payload.superseded_policy_version),
    data: payload,
  };
}

export async function deactivateCommissionPolicy(
  supabase: AnyClient,
  input: {
    policyCode: string;
    version: number;
    eventKey: string;
    correlationId: string;
  }
): Promise<CommissionPolicyDeactivationResult> {
  const code = input.policyCode.trim().toLowerCase();
  if (!code) {
    return { status: "failed", message: "policy_code is required." };
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    return {
      status: "failed",
      message: "policy version must be an integer >= 1.",
    };
  }
  const eventKey = validateEventKey(input.eventKey);
  if (!eventKey.ok) return { status: "failed", message: eventKey.message };
  const correlation = validateCorrelationId(input.correlationId);
  if (!correlation.ok) {
    return { status: "failed", message: correlation.message };
  }

  const { data, error } = await supabase.rpc(
    STORE_COMMISSION_POLICY_DEACTIVATE_RPC,
    {
      p_policy_code: code,
      p_version: input.version,
      p_event_key: eventKey.key,
      p_correlation_id: correlation.id,
    }
  );

  if (error) {
    return {
      status: "failed",
      message:
        error.message?.trim() || "Commission policy deactivation failed.",
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  if (!Boolean(payload.ok)) {
    return {
      status: "failed",
      message: "Commission policy deactivation returned a non-ok payload.",
    };
  }

  return {
    status: "deactivated",
    replayed: Boolean(payload.replayed),
    policyCode: String(payload.policy_code ?? code),
    policyVersion: Number(payload.policy_version ?? input.version),
    currency: String(payload.currency ?? ""),
    fromStatus: String(payload.from_status ?? ""),
    toStatus: String(payload.to_status ?? "disabled"),
    data: payload,
  };
}
