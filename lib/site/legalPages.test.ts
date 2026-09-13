import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { isProtectedPath, PROTECTED_PREFIXES } from "../env/supabaseAuthGate";
import { COMPANY_NUMBER_PLACEHOLDER, REGISTERED_ADDRESS_PLACEHOLDER } from "../legal/company";
import { LEGAL_DRAFT_BANNER_ENABLED } from "../legal/draftBanner";
import {
  ABOUT_PAGE,
  COMMUNITY_PAGE,
  CONTACT_PAGE,
  COOKIES_PAGE,
  COPYRIGHT_PAGE,
  DELETE_PAGE,
  EXPORT_PAGE,
  PRIVACY_PAGE,
  TERMS_PAGE,
} from "../legal/pageSpecs";
import { legalEnMessages } from "../i18n/messages/legalCatalogs";
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

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("Legal pages routes and public access", () => {
  it("exposes the nine public legal routes without /legal/*", () => {
    expect(APP_ROUTES.privacy).toBe("/privacy");
    expect(APP_ROUTES.terms).toBe("/terms");
    expect(APP_ROUTES.cookies).toBe("/cookies");
    expect(APP_ROUTES.communityGuidelines).toBe("/community-guidelines");
    expect(APP_ROUTES.copyright).toBe("/copyright");
    expect(APP_ROUTES.support).toBe("/support");
    expect(APP_ROUTES.about).toBe("/about");
    expect(APP_ROUTES.accountDeletion).toBe("/account-deletion");
    expect(APP_ROUTES.dataExport).toBe("/data-export");
    for (const path of [
      "app/privacy/page.tsx",
      "app/terms/page.tsx",
      "app/cookies/page.tsx",
      "app/community-guidelines/page.tsx",
      "app/copyright/page.tsx",
      "app/support/page.tsx",
      "app/about/page.tsx",
      "app/account-deletion/page.tsx",
      "app/data-export/page.tsx",
    ]) {
      expect(existsSync(join(ROOT, path))).toBe(true);
    }
    expect(existsSync(join(ROOT, "app/legal"))).toBe(false);
  });

  it("keeps legal pages outside auth-protected prefixes", () => {
    for (const path of [
      "/terms",
      "/privacy",
      "/cookies",
      "/community-guidelines",
      "/copyright",
      "/about",
      "/account-deletion",
      "/data-export",
      "/support",
    ]) {
      expect(isProtectedPath(path)).toBe(false);
      expect(PROTECTED_PREFIXES).not.toContain(path);
    }
  });

  it("indexes all nine legal pages", () => {
    for (const path of [
      "/terms",
      "/privacy",
      "/cookies",
      "/community-guidelines",
      "/copyright",
      "/about",
      "/account-deletion",
      "/data-export",
      "/support",
    ]) {
      expect(SITEMAP_STATIC_ROUTES).toContain(path);
    }
    expect(termsMetadata.alternates?.canonical).toBe("/terms");
    expect(privacyMetadata.alternates?.canonical).toBe("/privacy");
    expect(cookiesMetadata.alternates?.canonical).toBe("/cookies");
    expect(communityGuidelinesMetadata.alternates?.canonical).toBe(
      "/community-guidelines"
    );
    expect(copyrightMetadata.alternates?.canonical).toBe("/copyright");
    expect(aboutMetadata.alternates?.canonical).toBe("/about");
    expect(accountDeletionMetadata.alternates?.canonical).toBe(
      "/account-deletion"
    );
    expect(dataExportMetadata.alternates?.canonical).toBe("/data-export");
    expect(supportMetadata.alternates?.canonical).toBe("/support");
  });
});

describe("Legal pages source contract", () => {
  it("wires signup acceptance to Terms and Privacy links", () => {
    const signup = readRepo("app/signup/SignupForm.tsx");
    expect(signup).toMatch(/APP_ROUTES\.terms/);
    expect(signup).toMatch(/APP_ROUTES\.privacy/);
    expect(signup).toMatch(/auth\.signup\.termsOfUse/);
    expect(signup).toMatch(/auth\.signup\.privacyPolicy/);
  });

  it("keeps company placeholders and does not invent address or CRN", () => {
    expect(REGISTERED_ADDRESS_PLACEHOLDER).toBe("[[REGISTERED ADDRESS]]");
    expect(COMPANY_NUMBER_PLACEHOLDER).toBe("[[CRN]]");
    const company = readRepo("lib/legal/company.ts");
    expect(company).not.toMatch(/\d{5,}/);
    expect(LEGAL_DRAFT_BANNER_ENABLED).toBe(true);
  });

  it("uses source legal copy, not the retired Beta documents", () => {
    const legalModule = readRepo("lib/legal/legalDocuments.ts");
    expect(legalModule).not.toMatch(/Beta soft-launch/);
    expect(legalModule).not.toMatch(/LEGAL_BETA_NOTICE/);
    expect(legalEnMessages["legal.privacy.title"]).toBe("Privacy Policy");
    expect(legalEnMessages["legal.terms.title"]).toBe("Terms of Service");
    expect(legalEnMessages["legal.privacy.who.p1"]).toMatch(/data controller/);
    expect(legalEnMessages["legal.privacy.who.p1"]).not.toMatch(/Supabase/);
    expect(PRIVACY_PAGE.path).toBe("/privacy");
    expect(TERMS_PAGE.path).toBe("/terms");
    expect(COOKIES_PAGE.path).toBe("/cookies");
    expect(COMMUNITY_PAGE.path).toBe("/community-guidelines");
    expect(COPYRIGHT_PAGE.path).toBe("/copyright");
    expect(CONTACT_PAGE.path).toBe("/support");
    expect(ABOUT_PAGE.path).toBe("/about");
    expect(DELETE_PAGE.path).toBe("/account-deletion");
    expect(EXPORT_PAGE.path).toBe("/data-export");
  });
});
