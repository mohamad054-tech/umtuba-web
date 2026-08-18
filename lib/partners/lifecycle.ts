/**
 * Partner onboarding lifecycle.
 * ACTIVE is impossible for REAL_PARTNER_DATA in this foundation.
 * ACTIVE also requires required rights + legal/contract approval.
 */

import type {
  DataClass,
  PartnerAuditEvent,
  PartnerLifecycleState,
  PartnerRecord,
} from "./types";
import { PARTNER_LIFECYCLE_STATES } from "./types";

export const LIFECYCLE_TRANSITIONS: Record<
  PartnerLifecycleState,
  readonly PartnerLifecycleState[]
> = {
  DRAFT: ["LEGAL_REVIEW", "TERMINATED"],
  LEGAL_REVIEW: ["APPROVED", "DRAFT", "TERMINATED"],
  APPROVED: ["INTEGRATION", "SUSPENDED", "TERMINATED"],
  INTEGRATION: ["QA", "SUSPENDED", "TERMINATED"],
  QA: ["ACTIVE", "SUSPENDED", "TERMINATED"],
  ACTIVE: ["SUSPENDED", "TERMINATED"],
  SUSPENDED: ["QA", "TERMINATED"],
  TERMINATED: [],
};

export type ActivationRequirements = {
  requiredRightsGranted: boolean;
  legalApproved: boolean;
  contractSigned: boolean;
};

export function canTransitionLifecycle(
  from: PartnerLifecycleState,
  to: PartnerLifecycleState
): boolean {
  return LIFECYCLE_TRANSITIONS[from].includes(to);
}

export function realPartnershipActiveBlocked(dataClass: DataClass): boolean {
  return dataClass === "REAL_PARTNER_DATA";
}

export function evaluateActivationGate(input: {
  partner: PartnerRecord;
  requirements: ActivationRequirements;
}): { allowed: true } | { allowed: false; reasons: string[] } {
  const reasons: string[] = [];
  if (input.partner.dataClass === "REAL_PARTNER_DATA") {
    reasons.push("REAL_PARTNER_DATA cannot be marked ACTIVE before company registration.");
  }
  if (input.partner.dataClass === "MOCK_DATA" && input.partner.displayName &&
      !/mock/i.test(input.partner.displayName)) {
    reasons.push("MOCK partners must be labeled as mock in displayName.");
  }
  if (!input.requirements.requiredRightsGranted) {
    reasons.push("Required rights are not granted.");
  }
  if (!input.requirements.legalApproved && input.partner.legalStatus !== "APPROVED") {
    reasons.push("Legal status must be APPROVED.");
  }
  if (!input.requirements.contractSigned && input.partner.contractStatus !== "SIGNED") {
    reasons.push("Contract status must be SIGNED.");
  }
  if (input.partner.lifecycle !== "QA" && input.partner.lifecycle !== "SUSPENDED") {
    reasons.push("ACTIVE is only reachable from QA (or return from SUSPENDED via QA).");
  }
  if (input.partner.credential.status === "REVOKED") {
    reasons.push("Revoked credentials cannot activate a partnership.");
  }
  if (reasons.length > 0) return { allowed: false, reasons };
  return { allowed: true };
}

export function transitionPartner(input: {
  partner: PartnerRecord;
  to: PartnerLifecycleState;
  actor: string;
  at: string;
  requirements: ActivationRequirements;
  auditId: string;
}):
  | { ok: true; partner: PartnerRecord; audit: PartnerAuditEvent }
  | { ok: false; message: string } {
  if (!(PARTNER_LIFECYCLE_STATES as readonly string[]).includes(input.to)) {
    return { ok: false, message: "Unknown lifecycle state." };
  }
  if (!canTransitionLifecycle(input.partner.lifecycle, input.to)) {
    return {
      ok: false,
      message: `Cannot transition ${input.partner.lifecycle} → ${input.to}.`,
    };
  }
  if (input.to === "ACTIVE") {
    const gate = evaluateActivationGate(input);
    if (!gate.allowed) {
      return { ok: false, message: gate.reasons.join(" ") };
    }
  }
  const partner: PartnerRecord = {
    ...input.partner,
    lifecycle: input.to,
    updatedAt: input.at,
    suspendedAt: input.to === "SUSPENDED" ? input.at : input.partner.suspendedAt,
    terminatedAt: input.to === "TERMINATED" ? input.at : input.partner.terminatedAt,
  };
  return {
    ok: true,
    partner,
    audit: {
      id: input.auditId,
      partnerId: partner.id,
      action: `lifecycle:${input.partner.lifecycle}->${input.to}`,
      actor: input.actor,
      at: input.at,
      detail: { dataClass: partner.dataClass, to: input.to },
    },
  };
}

export function countRealPartnershipsActive(
  partners: readonly PartnerRecord[]
): number {
  return partners.filter(
    (p) => p.dataClass === "REAL_PARTNER_DATA" && p.lifecycle === "ACTIVE"
  ).length;
}
