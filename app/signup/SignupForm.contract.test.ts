import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SUPPORTED_LOCALES, translate } from "../../lib/i18n";
import { MESSAGE_CATALOGS } from "../../lib/i18n/messages/catalogs";
import type { TranslationKey } from "../../lib/i18n/messages/types";

const signupSrc = readFileSync(
  join(process.cwd(), "app/signup/SignupForm.tsx"),
  "utf8"
);

const SIGNUP_VALIDATION_KEYS: TranslationKey[] = [
  "auth.signup.emailRequired",
  "auth.signup.emailInvalid",
  "auth.signup.passwordRequired",
  "auth.signup.passwordMin",
  "auth.signup.confirmRequired",
  "auth.signup.passwordMismatch",
  "auth.signup.fullNameRequired",
  "auth.signup.usernameRequired",
  "auth.signup.usernameHint",
  "auth.signup.usernameTaken",
  "auth.signup.acceptTerms",
  "auth.signup.fixHighlighted",
  "auth.signup.unableToCreate",
  "auth.signup.accountReserved",
  "auth.signup.accountReservedFor",
  "auth.signup.accountCreated",
];

describe("SignupForm UX contract (UAF-02)", () => {
  it("uses progressive two-step disclosure without dropping required auth fields", () => {
    expect(signupSrc).toMatch(/SignupStep = 1 \| 2/);
    expect(signupSrc).toMatch(/validateCredentials/);
    expect(signupSrc).toMatch(/validateProfile/);
    expect(signupSrc).toMatch(/auth\.signup\.passwordMin/);
    expect(signupSrc).toMatch(/acceptTerms/);
    expect(signupSrc).toMatch(/revealable/);
    expect(signupSrc).toMatch(/auth\.signup\.checkEmailTitle/);
    expect(signupSrc).toMatch(/APP_ROUTES\.profile/);
    expect(signupSrc).toMatch(/isValidUsername/);
    expect(signupSrc).toMatch(/isUsernameTakenError/);
    expect(signupSrc).toMatch(/auth\.signup\.acceptTerms/);
  });

  it("does not show a primary referral field or require a code", () => {
    expect(signupSrc).not.toMatch(/name="referral"/);
    expect(signupSrc).not.toMatch(/auth\.signup\.referral/);
    expect(signupSrc).not.toMatch(/1234/);
    expect(signupSrc).toMatch(/normalizeReferralCode/);
    expect(signupSrc).toMatch(/claimPendingReferralAction/);
  });

  it("localizes username validation instead of leaking English USERNAME_HINT", () => {
    expect(signupSrc).toMatch(/auth\.signup\.usernameHint/);
    expect(signupSrc).not.toMatch(/USERNAME_HINT/);
    expect(signupSrc).not.toMatch(
      /Use 3–24 characters: lowercase letters, numbers, dots, or underscores/
    );
    expect(translate("ar", "auth.signup.usernameHint")).not.toBe(
      translate("en", "auth.signup.usernameHint")
    );
    expect(translate("ar", "auth.signup.usernameHint")).not.toMatch(
      /lowercase letters/
    );
  });

  it("ships signup validation keys in all 13 catalogs", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = MESSAGE_CATALOGS[locale];
      for (const key of SIGNUP_VALIDATION_KEYS) {
        expect(catalog[key].length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    }
  });
});
