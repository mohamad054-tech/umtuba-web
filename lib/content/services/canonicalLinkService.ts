/**
 * Canonical Link Service — allowlisted internal href builders only.
 * Never accepts free-form client hrefs.
 */

import { APP_ROUTES, buildArticleHref } from "../../../app/lib/nav/routes";
import {
  isContentKind,
  parsePostIdFromSource,
  type ContentKind,
} from "../contentRegistry";
import { isArticleUuid } from "../../articles/articlesFoundation";

export type CanonicalLinkResult =
  | { ok: true; href: string }
  | { ok: false; message: string };

const UNSAFE_HREF_RE = /^(javascript:|data:|https?:|\/\/)/i;

export function isAllowlistedCanonicalHref(href: string): boolean {
  const value = href.trim();
  if (!value || UNSAFE_HREF_RE.test(value)) return false;
  if (value.startsWith("/articles/")) {
    const id = value.slice("/articles/".length).split(/[/?#]/)[0] ?? "";
    return isArticleUuid(id);
  }
  if (value.startsWith(`${APP_ROUTES.watch}?post=`)) {
    const raw = value.slice(`${APP_ROUTES.watch}?post=`.length).split("&")[0] ?? "";
    const n = Number(raw);
    return Number.isInteger(n) && n > 0;
  }
  return false;
}

export function buildCanonicalHref(
  kind: ContentKind | string,
  sourceEntityId: string
): CanonicalLinkResult {
  if (!isContentKind(kind)) {
    return { ok: false, message: "Unsupported content kind." };
  }
  const id = sourceEntityId.trim();
  if (!id) {
    return { ok: false, message: "Missing source entity id." };
  }

  if (kind === "article") {
    if (!isArticleUuid(id)) {
      return { ok: false, message: "Invalid article id." };
    }
    const href = buildArticleHref(id);
    if (!isAllowlistedCanonicalHref(href)) {
      return { ok: false, message: "Href not allowlisted." };
    }
    return { ok: true, href };
  }

  if (kind === "video") {
    const postId = parsePostIdFromSource(id);
    if (postId == null) {
      return { ok: false, message: "Invalid video id." };
    }
    const href = `${APP_ROUTES.watch}?post=${postId}`;
    if (!isAllowlistedCanonicalHref(href)) {
      return { ok: false, message: "Href not allowlisted." };
    }
    return { ok: true, href };
  }

  return { ok: false, message: "Unsupported content kind." };
}

/** Reject any client-supplied href unless it matches allowlist builders. */
export function assertTrustedCanonicalHref(href: string): CanonicalLinkResult {
  if (!isAllowlistedCanonicalHref(href)) {
    return { ok: false, message: "Untrusted canonical href." };
  }
  return { ok: true, href: href.trim() };
}
