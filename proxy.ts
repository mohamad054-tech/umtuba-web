import { NextRequest } from "next/server";
import {
  applyCspReportOnlyHeaders,
  attachCspNonceRequestHeaders,
  buildCspReportOnlyValue,
  buildReportToHeader,
  createCspNonce,
  cspReportEndpointUrl,
  isCspReportPath,
} from "./lib/security/cspPolicy";
import { updateSession } from "./lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const nonce = createCspNonce();
  const policy = buildCspReportOnlyValue({
    nonce,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      LIVEKIT_URL: process.env.LIVEKIT_URL,
      NEXT_PUBLIC_MAP_STYLE_URL: process.env.NEXT_PUBLIC_MAP_STYLE_URL,
      NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    },
  });
  const requestHeaders = new Headers(request.headers);
  attachCspNonceRequestHeaders(requestHeaders, nonce, policy);
  const prepared = new NextRequest(request, { headers: requestHeaders });
  const response = await updateSession(prepared);

  if (!isCspReportPath(prepared.nextUrl.pathname)) {
    applyCspReportOnlyHeaders(
      response.headers,
      policy,
      buildReportToHeader(cspReportEndpointUrl(prepared.nextUrl.origin))
    );
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and image optimization.
     */
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
