import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyCspReportOnlyHeaders,
  attachCspNonceRequestHeaders,
  buildCspReportOnlyValue,
  buildReportToHeader,
  buildReportingEndpointsHeader,
  collectCspExternalOrigins,
  CSP_REPORT_PATH,
  cspReportEndpointUrl,
  isCspReportPath,
  publicHttpOriginFromUrl,
  publicWsOriginFromUrl,
} from "./cspPolicy";

const ROOT = process.cwd();

describe("cspPolicy origins", () => {
  it("derives http and wss origins from NEXT_PUBLIC_SUPABASE_URL", () => {
    expect(publicHttpOriginFromUrl("https://example.supabase.co")).toBe(
      "https://example.supabase.co"
    );
    expect(publicWsOriginFromUrl("https://example.supabase.co")).toBe(
      "wss://example.supabase.co"
    );
  });

  it("derives LiveKit https + wss from a public wss URL", () => {
    const origins = collectCspExternalOrigins({
      NEXT_PUBLIC_LIVEKIT_URL: "wss://proj.livekit.cloud",
    });
    expect(origins.connect).toEqual([
      "https://proj.livekit.cloud",
      "wss://proj.livekit.cloud",
      "https://tiles.openfreemap.org",
      "https://eu.i.posthog.com",
      "https://eu-assets.i.posthog.com",
    ]);
    expect(origins.font).toEqual(["https://tiles.openfreemap.org"]);
  });

  it("ignores malformed public URLs without echoing them", () => {
    expect(publicHttpOriginFromUrl("not a url")).toBeNull();
    expect(publicWsOriginFromUrl(":::bad")).toBeNull();
    expect(
      collectCspExternalOrigins({
        NEXT_PUBLIC_SUPABASE_URL: "ftp://example.supabase.co",
      }).connect
    ).toEqual([
      "https://tiles.openfreemap.org",
      "https://eu.i.posthog.com",
      "https://eu-assets.i.posthog.com",
    ]);
  });
});

describe("buildCspReportOnlyValue", () => {
  const nonce = "dGVzdC1ub25jZQ==";

  it("includes required directives, nonce, report-uri, and supabase origins", () => {
    const value = buildCspReportOnlyValue({
      nonce,
      isDev: false,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_LIVEKIT_URL: "wss://proj.livekit.cloud",
      },
    });

    expect(value).toContain("default-src 'self'");
    expect(value).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(value).not.toContain("unsafe-eval");
    expect(value).toContain("style-src 'self' 'unsafe-inline'");
    expect(value).toContain(
      "img-src 'self' blob: data: https://example.supabase.co https://tiles.openfreemap.org https://eu.i.posthog.com https://eu-assets.i.posthog.com"
    );
    expect(value).toContain("media-src 'self' blob: https://example.supabase.co");
    expect(value).toContain("font-src 'self' https://tiles.openfreemap.org");
    expect(value).toContain(
      "connect-src 'self' https://example.supabase.co wss://example.supabase.co https://proj.livekit.cloud wss://proj.livekit.cloud https://tiles.openfreemap.org https://eu.i.posthog.com https://eu-assets.i.posthog.com"
    );
    expect(value).toContain("worker-src 'self' blob:");
    expect(value).toContain("object-src 'none'");
    expect(value).toContain("base-uri 'self'");
    expect(value).toContain("form-action 'self'");
    expect(value).toContain("frame-ancestors 'none'");
    expect(value).toContain(`report-uri ${CSP_REPORT_PATH}`);
    expect(value).toContain("report-to csp-endpoint");
    expect(value).not.toContain("upgrade-insecure-requests");
  });

  it("adds unsafe-eval only in development", () => {
    const prod = buildCspReportOnlyValue({ nonce, isDev: false });
    const dev = buildCspReportOnlyValue({ nonce, isDev: true });
    expect(prod).not.toContain("unsafe-eval");
    expect(dev).toContain("'unsafe-eval'");
  });

  it("rejects an unsafe nonce", () => {
    expect(() =>
      buildCspReportOnlyValue({ nonce: "bad; nonce", isDev: false })
    ).toThrow(/nonce/i);
  });

  it("allows an optional map style origin besides OpenFreeMap", () => {
    const value = buildCspReportOnlyValue({
      nonce,
      isDev: false,
      env: {
        NEXT_PUBLIC_MAP_STYLE_URL: "https://tiles.example.org/styles/liberty",
      },
    });
    expect(value).toContain("https://tiles.openfreemap.org");
    expect(value).toContain("https://tiles.example.org");
    expect(value).toMatch(/font-src[^;]*https:\/\/tiles\.openfreemap\.org/);
    expect(value).toMatch(/font-src[^;]*https:\/\/tiles\.example\.org/);
  });
});

describe("CSP report-only response headers", () => {
  it("sets report-only and reporting headers and strips enforcing CSP", () => {
    const headers = new Headers({
      "Content-Security-Policy": "default-src 'none'",
    });
    applyCspReportOnlyHeaders(
      headers,
      "default-src 'self'",
      buildReportToHeader(cspReportEndpointUrl("https://umtuba.com"))
    );
    expect(headers.get("Content-Security-Policy")).toBeNull();
    expect(headers.get("Content-Security-Policy-Report-Only")).toBe(
      "default-src 'self'"
    );
    expect(headers.get("Reporting-Endpoints")).toBe(
      buildReportingEndpointsHeader()
    );
    expect(headers.get("Report-To")).toContain(CSP_REPORT_PATH);
    expect(headers.get("Report-To")).toContain("https://umtuba.com");
  });

  it("attaches nonce CSP on the request only helper", () => {
    const headers = new Headers();
    attachCspNonceRequestHeaders(headers, "abc", "default-src 'self'");
    expect(headers.get("x-nonce")).toBe("abc");
    expect(headers.get("Content-Security-Policy")).toBe("default-src 'self'");
  });

  it("excludes the report endpoint path", () => {
    expect(isCspReportPath("/api/csp-report")).toBe(true);
    expect(isCspReportPath("/watch")).toBe(false);
  });
});

describe("proxy CSP wiring", () => {
  it("proxy applies report-only and never sets an enforcing CSP on the response", () => {
    const src = readFileSync(join(ROOT, "proxy.ts"), "utf8");
    expect(src).toMatch(/applyCspReportOnlyHeaders/);
    expect(src).toMatch(/isCspReportPath/);
    expect(src).not.toMatch(/response\.headers\.set\(\s*["']Content-Security-Policy["']/);
    const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");
    expect(config).not.toMatch(/Content-Security-Policy[^-]/);
  });

  it("report route uses the shared rate limiter and does not touch the DB", () => {
    const src = readFileSync(join(ROOT, "app/api/csp-report/route.ts"), "utf8");
    expect(src).toMatch(/consumeNamedActionRateLimit\(\s*["']cspReport["']/);
    expect(src).toMatch(/readBodyCapped/);
    expect(src).not.toMatch(/supabase|createClient|from\(/i);
    expect(src).toMatch(/status: 204/);
  });
});
