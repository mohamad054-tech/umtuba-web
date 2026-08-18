import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { SANDBOX_SESSION_COOKIE } from "../paths";
import { sandboxCookieOptions, sandboxSessionCookieValue } from "./gate";

export async function readSandboxSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SANDBOX_SESSION_COOKIE)?.value ?? null;
}

export function applySandboxSessionCookie(response: NextResponse): boolean {
  const value = sandboxSessionCookieValue();
  if (!value) return false;
  response.cookies.set(SANDBOX_SESSION_COOKIE, value, sandboxCookieOptions());
  return true;
}
