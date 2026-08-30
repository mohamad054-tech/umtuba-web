import { describe, expect, it } from "vitest";
import {
  connectionsIsOwnerOnly,
  FORBIDDEN_MILESTONE_CATEGORIES,
  PROFILE_MILESTONE_CATEGORIES,
  sanitizeHttpsUrl,
  tagDuplicateKey,
  validateBioLong,
  validateEducationDraft,
  validateLinkDraft,
  validateMilestoneDraft,
  validatePlaceDraft,
  validateTagDraft,
  validateWorkDraft,
} from "../profile/richProfileContract";

describe("rich profile contract", () => {
  it("accepts https websites and rejects unsafe URLs", () => {
    expect(sanitizeHttpsUrl("https://example.com/me")).toBe(
      "https://example.com/me"
    );
    expect(sanitizeHttpsUrl("example.com")).toBe("https://example.com/");
    expect(sanitizeHttpsUrl("http://example.com")).toBeNull();
    expect(sanitizeHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeHttpsUrl("data:text/html,hi")).toBeNull();
    expect(sanitizeHttpsUrl("https://user:pass@evil.test")).toBeNull();
  });

  it("validates places without street or coordinates", () => {
    const ok = validatePlaceDraft({
      placeKind: "hometown",
      label: " Cairo home ",
      city: "Cairo",
      country: "Egypt",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.label).toBe("Cairo home");
      expect(ok.value.visibility).toBe("public");
    }
    expect(validatePlaceDraft({ placeKind: "hometown", label: "  " }).ok).toBe(
      false
    );
  });

  it("lets work exist without an employer", () => {
    const ok = validateWorkDraft({
      title: "Documentary editor",
      workKind: "independent",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.organization).toBeNull();
      expect(ok.value.title).toBe("Documentary editor");
    }
  });

  it("prevents duplicate tags on the same kind/label", () => {
    expect(tagDuplicateKey("skill", " Film ")).toBe(
      tagDuplicateKey("skill", "film")
    );
    expect(validateTagDraft({ kind: "skill", label: "  " }).ok).toBe(false);
  });

  it("keeps forbidden milestone categories out of the allowlist", () => {
    for (const category of FORBIDDEN_MILESTONE_CATEGORIES) {
      expect(PROFILE_MILESTONE_CATEGORIES).not.toContain(category);
      expect(validateMilestoneDraft({ category, title: "Nope" }).ok).toBe(false);
    }
    expect(
      validateMilestoneDraft({
        category: "achievement",
        title: "Opened a studio",
      }).ok
    ).toBe(true);
  });

  it("requires https for additional links and optional education links", () => {
    expect(validateLinkDraft({ label: "Site", url: "http://x.com" }).ok).toBe(
      false
    );
    expect(validateLinkDraft({ label: "Site", url: "https://x.com" }).ok).toBe(
      true
    );
    expect(
      validateEducationDraft({
        institution: "Arts School",
        externalUrl: "javascript:alert(1)",
      }).ok
    ).toBe(false);
  });

  it("treats connections as owner-only until that graph is authorized", () => {
    expect(connectionsIsOwnerOnly("connections")).toBe(true);
    expect(connectionsIsOwnerOnly("only_me")).toBe(true);
    expect(connectionsIsOwnerOnly("public")).toBe(false);
    expect(connectionsIsOwnerOnly("followers")).toBe(false);
  });

  it("caps long bio and drops empty values", () => {
    expect(validateBioLong("  Hello  ")).toBe("Hello");
    expect(validateBioLong("")).toBeNull();
    expect(validateBioLong("x".repeat(4001))).toBeNull();
  });
});
