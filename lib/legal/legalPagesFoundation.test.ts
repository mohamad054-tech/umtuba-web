import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { SITEMAP_STATIC_ROUTES } from "../site/indexing";
import { privacyMetadata, termsMetadata } from "../site/routeMetadata";
import {
  LEGAL_DRAFT_BANNER,
  LEGAL_LAST_UPDATED,
  LEGAL_PLACEHOLDERS,
  LEGAL_PLACEHOLDER_VALUES,
} from "./constants";
import { PRIVACY_SECTIONS, PRIVACY_TITLE } from "./privacyContent";
import { TERMS_SECTIONS, TERMS_TITLE } from "./termsContent";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("legal pages foundation routes", () => {
  it("exposes /terms and /privacy in APP_ROUTES", () => {
    expect(APP_ROUTES.terms).toBe("/terms");
    expect(APP_ROUTES.privacy).toBe("/privacy");
  });

  it("ships page modules for both routes", () => {
    expect(existsSync(join(ROOT, "app/terms/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/privacy/page.tsx"))).toBe(true);
  });

  it("keeps draft legal routes out of the sitemap until Legal Approval", () => {
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/terms");
    expect(SITEMAP_STATIC_ROUTES).not.toContain("/privacy");
  });
});

describe("legal pages metadata", () => {
  it("sets titles, descriptions, canonicals, and noindex/nofollow while Draft", () => {
    expect(termsMetadata.title).toBe("Terms of Service");
    expect(privacyMetadata.title).toBe("Privacy Policy");
    expect(termsMetadata.alternates?.canonical).toBe("/terms");
    expect(privacyMetadata.alternates?.canonical).toBe("/privacy");
    expect(termsMetadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
    expect(privacyMetadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
    expect(String(termsMetadata.description)).toMatch(/draft|legal review/i);
    expect(String(privacyMetadata.description)).toMatch(/draft|legal review/i);
  });
});

describe("legal draft content contracts", () => {
  it("keeps a draft banner and last-updated date", () => {
    expect(LEGAL_DRAFT_BANNER).toMatch(/Draft for legal review/i);
    expect(LEGAL_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const shell = read("app/components/legal/LegalDocument.tsx");
    expect(shell).toContain("Draft for legal review");
    expect(shell).toContain("LEGAL_DRAFT_BANNER");
    expect(shell).toContain("LEGAL_LAST_UPDATED");
  });

  it("uses explicit legal placeholders without inventing entity details", () => {
    expect(LEGAL_PLACEHOLDERS.entityName).toBe("[LEGAL ENTITY NAME]");
    expect(LEGAL_PLACEHOLDERS.registeredAddress).toBe("[REGISTERED ADDRESS]");
    expect(LEGAL_PLACEHOLDERS.legalEmail).toBe("[LEGAL EMAIL]");
    expect(LEGAL_PLACEHOLDERS.governingLaw).toBe("[GOVERNING LAW]");

    const termsBlob = TERMS_SECTIONS.map((s) => s.paragraphs.join(" ")).join(
      " "
    );
    const privacyBlob = PRIVACY_SECTIONS.map((s) =>
      s.paragraphs.join(" ")
    ).join(" ");
    for (const placeholder of LEGAL_PLACEHOLDER_VALUES) {
      expect(termsBlob).toContain(placeholder);
      expect(privacyBlob).toContain(placeholder);
    }
    expect(termsBlob).not.toMatch(/Acme Corp|example@umtuba\.com/i);
    expect(privacyBlob).not.toMatch(/Acme Corp|example@umtuba\.com/i);
  });

  it("covers required Terms and Privacy topic sections", () => {
    expect(TERMS_TITLE).toBe("Terms of Service");
    expect(PRIVACY_TITLE).toBe("Privacy Policy");
    const termIds = TERMS_SECTIONS.map((s) => s.id);
    for (const id of [
      "about",
      "eligibility",
      "age",
      "accounts",
      "security",
      "user-content",
      "license",
      "community",
      "prohibited",
      "child-safety",
      "reporting",
      "video",
      "live",
      "stories",
      "messages",
      "store",
      "advertisers",
      "um-points",
      "ip",
      "suspension",
      "termination",
      "liability",
      "disclaimer",
      "changes",
      "governing-law",
      "contact",
    ]) {
      expect(termIds).toContain(id);
    }
    const privacyIds = PRIVACY_SECTIONS.map((s) => s.id);
    for (const id of [
      "collect",
      "profile",
      "media",
      "stories",
      "live",
      "messages",
      "device",
      "logs",
      "analytics",
      "cookies",
      "ads",
      "store",
      "rewards",
      "minors",
      "sharing",
      "retention",
      "security",
      "rights",
      "delete",
      "transfers",
      "updates",
      "contact",
    ]) {
      expect(privacyIds).toContain(id);
    }
  });
});

describe("legal link integration", () => {
  it("cross-links Terms and Privacy in the document shell", () => {
    const terms = read("app/terms/page.tsx");
    const privacy = read("app/privacy/page.tsx");
    expect(terms).toMatch(/APP_ROUTES\.privacy/);
    expect(privacy).toMatch(/APP_ROUTES\.terms/);
  });

  it("wires real Terms/Privacy links into signup, auth, landing, advertise, seller", () => {
    const signup = read("app/signup/SignupForm.tsx");
    expect(signup).toMatch(/APP_ROUTES\.terms/);
    expect(signup).toMatch(/APP_ROUTES\.privacy/);
    expect(signup).not.toMatch(
      /I accept UMTUBA's terms of use and privacy practices\./
    );

    for (const file of [
      "app/login/page.tsx",
      "app/forgot-password/page.tsx",
      "app/page.tsx",
      "app/advertise/page.tsx",
      "app/seller/page.tsx",
    ]) {
      const src = read(file);
      expect(src).toMatch(/SiteLegalLinks/);
    }
  });

  it("documents draft noindex / no-sitemap policy until Legal Approval", () => {
    expect(
      existsSync(join(ROOT, "docs/legal/LEGAL_PAGES_FOUNDATION_V1.md"))
    ).toBe(true);
    const docs = read("docs/legal/LEGAL_PAGES_FOUNDATION_V1.md");
    expect(docs).toMatch(/LEGAL ENTITY NAME/);
    expect(docs).toMatch(/Draft/);
    expect(docs).toMatch(/noindex/i);
    expect(docs).toMatch(/sitemap/i);
    expect(docs).toMatch(/Legal Approval/);
  });
});
