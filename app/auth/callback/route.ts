import { NextResponse, type NextRequest } from "next/server";
import { runReferralClaimCoordinator } from "../../../lib/referral/claimCoordinator";
import {
  FORGOT_PASSWORD_PATH,
  mapPasswordResetLinkError,
  PASSWORD_RESET_UPDATE_PATH,
} from "../../../lib/supabase/passwordReset";
import { getSafeRedirectPath } from "../../../lib/supabase/redirect";
import { createClient } from "../../../lib/supabase/server";

const DEFAULT_POST_AUTH_PATH = "/discover";
const LOGIN_PATH = "/login";

function isPasswordResetNext(path: string): boolean {
  return (
    path === PASSWORD_RESET_UPDATE_PATH ||
    path.startsWith(`${PASSWORD_RESET_UPDATE_PATH}?`)
  );
}

function failureRedirect(
  origin: string,
  next: string,
  message: string
): NextResponse {
  const path = isPasswordResetNext(next) ? FORGOT_PASSWORD_PATH : LOGIN_PATH;
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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(
    searchParams.get("next"),
    DEFAULT_POST_AUTH_PATH
  );

  const oauthError = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (oauthError || errorCode) {
    const message = mapPasswordResetLinkError(errorCode, errorDescription);
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
        mapPasswordResetLinkError(error.code, error.message)
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
