/**
 * Internal partner admin — onboarding, rights, credentials flags, audit.
 * No outbound messages. No real partnership ACTIVE.
 */

import { computeCommissionPreview, defaultCommercialConfig, validateCommercialConfig } from "./commercial";
import { emptyCredentialRef, markCredentialPresent, markCredentialRevoked, markCredentialRotated } from "./credentials";
import { countRealPartnershipsActive, evaluateActivationGate, transitionPartner } from "./lifecycle";
import type {
  DataClass,
  PartnerAuditEvent,
  PartnerCommercialConfig,
  PartnerDomain,
  PartnerLifecycleState,
  PartnerRecord,
} from "./types";

export type PartnerAdminStore = {
  partners: PartnerRecord[];
  audit: PartnerAuditEvent[];
};

export function createPartnerDraft(input: {
  id: string;
  displayName: string;
  domain: PartnerDomain;
  dataClass: DataClass;
  at: string;
  storeProviderId?: string | null;
  learningProviderId?: string | null;
}): { ok: true; partner: PartnerRecord } | { ok: false; message: string } {
  const name = input.displayName.trim();
  if (name.length < 3 || name.length > 120) {
    return { ok: false, message: "displayName must be 3–120 characters." };
  }
  if (input.dataClass === "MOCK_DATA" && !/mock/i.test(name)) {
    return { ok: false, message: "MOCK partners must include Mock in the display name." };
  }
  if (input.dataClass === "REAL_PARTNER_DATA") {
    return {
      ok: false,
      message: "REAL_PARTNER_DATA onboarding is not enabled in this pre-company foundation.",
    };
  }
  return {
    ok: true,
    partner: {
      id: input.id,
      displayName: name,
      domain: input.domain,
      dataClass: input.dataClass,
      lifecycle: "DRAFT",
      legalStatus: "NOT_STARTED",
      contractStatus: "UNSIGNED",
      credential: emptyCredentialRef(),
      commercial: defaultCommercialConfig(),
      storeProviderId: input.storeProviderId ?? null,
      learningProviderId: input.learningProviderId ?? null,
      createdAt: input.at,
      updatedAt: input.at,
      suspendedAt: null,
      terminatedAt: null,
    },
  };
}

export function applyLegalStatus(
  partner: PartnerRecord,
  legalStatus: PartnerRecord["legalStatus"],
  at: string
): PartnerRecord {
  return { ...partner, legalStatus, updatedAt: at };
}

export function applyContractStatus(
  partner: PartnerRecord,
  contractStatus: PartnerRecord["contractStatus"],
  at: string
): PartnerRecord {
  return { ...partner, contractStatus, updatedAt: at };
}

export function applyCommercialConfig(
  partner: PartnerRecord,
  commercial: PartnerCommercialConfig,
  at: string
): { ok: true; partner: PartnerRecord } | { ok: false; message: string } {
  const check = validateCommercialConfig(commercial);
  if (!check.ok) return check;
  return { ok: true, partner: { ...partner, commercial, updatedAt: at } };
}

export function partnerAdminSetCredential(
  partner: PartnerRecord,
  vaultRef: string,
  at: string
): { ok: true; partner: PartnerRecord } | { ok: false; message: string } {
  const next = markCredentialPresent(partner.credential, vaultRef, at);
  if (!next.ok) return next;
  return { ok: true, partner: { ...partner, credential: next.credential, updatedAt: at } };
}

export function partnerAdminRotateCredential(
  partner: PartnerRecord,
  nextVaultRef: string,
  at: string
): { ok: true; partner: PartnerRecord } | { ok: false; message: string } {
  const next = markCredentialRotated(partner.credential, nextVaultRef, at);
  if (!next.ok) return next;
  return { ok: true, partner: { ...partner, credential: next.credential, updatedAt: at } };
}

export function partnerAdminRevokeCredential(
  partner: PartnerRecord,
  at: string
): PartnerRecord {
  return {
    ...partner,
    credential: markCredentialRevoked(partner.credential, at),
    updatedAt: at,
  };
}

export function partnerAdminAdvance(input: {
  partner: PartnerRecord;
  to: PartnerLifecycleState;
  actor: string;
  at: string;
  auditId: string;
  requiredRightsGranted: boolean;
}): ReturnType<typeof transitionPartner> {
  return transitionPartner({
    partner: input.partner,
    to: input.to,
    actor: input.actor,
    at: input.at,
    auditId: input.auditId,
    requirements: {
      requiredRightsGranted: input.requiredRightsGranted,
      legalApproved: input.partner.legalStatus === "APPROVED",
      contractSigned: input.partner.contractStatus === "SIGNED",
    },
  });
}

export function summarizePartnerAdmin(store: PartnerAdminStore): {
  total: number;
  mock: number;
  real: number;
  activeMock: number;
  realActive: number;
  partnershipsClaimed: number;
} {
  const realActive = countRealPartnershipsActive(store.partners);
  return {
    total: store.partners.length,
    mock: store.partners.filter((p) => p.dataClass === "MOCK_DATA").length,
    real: store.partners.filter((p) => p.dataClass === "REAL_PARTNER_DATA").length,
    activeMock: store.partners.filter(
      (p) => p.dataClass === "MOCK_DATA" && p.lifecycle === "ACTIVE"
    ).length,
    realActive,
    partnershipsClaimed: realActive,
  };
}

export function previewPartnerEconomics(
  partner: PartnerRecord,
  amountMinor: number,
  currency: string
) {
  return computeCommissionPreview({
    amountMinor,
    currency,
    commissionBps: partner.commercial.commissionBps,
    taxClassification: partner.commercial.taxClassification,
  });
}

export { evaluateActivationGate, countRealPartnershipsActive };
