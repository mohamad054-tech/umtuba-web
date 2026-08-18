import { describe, expect, it } from "vitest";
import { importLearningCourses } from "../learning/providers/importContract";
import { MOCK_PROVIDER_B_COURSES, mockProviderB } from "../learning/providers/mockProviderB";
import {
  evaluateAiTutorIngest,
  evaluateCertificateIssuance,
  evaluateContentHosting,
  evaluateLearningRight,
} from "../learning/providers/rights";
import { UMTUBA_DEMO_PRODUCTS } from "../store/demo/catalog";
import { assertDemoIsolation, demoCheckoutSandbox } from "../store/demo/surface";
import { importStoreCatalog } from "../store/providers/importPipeline";
import { canBecomeProductionPurchasable } from "../store/providers/mockIsolation";
import {
  MOCK_PROVIDER_A_CATALOG,
  mockNoResellProvider,
  mockProviderA,
} from "../store/providers/mockProviderA";
import { mockDenyCatalogProvider, mockWholesaleProvider } from "../store/providers/mockFixtures";
import {
  evaluateStoreCheckoutGate,
  evaluateStoreImagePublishGate,
  evaluateStorePublishGate,
  evaluateStoreQaCatalogGate,
  evaluateStoreRight,
} from "../store/providers/rights";
import { createPartnerDraft } from "./admin";
import {
  COMMERCE_INTERNAL_PLACEHOLDERS,
  LEARNING_INTERNAL_PLACEHOLDERS,
  assertNotPublicUmtubaPartner,
  publicSurfaceMayClaimPartnership,
  summarizeInternalPlaceholders,
} from "./internalPlaceholders";
import { evaluateActivationGate, realPartnershipActiveBlocked } from "./lifecycle";

const AT = "2026-08-18T14:00:00.000Z";

describe("P4 negative rights after owned/demo content", () => {
  it("denies catalog, image, resell, hosting, AI, and certificate rights", () => {
    const noCatalog = mockDenyCatalogProvider();
    const catalogRun = importStoreCatalog({
      runId: "p4-catalog",
      provider: noCatalog,
      records: MOCK_PROVIDER_A_CATALOG.slice(0, 1),
      at: AT,
    });
    expect(evaluateStoreQaCatalogGate({ provider: noCatalog, item: catalogRun.accepted[0] }).allowed).toBe(false);

    const noImage = mockWholesaleProvider();
    const imageRun = importStoreCatalog({
      runId: "p4-image",
      provider: noImage,
      records: MOCK_PROVIDER_A_CATALOG.slice(0, 1),
      at: AT,
    });
    expect(evaluateStoreImagePublishGate({ provider: noImage, item: imageRun.accepted[0] }).allowed).toBe(false);

    const noResell = mockNoResellProvider();
    expect(evaluateStoreRight(noResell, "RESELL_ALLOWED").allowed).toBe(false);

    const partner = mockProviderB();
    const learn = importLearningCourses({
      runId: "p4-learn",
      provider: partner,
      records: MOCK_PROVIDER_B_COURSES.slice(0, 1),
      at: AT,
    });
    const course = learn.accepted[0];
    expect(evaluateContentHosting({ provider: partner, course }).allowed).toBe(false);
    expect(evaluateLearningRight(partner, "AI_USAGE_ALLOWED").allowed).toBe(false);
    expect(evaluateAiTutorIngest({ provider: partner, course }).allowed).toBe(false);
    expect(evaluateCertificateIssuance({ provider: partner, course }).allowed).toBe(false);
  });

  it("keeps MOCK/DEMO from becoming real partner inventory or ACTIVE real partnerships", () => {
    expect(canBecomeProductionPurchasable({ dataClass: "MOCK_DATA" })).toBe(false);
    expect(canBecomeProductionPurchasable({ dataClass: "REAL_PARTNER_DATA" })).toBe(false);
    expect(realPartnershipActiveBlocked("REAL_PARTNER_DATA")).toBe(true);

    const provider = mockProviderA();
    const run = importStoreCatalog({
      runId: "p4-mock-a",
      provider,
      records: MOCK_PROVIDER_A_CATALOG.slice(0, 1),
      at: AT,
    });
    expect(run.accepted[0].dataClass).toBe("MOCK_DATA");
    expect(evaluateStorePublishGate({ provider, item: run.accepted[0] }).allowed).toBe(false);
    expect(evaluateStoreCheckoutGate({ provider, item: run.accepted[0] }).allowed).toBe(false);

    for (const product of UMTUBA_DEMO_PRODUCTS) {
      expect(assertDemoIsolation(product).ok).toBe(true);
    }
    expect(demoCheckoutSandbox().allowed).toBe(false);

    const real = createPartnerDraft({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      displayName: "Placeholder Commerce Inc",
      domain: "STORE",
      dataClass: "REAL_PARTNER_DATA",
      at: AT,
    });
    expect(real.ok).toBe(false);

    const blocked = evaluateActivationGate({
      partner: {
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        displayName: "Placeholder Commerce Inc",
        domain: "STORE",
        dataClass: "REAL_PARTNER_DATA",
        lifecycle: "QA",
        legalStatus: "APPROVED",
        contractStatus: "SIGNED",
        credential: {
          status: "PRESENT",
          vaultRef: "vault://partners/placeholder/v1",
          rotatedAt: null,
          revokedAt: null,
          lastPresenceCheckAt: null,
        },
        commercial: {
          markets: ["US"],
          currencies: ["USD"],
          languages: ["en"],
          commissionBps: 0,
          revenueShareBps: 0,
          taxClassification: "UNCLASSIFIED",
          startsAt: null,
          endsAt: null,
        },
        storeProviderId: null,
        learningProviderId: null,
        createdAt: AT,
        updatedAt: AT,
        suspendedAt: null,
        terminatedAt: null,
      },
      requirements: {
        requiredRightsGranted: true,
        legalApproved: true,
        contractSigned: true,
      },
    });
    expect(blocked.allowed).toBe(false);
  });

  it("keeps named companies as internal placeholders, not public partners", () => {
    expect(COMMERCE_INTERNAL_PLACEHOLDERS).toHaveLength(8);
    expect(LEARNING_INTERNAL_PLACEHOLDERS).toHaveLength(7);
    const summary = summarizeInternalPlaceholders();
    expect(summary.outreachSent).toBe(0);
    expect(summary.partnershipsClaimed).toBe(0);
    expect(summary.publicPartnerNames).toEqual([]);
    expect(assertNotPublicUmtubaPartner("SHEIN").ok).toBe(false);
    expect(assertNotPublicUmtubaPartner("Coursera").ok).toBe(false);
    expect(publicSurfaceMayClaimPartnership("Amazon")).toBe(false);
  });
});
