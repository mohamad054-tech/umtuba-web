import { describe, expect, it } from "vitest";
import { translate } from "./index";

describe("Auth Login/Signup locale body keys", () => {
  it("translates login body for Arabic and English", () => {
    expect(translate("en", "auth.login.title")).toBe("Welcome back");
    expect(translate("ar", "auth.login.title")).toBe("مرحبًا بعودتك");
    expect(translate("en", "auth.login.submit")).toBe("Sign in");
    expect(translate("ar", "auth.login.submit")).toBe("تسجيل الدخول");
  });

  it("translates signup body for Arabic and English", () => {
    expect(translate("en", "auth.signup.title")).toBe("Create account");
    expect(translate("ar", "auth.signup.title")).toBe("إنشاء حساب");
    expect(translate("en", "auth.signup.create")).toBe("Create account");
    expect(translate("ar", "auth.signup.create")).toBe("إنشاء حساب");
  });

  it("keeps French login title localized", () => {
    expect(translate("fr", "auth.login.title")).toBe("Bon retour");
  });
});
