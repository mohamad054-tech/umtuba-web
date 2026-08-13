import { NextResponse, type NextRequest } from "next/server";
import { APP_ROUTES } from "../../lib/nav";
import { runReferralClaimCoordinator } from "../../../lib/referral/claimCoordinator";
import { resolveAuthRedirectOrigin } from "../../../lib/site/siteUrl";
import {
  FORGOT_PASSWORD_PATH,
  mapPasswordResetLinkError,
  mapSignInLinkError,
  PASSWORD_RESET_UPDATE_PATH,
} from "../../../lib/supabase/passwordReset";
import { getSafeRedirectPath } from "../../../lib/supabase/redirect";
import { createClient } from "../../../lib/supabase/server";

const DEFAULT_POST_AUTH_PATH = "/profile";

function isPasswordResetNext(path: string): boolean {
  return (
    path === PASSWORD_RESET_UPDATE_PATH ||
    path.startsWith(`${PASSWORD_RESET_UPDATE_PATH}?`)
  );
}

function mapCallbackLinkError(
  next: string,
  errorCode: string | null | undefined,
  errorDescription: string | null | undefined
): string {
  return isPasswordResetNext(next)
    ? mapPasswordResetLinkError(errorCode, errorDescription)
    : mapSignInLinkError(errorCode, errorDescription);
}

function failureRedirect(
  origin: string,
  next: string,
  message: string
): NextResponse {
  const path = isPasswordResetNext(next)
    ? FORGOT_PASSWORD_PATH
    : APP_ROUTES.login;
  const failure = new URL(path, origin);
  failure.searchParams.set("error", message);
  return NextResponse.redirect(failure);
}

/**
 * PKCE auth callback — exchanges ?code= for a session cookie server-side.
 * Used by password recovery and email confirmation links that redirect here.
 * After a successful session exchange, attempts idempotent referral claim
 * (non-blocking for the user: failures never alter the redirect).
 * Never logs or echoes tokens/codes into the response body.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin: requestOrigin } = new URL(request.url);
  // Public origin when reverse-proxy Host is loopback; keep local-dev loopback.
  const origin = resolveAuthRedirectOrigin(requestOrigin);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(
    searchParams.get("next"),
    DEFAULT_POST_AUTH_PATH
  );

  const oauthError = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (oauthError || errorCode) {
    const message = mapCallbackLinkError(next, errorCode, errorDescription);
    return failureRedirect(origin, next, message);
  }

  if (!code) {
    return failureRedirect(
      origin,
      next,
      isPasswordResetNext(next)
        ? "This reset link is invalid or has expired. Request a new one."
        : "This sign-in link is invalid or has expired. Please try again."
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return failureRedirect(
        origin,
        next,
        mapCallbackLinkError(next, error.code, error.message)
      );
    }
  } catch {
    return failureRedirect(
      origin,
      next,
      isPasswordResetNext(next)
        ? "This reset link is invalid or has expired. Request a new one."
        : "This sign-in link is invalid or has expired. Please try again."
    );
  }

  // First authenticated session after email confirm / magic link.
  // Idempotent; must not delay or fail the redirect on transient errors.
  try {
    await runReferralClaimCoordinator({ source: "auth_callback" });
  } catch (error) {
    console.error(
      "[referral-claim] auth_callback",
      error instanceof Error ? error.name : "Error"
    );
  }

  const success = new URL(next, origin);
  return NextResponse.redirect(success);
}
