import { describe, expect, it } from "vitest";
import {
  COMMENT_AUTH_PROMPT,
  buildCommentSignInHref,
  commentDraftStorageKey,
} from "./commentDraft";

describe("commentDraft", () => {
  it("builds a post-scoped draft key", () => {
    expect(commentDraftStorageKey(42)).toBe("umtuba_comment_draft_42");
  });

  it("builds a sign-in href that preserves return path", () => {
    const href = buildCommentSignInHref("/watch?post=12");
    expect(href).toContain("/login?");
    expect(href).toContain("next=");
    expect(decodeURIComponent(href.split("next=")[1] ?? "")).toBe(
      "/watch?post=12"
    );
  });

  it("keeps auth prompt non-technical", () => {
    expect(COMMENT_AUTH_PROMPT.toLowerCase()).toMatch(/sign in/);
    expect(COMMENT_AUTH_PROMPT).not.toMatch(/auth|jwt|token|401/i);
  });
});
