import { afterEach, describe, expect, it, vi } from "vitest";
import {
  blockedHostOnly,
  CSP_REPORT_MAX_BODY_BYTES,
  formatCspReportLogLine,
  logCspReports,
  pagePathOnly,
  parseCspReports,
  readBodyCapped,
} from "./cspReport";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cspReport compact fields", () => {
  it("keeps host only and drops query tokens", () => {
    expect(
      blockedHostOnly(
        "https://example.supabase.co/storage/v1/object/sign/post-videos/a.mp4?token=secret"
      )
    ).toBe("example.supabase.co");
    expect(blockedHostOnly("inline")).toBe("inline");
    expect(blockedHostOnly("data:image/png;base64,AAAA")).toBe("data");
  });

  it("keeps pathname only", () => {
    expect(pagePathOnly("https://umtuba.com/watch?post=12&token=abc")).toBe(
      "/watch"
    );
    expect(pagePathOnly("/life?x=1")).toBe("/life");
  });
});

describe("parseCspReports", () => {
  it("parses report-uri legacy bodies", () => {
    const reports = parseCspReports({
      "csp-report": {
        "document-uri": "https://umtuba.com/watch?post=1",
        "violated-directive": "script-src",
        "blocked-uri": "https://evil.example/x.js?token=1",
      },
    });
    expect(reports).toEqual([
      {
        directive: "script-src",
        blockedHost: "evil.example",
        pagePath: "/watch",
      },
    ]);
  });

  it("parses report-to Reporting API arrays", () => {
    const reports = parseCspReports([
      {
        type: "csp-violation",
        url: "https://umtuba.com/life",
        body: {
          effectiveDirective: "connect-src",
          blockedURL: "wss://evil.example/socket",
          documentURL: "https://umtuba.com/life?hl=en",
        },
      },
    ]);
    expect(reports).toEqual([
      {
        directive: "connect-src",
        blockedHost: "evil.example",
        pagePath: "/life",
      },
    ]);
  });
});

describe("readBodyCapped", () => {
  it("rejects oversized Content-Length without reading", async () => {
    const request = new Request("https://umtuba.com/api/csp-report", {
      method: "POST",
      headers: { "content-length": String(CSP_REPORT_MAX_BODY_BYTES + 1) },
      body: "x".repeat(100),
    });
    await expect(readBodyCapped(request)).resolves.toBeNull();
  });

  it("accepts a small JSON body", async () => {
    const body = JSON.stringify({ "csp-report": { "document-uri": "/" } });
    const request = new Request("https://umtuba.com/api/csp-report", {
      method: "POST",
      headers: { "content-type": "application/csp-report" },
      body,
    });
    await expect(readBodyCapped(request)).resolves.toBe(body);
  });
});

describe("logCspReports", () => {
  it("logs a compact line without query strings", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logCspReports([
      {
        directive: "img-src",
        blockedHost: "evil.example",
        pagePath: "/store",
      },
    ]);
    expect(info).toHaveBeenCalledWith(
      formatCspReportLogLine({
        directive: "img-src",
        blockedHost: "evil.example",
        pagePath: "/store",
      })
    );
    expect(info.mock.calls[0]?.[0]).not.toContain("?");
  });
});
