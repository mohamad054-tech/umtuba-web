import { NextResponse } from "next/server";
import { buildAppleAppSiteAssociation } from "../../../lib/ios/appleAppSiteAssociation";

/**
 * Universal Links AASA.
 * Returns 404 until the operator sets a real APPLE_TEAM_ID (never invent one).
 */
export async function GET() {
  const association = buildAppleAppSiteAssociation(process.env.APPLE_TEAM_ID);
  if (!association) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json(association, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
