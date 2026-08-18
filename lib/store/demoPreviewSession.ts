import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import {
  DEMO_PREVIEW_SESSION_COOKIE,
  demoPreviewCookieOptions,
  demoPreviewSessionCookieValue,
} from "./demoPreviewGate";

export async function readDemoPreviewSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(DEMO_PREVIEW_SESSION_COOKIE)?.value ?? null;
}

export function applyDemoPreviewSessionCookie(response: NextResponse): boolean {
  const value = demoPreviewSessionCookieValue();
  if (!value) return false;
  response.cookies.set(DEMO_PREVIEW_SESSION_COOKIE, value, demoPreviewCookieOptions());
  return true;
}
