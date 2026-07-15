import { NextResponse, type NextRequest } from "next/server";
import { runReferralClaimCoordinator } from "../../../lib/referral/claimCoordinator";
import {
  FORGOT_PASSWORD_PATH,
  mapPasswordResetLinkError,
  PASSWORD_RESET_UPDATE_PATH,
} from "../../../lib/supabase/passwordReset";
import { getSafeRedirectPath } from "../../../lib/supabase/redirect";
import { createClient } from "../../../lib/supabase/server";

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
    PASSWORD_RESET_UPDATE_PATH
  );

  const oauthError = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  if (oauthError || errorCode) {
    const message = mapPasswordResetLinkError(errorCode, errorDescription);
    const failure = new URL(FORGOT_PASSWORD_PATH, origin);
    failure.searchParams.set("error", message);
    return NextResponse.redirect(failure);
  }

  if (!code) {
    const failure = new URL(FORGOT_PASSWORD_PATH, origin);
    failure.searchParams.set(
      "error",
      "This reset link is invalid or has expired. Request a new one."
    );
    return NextResponse.redirect(failure);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const failure = new URL(FORGOT_PASSWORD_PATH, origin);
      failure.searchParams.set(
        "error",
        mapPasswordResetLinkError(error.code, error.message)
      );
      return NextResponse.redirect(failure);
    }
  } catch {
    const failure = new URL(FORGOT_PASSWORD_PATH, origin);
    failure.searchParams.set(
      "error",
      "This reset link is invalid or has expired. Request a new one."
    );
    return NextResponse.redirect(failure);
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
