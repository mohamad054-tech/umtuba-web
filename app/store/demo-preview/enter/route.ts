import { NextResponse, type NextRequest } from "next/server";
import {
  DEMO_PREVIEW_PATH,
  demoPreviewTokenMatches,
  safeDemoPreviewNext,
} from "../../../../lib/store/demoPreviewGate";
import { applyDemoPreviewSessionCookie } from "../../../../lib/store/demoPreviewSession";

function noindexRedirect(request: NextRequest, nextPath: string): NextResponse {
  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

/**
 * First-visit token exchange for Product Owner / QA.
 * Sets an httpOnly cookie scoped to /store/demo-preview and redirects to a
 * URL that does not keep the secret in the query string.
 * Never logs or echoes the token.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("demo_token");
  const nextPath = safeDemoPreviewNext(
    url.searchParams.get("next") ?? DEMO_PREVIEW_PATH
  );
  const response = noindexRedirect(request, nextPath);
  if (demoPreviewTokenMatches(token)) {
    applyDemoPreviewSessionCookie(response);
  }
  return response;
}
