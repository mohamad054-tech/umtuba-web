import { assertProspectiveNeverActive, PROSPECTIVE_LEARNING_PARTNERS } from "../fixtures/partners";
import type { LifecycleStatus, ProspectivePartner } from "../fixtures/types";

export type AdminPartnerAction = "REVIEW" | "SUSPEND" | "ACTIVATE";

export type AdminActionResult = {
  ok: boolean;
  partnerId: string;
  action: AdminPartnerAction;
  status: ProspectivePartner["status"] | LifecycleStatus;
  reason: string;
};

export function attemptAdminPartnerAction(
  partner: ProspectivePartner,
  action: AdminPartnerAction
): AdminActionResult {
  if (!assertProspectiveNeverActive(partner) || partner.status === "PROSPECTIVE") {
    if (action === "ACTIVATE") {
      return {
        ok: false,
        partnerId: partner.id,
        action,
        status: "PROSPECTIVE",
        reason: "PROSPECTIVE_CANNOT_BECOME_ACTIVE. Text-only review record. Not a contract.",
      };
    }
  }
  if (action === "ACTIVATE") {
    return {
      ok: false,
      partnerId: partner.id,
      action,
      status: partner.status,
      reason: "PROSPECTIVE_CANNOT_BECOME_ACTIVE",
    };
  }
  return {
    ok: true,
    partnerId: partner.id,
    action,
    status: "PROSPECTIVE",
    reason:
      action === "SUSPEND"
        ? "Preview label only. Prospective record stays PROSPECTIVE and is not a live partner."
        : "Review noted. Status remains PROSPECTIVE.",
  };
}

export function listProspectiveLearningPartners(): readonly ProspectivePartner[] {
  return PROSPECTIVE_LEARNING_PARTNERS;
}

export function adminCanMutateProduction(): false {
  return false;
}
