import { NextResponse } from "next/server";
import { applySandboxSessionCookie } from "../../../../lib/sandbox/access/session";
import {
  evaluateSandboxAccess,
  safeSandboxNext,
} from "../../../../lib/sandbox/access/gate";
import { SANDBOX_ENTER_PATH, SANDBOX_PATH } from "../../../../lib/sandbox/paths";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("sandbox_token");
  const access = evaluateSandboxAccess({ token });
  if (!access.ok) {
    return NextResponse.redirect(new URL(SANDBOX_PATH, url.origin), 303);
  }

  const next = safeSandboxNext(url.searchParams.get("next"));
  const response = NextResponse.redirect(new URL(next, url.origin), 303);
  applySandboxSessionCookie(response);
  if (next === SANDBOX_ENTER_PATH) {
    return NextResponse.redirect(new URL(SANDBOX_PATH, url.origin), 303);
  }
  return response;
}
