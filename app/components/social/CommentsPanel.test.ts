import { describe, expect, it } from "vitest";
import {
  COMMENT_AUTH_PROMPT,
  buildCommentSignInHref,
} from "../../lib/social/commentDraft";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("CommentsPanel auth behavior", () => {
  it("wires returnPath into sign-in and preserves draft helpers", () => {
    const source = readFileSync(
      join(process.cwd(), "app/components/social/CommentsPanel.tsx"),
      "utf8"
    );
    expect(source).toMatch(/returnPath/);
    expect(source).toMatch(/buildCommentSignInHref/);
    expect(source).toMatch(/writeCommentDraft/);
    expect(source).toMatch(/COMMENT_AUTH_PROMPT/);
    expect(source).toMatch(/loadEpoch/);
    expect(source).toMatch(/focusCommentId/);
    expect(source).not.toMatch(/next=\/discover"/);
  });

  it("keeps auth prompt user-facing", () => {
    expect(COMMENT_AUTH_PROMPT.toLowerCase()).toMatch(/sign in/);
    expect(buildCommentSignInHref("/watch?post=9")).toContain("next=");
  });
});
