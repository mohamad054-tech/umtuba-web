/**
 * Content-Security-Policy-Report-Only builder.
 * Origins come from public env only (no secrets). Never emit an enforcing CSP.
 */

export const CSP_REPORT_PATH = "/api/csp-report";
export const CSP_REPORT_GROUP = "csp-endpoint";
export const CSP_REPORT_TO_MAX_AGE_SECONDS = 10886400;

export type CspPolicyEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_LIVEKIT_URL?: string;
  LIVEKIT_URL?: string;
  NEXT_PUBLIC_MAP_STYLE_URL?: string;
};

export function createCspNonce(): string {
  return btoa(crypto.randomUUID());
}

export function isCspReportPath(pathname: string): boolean {
  return (
    pathname === CSP_REPORT_PATH || pathname.startsWith(`${CSP_REPORT_PATH}/`)
  );
}

/**
 * Parse a public http(s) URL and return origin only.
 * Returns null on missing/invalid input — never echoes the raw value.
 */
export function publicHttpOriginFromUrl(raw: string | undefined): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    if (!parsed.hostname) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Parse a public ws(s) or http(s) URL and return the websocket origin.
 */
export function publicWsOriginFromUrl(raw: string | undefined): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!parsed.hostname) return null;
    if (parsed.protocol === "wss:" || parsed.protocol === "ws:") {
      return `${parsed.protocol}//${parsed.host}`;
    }
    if (parsed.protocol === "https:") {
      return `wss://${parsed.host}`;
    }
    if (parsed.protocol === "http:") {
      return `ws://${parsed.host}`;
    }
    return null;
  } catch {
    return null;
  }
}

function httpUrlFromMaybeWs(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value.startsWith("wss://")) return `https://${value.slice("wss://".length)}`;
  if (value.startsWith("ws://")) return `http://${value.slice("ws://".length)}`;
  return value;
}

function uniqueOrigins(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/** OpenFreeMap tiles / glyphs / sprites. No API key. */
export const OPENFREEMAP_CSP_ORIGIN = "https://tiles.openfreemap.org";

function mapStyleOverrideOrigin(raw: string | undefined): string | null {
  return publicHttpOriginFromUrl(raw);
}

export function collectCspExternalOrigins(env: CspPolicyEnv): {
  connect: string[];
  media: string[];
  img: string[];
  font: string[];
} {
  const supabaseHttp = publicHttpOriginFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseWs = publicWsOriginFromUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  const livekitRaw = env.NEXT_PUBLIC_LIVEKIT_URL || env.LIVEKIT_URL;
  const livekitHttp = publicHttpOriginFromUrl(httpUrlFromMaybeWs(livekitRaw));
  const livekitWs = publicWsOriginFromUrl(livekitRaw);
  const mapStyleOrigin = mapStyleOverrideOrigin(env.NEXT_PUBLIC_MAP_STYLE_URL);

  const supabaseAndLivekit = uniqueOrigins([
    supabaseHttp,
    supabaseWs,
    livekitHttp,
    livekitWs,
  ]);
  const mapOrigins = uniqueOrigins([OPENFREEMAP_CSP_ORIGIN, mapStyleOrigin]);

  return {
    connect: uniqueOrigins([...supabaseAndLivekit, ...mapOrigins]),
    media: uniqueOrigins([supabaseHttp]),
    img: uniqueOrigins([supabaseHttp, ...mapOrigins]),
    font: mapOrigins,
  };
}

export function buildCspReportOnlyValue(options: {
  nonce: string;
  env?: CspPolicyEnv;
  isDev?: boolean;
}): string {
  const nonce = options.nonce.trim();
  if (!nonce || /[\s;]/.test(nonce)) {
    throw new Error("CSP nonce is invalid.");
  }

  const env = options.env ?? {};
  const isDev = options.isDev ?? process.env.NODE_ENV === "development";
  const origins = collectCspExternalOrigins(env);

  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const connectSrc = ["'self'", ...origins.connect].join(" ");
  const mediaSrc = ["'self'", "blob:", ...origins.media].join(" ");
  const imgSrc = ["'self'", "blob:", "data:", ...origins.img].join(" ");
  const fontSrc = ["'self'", ...origins.font].join(" ");

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${imgSrc}`,
    `media-src ${mediaSrc}`,
    `font-src ${fontSrc}`,
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `report-uri ${CSP_REPORT_PATH}`,
    `report-to ${CSP_REPORT_GROUP}`,
  ];

  return directives.join("; ");
}

export function buildReportToHeader(reportUrl: string): string {
  return JSON.stringify({
    group: CSP_REPORT_GROUP,
    max_age: CSP_REPORT_TO_MAX_AGE_SECONDS,
    endpoints: [{ url: reportUrl }],
  });
}

export function buildReportingEndpointsHeader(): string {
  return `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`;
}

export function cspReportEndpointUrl(requestOrigin: string): string {
  return new URL(CSP_REPORT_PATH, requestOrigin).toString();
}

export function applyCspReportOnlyHeaders(
  headers: Headers,
  policy: string,
  reportTo: string
): void {
  headers.delete("Content-Security-Policy");
  headers.set("Content-Security-Policy-Report-Only", policy);
  headers.set("Report-To", reportTo);
  headers.set("Reporting-Endpoints", buildReportingEndpointsHeader());
}

export function attachCspNonceRequestHeaders(
  requestHeaders: Headers,
  nonce: string,
  policy: string
): void {
  requestHeaders.set("x-nonce", nonce);
  // Request-only: Next extracts the nonce from Content-Security-Policy.
  // Do not copy this onto the browser response (report-only stays on the response).
  requestHeaders.set("Content-Security-Policy", policy);
}
