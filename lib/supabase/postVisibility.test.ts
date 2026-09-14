import { describe, expect, it } from "vitest";
import {
  applyViewerVisibility,
  isPostInteractable,
  isPostVisibleToViewer,
  postsSelectVisible,
  readAuthorModerationStatus,
  viewerKey,
} from "./postVisibility";

const AUTHOR = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ADMIN = "33333333-3333-4333-8333-333333333333";

function post(input: {
  deleted?: boolean;
  status?: string | null;
  authorId?: string | null;
}) {
  return {
    user_id: input.authorId === undefined ? AUTHOR : input.authorId,
    deleted_at: input.deleted ? "2026-09-14T00:00:00.000Z" : null,
    author_moderation_status: input.status ?? "active",
  };
}

describe("postVisibility helper", () => {
  it("hides a removed post from other viewers", () => {
    const row = post({ deleted: true, status: "active" });
    expect(isPostVisibleToViewer(row, OTHER)).toBe(false);
    expect(isPostVisibleToViewer(row, null)).toBe(false);
    expect(isPostVisibleToViewer(row, ADMIN)).toBe(false);
  });

  it("hides a banned author's posts from everyone on public surfaces", () => {
    const row = post({ status: "banned" });
    expect(isPostVisibleToViewer(row, OTHER)).toBe(false);
    expect(isPostVisibleToViewer(row, AUTHOR)).toBe(false);
    expect(isPostVisibleToViewer(row, ADMIN)).toBe(false);
    expect(isPostVisibleToViewer(row, null)).toBe(false);
  });

  it("hides a suspended author's posts from everyone on public surfaces", () => {
    const row = post({ status: "suspended" });
    expect(isPostVisibleToViewer(row, OTHER)).toBe(false);
    expect(isPostVisibleToViewer(row, AUTHOR)).toBe(false);
    expect(isPostVisibleToViewer(row, null)).toBe(false);
  });

  it("lets a shadowbanned author see their own posts; nobody else does", () => {
    const row = post({ status: "shadowbanned" });
    expect(isPostVisibleToViewer(row, AUTHOR)).toBe(true);
    expect(isPostVisibleToViewer(row, OTHER)).toBe(false);
    expect(isPostVisibleToViewer(row, ADMIN)).toBe(false);
    expect(isPostVisibleToViewer(row, null)).toBe(false);
  });

  it("lets the owner see their own removed post with a removed state", () => {
    const row = post({ deleted: true, status: "active" });
    expect(isPostVisibleToViewer(row, AUTHOR)).toBe(true);
    expect(Boolean(row.deleted_at)).toBe(true);
  });

  it("does not treat a platform admin as a widened public viewer", () => {
    expect(isPostVisibleToViewer(post({ deleted: true }), ADMIN)).toBe(false);
    expect(isPostVisibleToViewer(post({ status: "shadowbanned" }), ADMIN)).toBe(
      false
    );
  });

  it("rejects like/comment on a removed or non-active post, including the owner", () => {
    expect(isPostInteractable(post({ deleted: true, status: "active" }))).toBe(
      false
    );
    expect(isPostInteractable(post({ status: "banned" }))).toBe(false);
    expect(isPostInteractable(post({ status: "suspended" }))).toBe(false);
    expect(isPostInteractable(post({ status: "shadowbanned" }))).toBe(false);
    expect(isPostInteractable(post({ status: "active" }))).toBe(true);
  });

  it("makes sitemap/OG anonymous visibility hide removed posts", () => {
    expect(isPostVisibleToViewer(post({ deleted: true }), null)).toBe(false);
    expect(isPostVisibleToViewer(post({ status: "active" }), null)).toBe(true);
  });

  it("makes profile counts match visible rows for a visitor vs owner", () => {
    const rows = [
      post({ status: "active" }),
      post({ deleted: true, status: "active" }),
      post({ status: "banned" }),
    ];
    const visibleToOther = rows.filter((row) =>
      isPostVisibleToViewer(row, OTHER)
    );
    const visibleToOwner = rows.filter((row) =>
      isPostVisibleToViewer(row, AUTHOR)
    );
    expect(visibleToOther).toHaveLength(1);
    expect(visibleToOwner).toHaveLength(2);
  });

  it("reads embed author status and ignores invalid viewer ids", () => {
    expect(
      readAuthorModerationStatus({
        visibility_author: { moderation_status: "Shadowbanned" },
      })
    ).toBe("shadowbanned");
    expect(viewerKey("not-a-uuid")).toBeNull();
    expect(viewerKey(AUTHOR)).toBe(AUTHOR);
  });

  it("applies anonymous and signed-in filters on the shared query helper", () => {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const query = {
      is(column: string, value: null) {
        calls.push({ method: "is", args: [column, value] });
        return this;
      },
      eq(column: string, value: string) {
        calls.push({ method: "eq", args: [column, value] });
        return this;
      },
      or(filters: string) {
        calls.push({ method: "or", args: [filters] });
        return this;
      },
    };

    applyViewerVisibility(query, null);
    expect(calls).toEqual([
      { method: "is", args: ["deleted_at", null] },
      { method: "eq", args: ["visibility_author.moderation_status", "active"] },
    ]);

    calls.length = 0;
    applyViewerVisibility(query, AUTHOR);
    expect(calls[0]?.method).toBe("or");
    expect(String(calls[0]?.args[0])).toContain("shadowbanned");
    expect(String(calls[0]?.args[0])).toContain(AUTHOR);
    expect(calls[1]?.method).toBe("or");
    expect(String(calls[1]?.args[0])).toContain("deleted_at.is.null");
  });

  it("keeps the author embed in one select helper", () => {
    expect(postsSelectVisible("id, content")).toContain(
      "visibility_author:profiles!user_id!inner(moderation_status)"
    );
  });
});
