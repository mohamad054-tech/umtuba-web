import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const signupSrc = readFileSync(
  join(process.cwd(), "app/signup/SignupForm.tsx"),
  "utf8"
);

describe("SignupForm UX contract (UAF-02)", () => {
  it("uses progressive two-step disclosure without dropping required auth fields", () => {
    expect(signupSrc).toMatch(/SignupStep = 1 \| 2/);
    expect(signupSrc).toMatch(/validateCredentials/);
    expect(signupSrc).toMatch(/validateProfile/);
    expect(signupSrc).toMatch(/validatePassword/);
    expect(signupSrc).toMatch(/acceptTerms/);
    expect(signupSrc).toMatch(/revealable/);
    expect(signupSrc).toMatch(/auth\.signup\.checkEmailTitle/);
    expect(signupSrc).toMatch(/APP_ROUTES\.profile/);
    // Must not weaken uniqueness / password / terms gates.
    expect(signupSrc).toMatch(/isValidUsername/);
    expect(signupSrc).toMatch(/isUsernameTakenError/);
    expect(signupSrc).toMatch(/Accept the terms/);
  });
});
