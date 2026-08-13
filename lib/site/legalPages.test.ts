import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import {
  isProtectedPath,
  PROTECTED_PREFIXES,
} from "../env/supabaseAuthGate";
import {
  LEGAL_BETA_NOTICE,
  LEGAL_CONTACT_LINE,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
} from "../legal/legalDocuments";
import { SITEMAP_STATIC_ROUTES } from "./indexing";
import { privacyMetadata, termsMetadata, accountDeletionMetadata } from "./routeMetadata";

const ROOT = process.cwd();

function readRepo(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("Legal Pages V1 routes and public access", () => {
  it("exposes /terms, /privacy, and /account-deletion app routes", () => {
    expect(APP_ROUTES.terms).toBe("/terms");
    expect(APP_ROUTES.privacy).toBe("/privacy");
    expect(APP_ROUTES.accountDeletion).toBe("/account-deletion");
    expect(existsSync(join(ROOT, "app/terms/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/privacy/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/account-deletion/page.tsx"))).toBe(true);
  });

  it("keeps legal pages outside auth-protected prefixes", () => {
    expect(isProtectedPath("/terms")).toBe(false);
    expect(isProtectedPath("/privacy")).toBe(false);
    expect(isProtectedPath("/account-deletion")).toBe(false);
    expect(PROTECTED_PREFIXES).not.toContain("/terms");
    expect(PROTECTED_PREFIXES).not.toContain("/privacy");
    expect(PROTECTED_PREFIXES).not.toContain("/account-deletion");
  });

  it("indexes legal pages in sitemap and route metadata", () => {
    expect(SITEMAP_STATIC_ROUTES).toContain("/terms");
    expect(SITEMAP_STATIC_ROUTES).toContain("/privacy");
    expect(SITEMAP_STATIC_ROUTES).toContain("/account-deletion");
    expect(termsMetadata.alternates?.canonical).toBe("/terms");
    expect(privacyMetadata.alternates?.canonical).toBe("/privacy");
    expect(accountDeletionMetadata.alternates?.canonical).toBe(
      "/account-deletion"
    );
    expect(termsMetadata.robots).toMatchObject({ index: true, follow: true });
    expect(privacyMetadata.robots).toMatchObject({ index: true, follow: true });
    expect(accountDeletionMetadata.robots).toMatchObject({
      index: true,
      follow: true,
    });
  });
});

describe("Legal Pages V1 signup and document contracts", () => {
  it("wires signup acceptance to Terms and Privacy links", () => {
    const signup = readRepo("app/signup/SignupForm.tsx");
    expect(signup).toMatch(/APP_ROUTES\.terms/);
    expect(signup).toMatch(/APP_ROUTES\.privacy/);
    expect(signup).toMatch(/Terms of Use/);
    expect(signup).toMatch(/Privacy Policy/);
    expect(signup).not.toMatch(
      /I accept UMTUBA's terms of use and privacy practices\./
    );
  });

  it("keeps beta notice and avoids invented legal contact or E2E claims", () => {
    expect(LEGAL_BETA_NOTICE.toLowerCase()).toContain("beta");
    expect(LEGAL_CONTACT_LINE).toMatch(/contact method provided on UMTUBA/i);
    const termsBlob = TERMS_SECTIONS.map((s) => s.paragraphs.join(" ")).join(
      " "
    );
    const privacyBlob = PRIVACY_SECTIONS.flatMap((s) => [
      ...s.paragraphs,
      ...(s.bullets ?? []),
      ...(s.closingParagraphs ?? []),
    ]).join(" ");
    expect(termsBlob).not.toMatch(/@umtuba\.com/i);
    expect(privacyBlob.toLowerCase()).not.toMatch(/end-to-end encrypted/);
    expect(privacyBlob).toMatch(/Supabase/);
    expect(privacyBlob).toMatch(/LiveKit/);
    expect(privacyBlob).toMatch(/\/account-deletion/);
    expect(privacyBlob.toLowerCase()).toMatch(/does not delete the account immediately/);
    expect(termsBlob).toMatch(/\/account-deletion/);
  });

  it("covers required Terms and Privacy topic anchors", () => {
    const termIds = TERMS_SECTIONS.map((s) => s.id);
    for (const id of [
      "acceptance",
      "eligibility",
      "accounts",
      "user-content",
      "license",
      "conduct",
      "live-messages",
      "um-points",
      "store",
      "ip",
      "suspension",
      "disclaimers",
      "liability",
      "changes",
      "contact",
    ]) {
      expect(termIds).toContain(id);
    }

    const privacyIds = PRIVACY_SECTIONS.map((s) => s.id);
    for (const id of [
      "overview",
      "data-you-provide",
      "usage-device",
      "location",
      "permissions",
      "purposes",
      "processors",
      "sharing",
      "retention",
      "account-deletion",
      "security",
      "rights",
      "children",
      "international",
      "cookies",
      "changes",
      "contact",
    ]) {
      expect(privacyIds).toContain(id);
    }
  });
});
