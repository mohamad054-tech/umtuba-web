/**
 * Registry route template helpers.
 * Paths come from Page Registry only — callers supply real context IDs/slugs.
 */

import { getPageById } from "../pageRegistry";

/** Resolve a static registry path by page id. */
export function requireRegistryPath(pageId: string): string {
  const page = getPageById(pageId);
  if (!page) {
    throw new Error(`Missing registry page: ${pageId}`);
  }
  if (page.dynamic) {
    throw new Error(
      `Static registry path required, got dynamic template: ${pageId} (${page.path})`
    );
  }
  return page.path;
}

/**
 * Fill a registry dynamic route template with concrete params.
 * Does not invent IDs — callers must supply real context values.
 * Preserves prior URL construction (raw segment join, no extra encoding).
 */
export function fillRegistryPath(
  pageId: string,
  params: Record<string, string>
): string {
  const page = getPageById(pageId);
  if (!page) {
    throw new Error(`Missing registry page: ${pageId}`);
  }

  let path = page.path;
  for (const [key, value] of Object.entries(params)) {
    const token = `[${key}]`;
    if (!path.includes(token)) {
      throw new Error(
        `Registry template ${pageId} missing param token ${token}`
      );
    }
    path = path.split(token).join(value);
  }

  if (/\[[^\]]+\]/.test(path)) {
    throw new Error(
      `Unresolved registry template params for ${pageId}: ${path}`
    );
  }

  return path;
}

/** Registry template string (with [param] tokens) for a page id. */
export function requireRegistryTemplate(pageId: string): string {
  const page = getPageById(pageId);
  if (!page) {
    throw new Error(`Missing registry page: ${pageId}`);
  }
  return page.path;
}

/**
 * Active-state match for static or nested dynamic routes.
 * Matches exact path or nested children under the href prefix.
 */
export function isRegistryHrefActive(
  pathname: string,
  href: string
): boolean {
  const path = pathname.split("?")[0] || "/";
  const base = href.split("?")[0] || "/";
  if (base === "/") {
    return path === "/";
  }
  return path === base || path.startsWith(`${base}/`);
}
