import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  toAuthUserFacingMessage,
} from "./authMessages";
import { buildEmailConfirmRedirectTo } from "./auth";

const ROOT = join(process.cwd());

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

describe("toAuthUserFacingMessage", () => {
  it("maps common auth failures and strips technical details", () => {
    expect(
      toAuthUserFacingMessage(new Error("Invalid login credentials"))
    ).toMatch(/invalid email or password/i);
    expect(
      toAuthUserFacingMessage(new Error("Email not confirmed"))
    ).toMatch(/confirm your email/i);
    expect(
      toAuthUserFacingMessage(
        new Error("JWT expired; see supabase stack trace")
      )
    ).not.toMatch(/jwt|supabase|stack/i);
    expect(
      toAuthUserFacingMessage(new Error("Failed to fetch"))
    ).toMatch(/network/i);
  });
});

describe("email confirm redirect", () => {
  it("builds a PKCE callback URL with a safe next path", () => {
    const url = buildEmailConfirmRedirectTo(
      "https://umtuba.example",
      "/messages?x=1"
    );
    expect(url).toBe(
      "https://umtuba.example/auth/callback?next=%2Fmessages%3Fx%3D1"
    );
    expect(
      buildEmailConfirmRedirectTo("https://umtuba.example", "//evil")
    ).toContain("next=%2Fprofile");
  });
});

describe("auth session harden contracts", () => {
  it("signup sets emailRedirectTo and honors next deep links", () => {
    const auth = read("lib/supabase/auth.ts");
    const signup = read("app/signup/SignupForm.tsx");
    expect(auth).toMatch(/emailRedirectTo/);
    expect(auth).toMatch(/buildEmailConfirmRedirectTo/);
    expect(signup).toMatch(/nextPath/);
    expect(signup).toMatch(/Continue where you left off|continueHref/);
  });

  it("callback defaults to profile and routes failures by intent", () => {
    const callback = read("app/auth/callback/route.ts");
    expect(callback).toMatch(/DEFAULT_POST_AUTH_PATH\s*=\s*["']\/profile["']/);
    expect(callback).toMatch(/APP_ROUTES\.login/);
    expect(callback).toMatch(/isPasswordResetNext/);
    expect(callback).toMatch(/mapSignInLinkError|mapCallbackLinkError/);
    expect(callback).toMatch(/resolveAuthRedirectOrigin/);
    expect(callback).not.toMatch(/localhost:3001/);
  });

  it("chrome uses soft client factory when env may be missing", () => {
    expect(read("lib/supabase/client.ts")).toMatch(/tryCreateClient/);
    expect(read("app/components/UserMenu.tsx")).toMatch(/tryCreateClient/);
    expect(read("app/components/NotificationBell.tsx")).toMatch(
      /tryCreateClient/
    );
    expect(read("app/components/landing/JoinBetaLink.tsx")).toMatch(
      /tryCreateClient/
    );
  });

  it("settings does not bounce missing profiles to signup", () => {
    const settings = read("app/settings/page.tsx");
    expect(settings).toMatch(/profileFromAuthUser/);
    expect(settings).not.toMatch(/redirect\(APP_ROUTES\.signup\)/);
  });

  it("post-reset sign-out failures surface to the user", () => {
    const reset = read("lib/supabase/passwordReset.ts");
    expect(reset).toMatch(/signOutAfterPasswordReset/);
    expect(reset).toMatch(/could not end the reset session/);
  });

  it("login no longer shows a non-functional remember-me control", () => {
    const login = read("app/login/page.tsx");
    expect(login).not.toMatch(/rememberMe|Remember me/);
    expect(login).toMatch(/toAuthUserFacingMessage/);
    expect(login).toMatch(/searchParams\.get\("error"\)/);
  });
});
