import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE_NAME } from "../i18n/cookie";
import {
  LOCALE_OVERRIDE_HEADER,
  LOCALE_QUERY_PARAM,
  readLocaleQueryValue,
  resolveLocaleFromQueryAndCookie,
} from "../site/hreflang";
import { createServiceUnavailableResponse } from "../env/serviceUnavailableResponse";
import {
  decideAuthGate,
  isAuthEntryPath,
  isAuthPath,
  isProtectedPath,
} from "../env/supabaseAuthGate";
import { getSupabasePublicEnvResult } from "../env/supabasePublic";
import { getSafeRedirectPath } from "./redirect";
import {
  REFERRAL_ATTRIBUTION_TTL_SECONDS,
  REFERRAL_COOKIE_NAME,
  REFERRAL_VISITOR_COOKIE,
  normalizeReferralCode,
} from "../referral/config";

function requestHeadersWithLocaleOverride(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  const hl = readLocaleQueryValue((key) =>
    request.nextUrl.searchParams.get(key)
  );
  if (hl) {
    headers.set(LOCALE_OVERRIDE_HEADER, hl);
  }
  return headers;
}

function withLocaleVary(response: NextResponse): NextResponse {
  const current = response.headers.get("Vary");
  const needed = ["Accept-Language", "Cookie"];
  const existing = current
    ? current.split(",").map((part) => part.trim()).filter(Boolean)
    : [];
  for (const token of needed) {
    if (!existing.some((item) => item.toLowerCase() === token.toLowerCase())) {
      existing.push(token);
    }
  }
  response.headers.set("Vary", existing.join(", "));
  return response;
}

function nextWithLocale(request: NextRequest): NextResponse {
  return withLocaleVary(
    NextResponse.next({
      request: { headers: requestHeadersWithLocaleOverride(request) },
    })
  );
}

function copyCookies(
  from: NextResponse,
  to: NextResponse
): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
  return to;
}

function referralCookieOpts(maxAge = REFERRAL_ATTRIBUTION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

/**
 * First-touch referral attribution:
 * - /invite/CODE, /join?ref=CODE, or ?ref=CODE / ?invite=CODE
 * - Do not overwrite an existing valid referral cookie
 */
function applyReferralAttribution(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  const { pathname } = request.nextUrl;
  let candidate: string | null = null;

  const inviteMatch = pathname.match(/^\/invite\/([A-Za-z0-9]{6,16})\/?$/);
  if (inviteMatch) {
    candidate = normalizeReferralCode(inviteMatch[1]);
  }

  if (!candidate) {
    candidate = normalizeReferralCode(
      request.nextUrl.searchParams.get("ref") ||
        request.nextUrl.searchParams.get("invite")
    );
  }

  if (!candidate) {
    return response;
  }

  const existing = normalizeReferralCode(
    request.cookies.get(REFERRAL_COOKIE_NAME)?.value
  );
  if (!existing) {
    response.cookies.set(
      REFERRAL_COOKIE_NAME,
      candidate,
      referralCookieOpts()
    );
  }

  if (!request.cookies.get(REFERRAL_VISITOR_COOKIE)?.value) {
    const visitorId = crypto.randomUUID().replace(/-/g, "");
    response.cookies.set(
      REFERRAL_VISITOR_COOKIE,
      visitorId,
      referralCookieOpts(365 * 24 * 60 * 60)
    );
  }

  return response;
}

function rewritePersonalAtLink(request: NextRequest): NextResponse | null {
  const match = request.nextUrl.pathname.match(/^\/@([A-Za-z0-9._]{3,24})\/?$/);
  if (!match?.[1]) {
    return null;
  }
  const url = request.nextUrl.clone();
  url.pathname = `/u/${match[1].toLowerCase()}`;
  return NextResponse.rewrite(url);
}

export async function updateSession(request: NextRequest) {
  const atRewrite = rewritePersonalAtLink(request);
  if (atRewrite) {
    return applyReferralAttribution(request, atRewrite);
  }

  let supabaseResponse = nextWithLocale(request);

  const { pathname, search } = request.nextUrl;
  const publicEnv = getSupabasePublicEnvResult();
  const gate = decideAuthGate(pathname, publicEnv);

  if (gate.action === "service_unavailable") {
    return applyReferralAttribution(
      request,
      createServiceUnavailableResponse(gate.forPath)
    );
  }

  if (gate.action === "continue_without_session") {
    // Config missing/invalid: never invent a session; public pages only.
    return applyReferralAttribution(request, supabaseResponse);
  }

  // gate.action === "check_session"
  if (!publicEnv.ok) {
    // Defensive: never proceed with an unusable client.
    return applyReferralAttribution(
      request,
      createServiceUnavailableResponse(
        isProtectedPath(pathname)
          ? "protected"
          : isAuthPath(pathname)
            ? "auth"
            : "public"
      )
    );
  }

  const { url: supabaseUrl, publishableKey: supabaseKey } = publicEnv.env;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = nextWithLocale(request);

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Validate the JWT with the Auth server. Do not use getSession() for auth checks.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const loginLocale = resolveLocaleFromQueryAndCookie(
      (key) => request.nextUrl.searchParams.get(key),
      request.cookies.get(LOCALE_COOKIE_NAME)?.value
    );
    if (loginLocale) {
      loginUrl.searchParams.set(LOCALE_QUERY_PARAM, loginLocale);
    }
    return applyReferralAttribution(
      request,
      copyCookies(supabaseResponse, NextResponse.redirect(loginUrl))
    );
  }

  // Logged-in users leave entry auth pages. Password update stays available
  // so recovery sessions (and signed-in password changes) can complete.
  if (user && isAuthEntryPath(pathname)) {
    if (pathname === "/forgot-password") {
      const updateUrl = request.nextUrl.clone();
      updateUrl.pathname = "/auth/update-password";
      updateUrl.search = "";
      return applyReferralAttribution(
        request,
        copyCookies(supabaseResponse, NextResponse.redirect(updateUrl))
      );
    }

    const nextParam = request.nextUrl.searchParams.get("next");
    const destination = getSafeRedirectPath(nextParam, "/profile");
    // Parse path + query explicitly so ?creatorId= / ?conversation= survive.
    const redirectUrl = request.nextUrl.clone();
    const [destPath, destQuery = ""] = destination.split("?");
    redirectUrl.pathname = destPath || "/profile";
    redirectUrl.search = destQuery ? `?${destQuery}` : "";
    return applyReferralAttribution(
      request,
      copyCookies(supabaseResponse, NextResponse.redirect(redirectUrl))
    );
  }

  return applyReferralAttribution(request, supabaseResponse);
}
