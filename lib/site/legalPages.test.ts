import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { isProtectedPath, PROTECTED_PREFIXES } from "../env/supabaseAuthGate";
import {
  LEGAL_CRN,
  LEGAL_DRAFT_BANNER_ENABLED,
  LEGAL_REGISTERED_ADDRESS,
} from "../legal/company";
import { LEGAL_DOCUMENTS, LEGAL_FOOTER_NAV } from "../legal/legalDocuments";
import { legalArMessages, legalEnMessages } from "../i18n/messages/legalCatalogs";
import { SITEMAP_STATIC_ROUTES } from "./indexing";
import {
  aboutMetadata,
  accountDeletionMetadata,
  communityGuidelinesMetadata,
  cookiesMetadata,
  copyrightMetadata,
  dataExportMetadata,
  privacyMetadata,
  supportMetadata,
  termsMetadata,
} from "./routeMetadata";

const ROOT = process.cwd();

const PUBLIC_LEGAL_PATHS = [
  "/privacy",
  "/terms",
  "/account-deletion",
  "/support",
  "/cookies",
  "/community-guidelines",
  "/copyright",
  "/about",
  "/data-export",
] as const;

describe("legal public routes", () => {
  it("exposes nine legal App Router pages", () => {
    expect(APP_ROUTES.privacy).toBe("/privacy");
    expect(APP_ROUTES.terms).toBe("/terms");
    expect(APP_ROUTES.accountDeletion).toBe("/account-deletion");
    expect(APP_ROUTES.support).toBe("/support");
    expect(APP_ROUTES.cookies).toBe("/cookies");
    expect(APP_ROUTES.communityGuidelines).toBe("/community-guidelines");
    expect(APP_ROUTES.copyright).toBe("/copyright");
    expect(APP_ROUTES.about).toBe("/about");
    expect(APP_ROUTES.dataExport).toBe("/data-export");
    expect(existsSync(join(ROOT, "app/privacy/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/terms/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/account-deletion/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/support/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/cookies/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/community-guidelines/page.tsx"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, "app/copyright/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/about/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/data-export/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/legal"))).toBe(false);
  });

  it("keeps legal pages outside auth-protected prefixes", () => {
    for (const path of PUBLIC_LEGAL_PATHS) {
      expect(isProtectedPath(path)).toBe(false);
      expect(PROTECTED_PREFIXES).not.toContain(path);
    }
  });

  it("indexes all nine legal routes", () => {
    for (const path of PUBLIC_LEGAL_PATHS) {
      expect(SITEMAP_STATIC_ROUTES).toContain(path);
    }
    expect(privacyMetadata.alternates?.canonical).toBe("/privacy");
    expect(termsMetadata.alternates?.canonical).toBe("/terms");
    expect(accountDeletionMetadata.alternates?.canonical).toBe(
      "/account-deletion"
    );
    expect(supportMetadata.alternates?.canonical).toBe("/support");
    expect(cookiesMetadata.alternates?.canonical).toBe("/cookies");
    expect(communityGuidelinesMetadata.alternates?.canonical).toBe(
      "/community-guidelines"
    );
    expect(copyrightMetadata.alternates?.canonical).toBe("/copyright");
    expect(aboutMetadata.alternates?.canonical).toBe("/about");
    expect(dataExportMetadata.alternates?.canonical).toBe("/data-export");
    expect(privacyMetadata.robots).toMatchObject({ index: true, follow: true });
  });

  it("does not leave Beta legal copy reachable", () => {
    const englishBodies = [
      legalEnMessages["legal.privacy.body"],
      legalEnMessages["legal.terms.body"],
    ].join(" ");
    expect(englishBodies.toLowerCase()).not.toContain("beta soft-launch");
    expect(LEGAL_DOCUMENTS).toHaveLength(9);
    expect(LEGAL_FOOTER_NAV).toHaveLength(9);
    expect(LEGAL_DRAFT_BANNER_ENABLED).toBe(true);
  });

  it("keeps address and CRN as visible placeholders", () => {
    expect(LEGAL_REGISTERED_ADDRESS).toBe("[[REGISTERED ADDRESS]]");
    expect(LEGAL_CRN).toBe("[[CRN]]");
    expect(legalEnMessages["legal.privacy.body"]).toContain(
      "{registeredAddress}"
    );
    expect(legalEnMessages["legal.privacy.body"]).toContain("{crn}");
    expect(legalArMessages["legal.disclaimer.translation"]).toContain(
      "تسري النسخة الإنجليزية"
    );
  });
});
