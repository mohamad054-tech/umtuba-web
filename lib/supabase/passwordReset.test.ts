import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPasswordResetRedirectTo,
  FORGOT_PASSWORD_PATH,
  mapPasswordResetError,
  mapPasswordResetLinkError,
  PASSWORD_RESET_CALLBACK_PATH,
  PASSWORD_RESET_REQUEST_SUCCESS,
  PASSWORD_RESET_UPDATE_PATH,
} from "./passwordReset";
import {
  validatePassword,
  validatePasswordConfirmation,
} from "./validation";
import {
  decideAuthGate,
  isAuthEntryPath,
  isAuthPath,
} from "../env/supabaseAuthGate";
import { validateSupabasePublicEnv } from "../env/supabasePublic";
import { shouldShowMobileBottomNav } from "../../app/lib/nav/mobileNav";

const ROOT = join(process.cwd());

function readRepoFile(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

describe("password reset helpers", () => {
  it("builds a PKCE callback redirect without embedding tokens", () => {
    const url = buildPasswordResetRedirectTo("https://umtuba.example");
    expect(url).toBe(
      `https://umtuba.example${PASSWORD_RESET_CALLBACK_PATH}?next=${encodeURIComponent(
        PASSWORD_RESET_UPDATE_PATH
      )}`
    );
    expect(url).not.toMatch(/access_token|refresh_token|type=recovery/i);
  });

  it("keeps request success copy generic (no email enumeration)", () => {
    expect(PASSWORD_RESET_REQUEST_SUCCESS.toLowerCase()).toContain(
      "if an account exists"
    );
  });

  it("maps expired/invalid and same-password errors to friendly copy", () => {
    expect(mapPasswordResetError(new Error("Auth session missing"))).toMatch(
      /invalid or has expired/i
    );
    expect(
      mapPasswordResetError(
        new Error("New password should be different from the old password.")
      )
    ).toMatch(/different password/i);
    expect(mapPasswordResetLinkError("otp_expired", "Email link is invalid or has expired")).toMatch(
      /invalid or has expired/i
    );
  });

  it("validates password + confirmation rules", () => {
    expect(validatePassword("12345")).toMatch(/at least 6/i);
    expect(validatePassword("123456")).toBeNull();
    expect(validatePasswordConfirmation("abcdef", "abcdeg")).toMatch(
      /do not match/i
    );
    expect(validatePasswordConfirmation("abcdef", "abcdef")).toBeNull();
  });
});

describe("password reset architecture", () => {
  it("wires login Forgot password to the request page", () => {
    const login = readRepoFile("app/login/page.tsx");
    expect(login).toMatch(/FORGOT_PASSWORD_PATH|forgot-password/);
    expect(login).not.toMatch(/Backend Foundation V1/);
    expect(login).toMatch(/get\("reset"\)\s*===\s*"success"/);
  });

  it("exchanges recovery codes server-side in the callback route", () => {
    const callback = readRepoFile("app/auth/callback/route.ts");
    expect(callback).toMatch(/exchangeCodeForSession/);
    expect(callback).not.toMatch(/console\.(log|info|debug).*code/);
    expect(callback).toMatch(/PASSWORD_RESET_UPDATE_PATH/);
  });

  it("update-password page requires session and confirms password", () => {
    const page = readRepoFile("app/auth/update-password/page.tsx");
    expect(page).toMatch(/validatePasswordConfirmation/);
    expect(page).toMatch(/updatePasswordWithSession/);
    expect(page).toMatch(/signOutAfterPasswordReset/);
    expect(page).toMatch(/Link invalid or expired/);
  });

  it("treats reset routes as auth paths for fail-closed gating", () => {
    const invalid = validateSupabasePublicEnv({});
    expect(isAuthPath("/forgot-password")).toBe(true);
    expect(isAuthPath("/auth/update-password")).toBe(true);
    expect(isAuthPath("/auth/callback")).toBe(true);
    expect(decideAuthGate("/forgot-password", invalid)).toEqual({
      action: "service_unavailable",
      forPath: "auth",
    });
    expect(isAuthEntryPath("/forgot-password")).toBe(true);
    expect(isAuthEntryPath("/auth/update-password")).toBe(false);
  });

  it("hides mobile bottom nav on password reset surfaces", () => {
    expect(shouldShowMobileBottomNav(FORGOT_PASSWORD_PATH)).toBe(false);
    expect(shouldShowMobileBottomNav(PASSWORD_RESET_UPDATE_PATH)).toBe(false);
    expect(shouldShowMobileBottomNav(PASSWORD_RESET_CALLBACK_PATH)).toBe(false);
  });

  it("middleware sends logged-in forgot-password users to update-password", () => {
    const middleware = readRepoFile("lib/supabase/middleware.ts");
    expect(middleware).toMatch(/isAuthEntryPath/);
    expect(middleware).toMatch(/forgot-password/);
    expect(middleware).toMatch(/\/auth\/update-password/);
  });
});
