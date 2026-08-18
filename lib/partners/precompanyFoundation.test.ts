import { describe, expect, it } from "vitest";
import {
  applyCommercialConfig,
  applyContractStatus,
  applyLegalStatus,
  createPartnerDraft,
  partnerAdminAdvance,
  partnerAdminSetCredential,
  summarizePartnerAdmin,
} from "./admin";
import { assertNoPlaintextSecret } from "./credentials";
import { computeCommissionPreview, createPayoutPlaceholder } from "./commercial";
import { evaluateActivationGate } from "./lifecycle";

describe("Partner admin foundation", () => {
  it("onboards a mock partner through QA and allows ACTIVE only with rights + approval", () => {
    const created = createPartnerDraft({
      id: "99999999-9999-4999-8999-999999999999",
      displayName: "UMTUBA Mock Store Partner",
      domain: "BOTH",
      dataClass: "MOCK_DATA",
      at: "2026-08-18T08:00:00.000Z",
      storeProviderId: "11111111-1111-4111-8111-111111111111",
      learningProviderId: "44444444-4444-4444-8444-444444444444",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    let partner = applyLegalStatus(created.partner, "APPROVED", "2026-08-18T08:10:00.000Z");
    partner = applyContractStatus(partner, "SIGNED", "2026-08-18T08:11:00.000Z");
    const commercial = applyCommercialConfig(
      partner,
      {
        ...partner.commercial,
        markets: ["US", "TR"],
        currencies: ["USD", "TRY"],
        commissionBps: 1500,
        taxClassification: "VAT_PLACEHOLDER",
      },
      "2026-08-18T08:12:00.000Z"
    );
    expect(commercial.ok).toBe(true);
    if (!commercial.ok) return;
    partner = commercial.partner;

    const cred = partnerAdminSetCredential(partner, "vault://partners/mock-store/v1", "2026-08-18T08:13:00.000Z");
    expect(cred.ok).toBe(true);
    if (!cred.ok) return;
    partner = cred.partner;

    const steps = ["LEGAL_REVIEW", "APPROVED", "INTEGRATION", "QA"] as const;
    let auditN = 0;
    for (const to of steps) {
      const next = partnerAdminAdvance({
        partner,
        to,
        actor: "central-admin",
        at: "2026-08-18T08:20:00.000Z",
        auditId: `audit-${++auditN}`,
        requiredRightsGranted: true,
      });
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      partner = next.partner;
    }

    const blocked = evaluateActivationGate({
      partner,
      requirements: {
        requiredRightsGranted: false,
        legalApproved: true,
        contractSigned: true,
      },
    });
    expect(blocked.allowed).toBe(false);

    const activated = partnerAdminAdvance({
      partner,
      to: "ACTIVE",
      actor: "central-admin",
      at: "2026-08-18T08:30:00.000Z",
      auditId: "audit-active",
      requiredRightsGranted: true,
    });
    expect(activated.ok).toBe(true);
    if (!activated.ok) return;
    expect(activated.partner.lifecycle).toBe("ACTIVE");
    expect(activated.partner.dataClass).toBe("MOCK_DATA");

    const summary = summarizePartnerAdmin({
      partners: [activated.partner],
      audit: [activated.audit],
    });
    expect(summary.realActive).toBe(0);
    expect(summary.partnershipsClaimed).toBe(0);
    expect(summary.activeMock).toBe(1);
  });

  it("refuses REAL_PARTNER_DATA drafts and plaintext secrets", () => {
    const real = createPartnerDraft({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      displayName: "Acme Corp",
      domain: "STORE",
      dataClass: "REAL_PARTNER_DATA",
      at: "2026-08-18T08:00:00.000Z",
    });
    expect(real.ok).toBe(false);
    expect(assertNoPlaintextSecret({ apiKey: "sk-live-example" }).ok).toBe(false);
    expect(assertNoPlaintextSecret({ vaultRef: "sk-live-example" }).ok).toBe(false);
    expect(assertNoPlaintextSecret({ vaultRef: "vault://partners/mock/v1" }).ok).toBe(true);
  });

  it("computes commission placeholders without making them payable", () => {
    const preview = computeCommissionPreview({
      amountMinor: 10_000,
      currency: "usd",
      commissionBps: 1500,
      taxClassification: "VAT_PLACEHOLDER",
    });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.preview.platformMinor).toBe(1500);
    expect(preview.preview.collectable).toBe(false);
    expect(preview.preview.payable).toBe(false);
    const ledger = createPayoutPlaceholder({
      id: "pay-1",
      partnerId: "p1",
      orderOrEnrollmentId: "ord-1",
      attributionKind: "ORDER",
      currency: "USD",
      amountMinor: 1500,
    });
    expect(ledger.ok).toBe(true);
    if (!ledger.ok) return;
    expect(ledger.entry.status).toBe("PLACEHOLDER");
  });
});
