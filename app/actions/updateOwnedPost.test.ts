import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("updateOwnedPostAction contract", () => {
  it("requires a server user and delegates to owner-only update", () => {
    const src = read("app/actions/updateOwnedPost.ts");
    expect(src).toMatch(/"use server"/);
    expect(src).toMatch(/getServerUser/);
    expect(src).toMatch(/updatePostForOwner/);
    expect(src).not.toMatch(/createServiceRole|service_role|bypass/i);
  });

  it("does not write engagement columns", () => {
    const src = read("lib/posts/editOwnedPost.ts");
    expect(src).toMatch(/assertSafeUpdatePatch/);
    expect(src).toMatch(/Refusing to reset engagement counters/);
    expect(src).toMatch(/eq\("user_id", userId\)/);
  });

  it("puts owner Edit in the Watch/Home rail slot and keeps delete off that chrome", () => {
    const src = read("app/components/social/OwnerContentDeleteControl.tsx");
    expect(src).toMatch(/aria-label=\{copy\.editLabel\}/);
    expect(src).toMatch(/buildEditPostHref/);
    expect(src).toMatch(/>\s*Edit\s*</);
    expect(src).toMatch(/viewerMaySeeDeleteControl/);
    expect(src).not.toMatch(/deletePostAction/);
    expect(src).not.toMatch(/createServiceRole|service_role|bypass/i);
    const edit = read("app/edit/post/EditPostWorkspace.tsx");
    expect(edit).toMatch(/deletePostAction/);
  });
});
