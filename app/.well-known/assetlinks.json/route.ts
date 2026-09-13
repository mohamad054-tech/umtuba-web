import { NextResponse } from "next/server";
import { buildAssetLinks } from "../../../lib/android/assetLinks";

/**
 * Android App Links Digital Asset Links.
 * Returns 404 until the operator sets a real ANDROID_APP_LINKS_SHA256
 * (never invent a signing-certificate fingerprint).
 */
export async function GET() {
  const statements = buildAssetLinks(process.env.ANDROID_APP_LINKS_SHA256);
  if (!statements) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json(statements, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
