import { NextResponse } from "next/server";
import { consumeNamedActionRateLimit } from "../../../lib/security/actionRateLimit";
import {
  logCspReports,
  parseCspReports,
  readBodyCapped,
} from "../../../lib/security/cspReport";

function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Accepts CSP report-uri / report-to POSTs.
 * Rate-limited, size-capped, server-log only — never stored.
 */
export async function POST(request: Request) {
  const limit = await consumeNamedActionRateLimit("cspReport", null);
  if (!limit.ok) {
    return noContent();
  }

  const body = await readBodyCapped(request);
  if (body == null) {
    return noContent();
  }

  if (!body) {
    logCspReports([]);
    return noContent();
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body) as unknown;
  } catch {
    return noContent();
  }

  logCspReports(parseCspReports(payload));
  return noContent();
}
