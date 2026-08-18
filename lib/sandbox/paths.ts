/**
 * Private Product Owner sandbox. Never add these paths to public nav or sitemap.
 */

import { parseLearningSandboxRoute, type LearningSandboxRoute } from "./learning/routes";

export const SANDBOX_PATH = "/sandbox/business-preview";
export const SANDBOX_ENTER_PATH = `${SANDBOX_PATH}/enter`;
export const SANDBOX_SESSION_COOKIE = "umtuba_business_sandbox";
export const SANDBOX_MIN_TOKEN_LENGTH = 16;
export const SANDBOX_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const SANDBOX_TOKEN_QUERY = "sandbox_token";

export const SANDBOX_SECTIONS = [
  "learning",
  "learning/catalog",
  "learning/search",
  "learning/student",
  "learning/students",
  "learning/instructor",
  "learning/instructors",
  "learning/admin",
  "learning/partners",
  "learning/enrollment-models",
  "store",
  "store/catalog",
  "store/favorites",
  "store/cart",
  "store/checkout",
  "store/orders",
  "store/returns",
  "store/seller",
  "store/seller/products",
  "store/seller/analytics",
  "store/seller/finance",
  "store/admin",
  "store/providers",
  "store/partners",
  "store/economics",
  "commercial",
  "rights",
] as const;

export type SandboxSection = (typeof SANDBOX_SECTIONS)[number];

export function sandboxHref(section?: string, extraQuery?: string): string {
  const path = section ? `${SANDBOX_PATH}/${section.replace(/^\/+|\/+$/g, "")}` : SANDBOX_PATH;
  return extraQuery ? `${path}?${extraQuery}` : path;
}

export function isSandboxPath(pathname: string): boolean {
  return pathname === SANDBOX_PATH || pathname.startsWith(`${SANDBOX_PATH}/`);
}

export type ParsedSandboxSection =
  | { kind: "hub" }
  | { kind: "section"; section: SandboxSection }
  | { kind: "course"; slug: string }
  | { kind: "product"; slug: string }
  | { kind: "order"; id: string }
  | { kind: "learning"; route: LearningSandboxRoute }
  | { kind: "unknown" };

export function parseSandboxSection(segments: string[] | undefined): ParsedSandboxSection {
  if (!segments || segments.length === 0) return { kind: "hub" };
  if (segments[0] === "enter") return { kind: "unknown" };

  const learning = parseLearningSandboxRoute(segments);
  if (learning) return { kind: "learning", route: learning };

  if (segments[0] === "store" && segments[1] === "products" && segments[2] && segments.length === 3) {
    return { kind: "product", slug: segments[2] };
  }
  if (segments[0] === "store" && segments[1] === "orders" && segments[2] && segments.length === 3) {
    return { kind: "order", id: segments[2] };
  }

  const joined = segments.join("/");
  if ((SANDBOX_SECTIONS as readonly string[]).includes(joined)) {
    return { kind: "section", section: joined as SandboxSection };
  }
  return { kind: "unknown" };
}

export function isSandboxStorePath(pathname: string): boolean {
  return pathname === `${SANDBOX_PATH}/store` || pathname.startsWith(`${SANDBOX_PATH}/store/`);
}
