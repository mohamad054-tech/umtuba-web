import { createClient } from "@supabase/supabase-js";
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
      or(filters: string, options?: { referencedTable?: string }) {
        calls.push({ method: "or", args: options ? [filters, options] : [filters] });
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
    expect(calls).toEqual([
      {
        method: "or",
        args: [
          `moderation_status.eq.active,and(moderation_status.eq.shadowbanned,id.eq.${AUTHOR})`,
          { referencedTable: "visibility_author" },
        ],
      },
      {
        method: "or",
        args: [`deleted_at.is.null,user_id.eq.${AUTHOR}`],
      },
    ]);
  });

  it("keeps the signed-in SQL filters equivalent to isPostVisibleToViewer", () => {
    const cases = [
      post({ status: "active" }),
      post({ deleted: true, status: "active" }),
      post({ status: "shadowbanned" }),
      post({ deleted: true, status: "shadowbanned" }),
      post({ status: "banned" }),
      post({ status: "suspended" }),
      post({ status: "active", authorId: OTHER }),
      post({ deleted: true, status: "active", authorId: OTHER }),
      post({ status: "shadowbanned", authorId: OTHER }),
    ];

    for (const row of cases) {
      const status = (row.author_moderation_status ?? "").toLowerCase();
      const authorId = row.user_id;
      const embedOk =
        status === "active" ||
        (status === "shadowbanned" && authorId === AUTHOR);
      const baseOk = !row.deleted_at || authorId === AUTHOR;
      expect(embedOk && baseOk).toBe(isPostVisibleToViewer(row, AUTHOR));
    }
  });

  it("builds PostgREST-valid anonymous and signed-in query strings", async () => {
    const anonymousUrl = await captureVisibilityQueryUrl(null);
    const signedInUrl = await captureVisibilityQueryUrl(AUTHOR);

    expectValidAnonymousVisibilityQuery(anonymousUrl);
    expectValidSignedInVisibilityQuery(signedInUrl, AUTHOR);
  });

  it("keeps the author embed in one select helper", () => {
    expect(postsSelectVisible("id, content")).toContain(
      "visibility_author:profiles!user_id!inner(moderation_status)"
    );
  });
});

const POSTGREST_LEAF =
  /^[A-Za-z_][A-Za-z0-9_]*\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|cs|cd)\./;

function splitTopLevel(args: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < args.length; i += 1) {
    const ch = args[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth -= 1;
    else if (ch === "," && depth === 0) {
      parts.push(args.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(args.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function walkLogicTree(tree: string, visitLeaf: (leaf: string) => void) {
  const trimmed = tree.trim();
  const wrap = /^(and|or|not)\(([\s\S]*)\)$/.exec(trimmed);
  if (wrap?.[2] !== undefined) {
    for (const part of splitTopLevel(wrap[2])) {
      walkLogicTree(part, visitLeaf);
    }
    return;
  }
  const parts = splitTopLevel(trimmed);
  if (parts.length > 1) {
    for (const part of parts) {
      walkLogicTree(part, visitLeaf);
    }
    return;
  }
  visitLeaf(trimmed);
}

function unwrapPostgrestGroup(tree: string): string {
  const trimmed = tree.trim();
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function expectValidPostgrestLogicTree(tree: string) {
  walkLogicTree(unwrapPostgrestGroup(tree), (leaf) => {
    expect(leaf, `invalid PostgREST leaf: ${leaf}`).toMatch(POSTGREST_LEAF);
    expect(leaf.startsWith("visibility_author.")).toBe(false);
    expect(leaf.split(".")[0]).not.toBe("visibility_author");
  });
}

async function captureVisibilityQueryUrl(
  viewerId: string | null
): Promise<string> {
  let captured = "";
  const supabase = createClient("http://127.0.0.1", "test-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (input: RequestInfo | URL) => {
        if (typeof input === "string") captured = input;
        else if (input instanceof URL) captured = input.toString();
        else captured = input.url;
        return new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json", "content-range": "0-0/0" },
        });
      },
    },
  });

  const { error } = await applyViewerVisibility(
    supabase
      .from("posts")
      .select(postsSelectVisible("id, user_id, deleted_at")),
    viewerId
  );
  expect(error).toBeNull();
  expect(captured).toContain("/posts");
  return captured;
}

function queryParams(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

function expectValidAnonymousVisibilityQuery(url: string) {
  const params = queryParams(url);
  expect(params.get("or")).toBeNull();
  expect(params.get("deleted_at")).toBe("is.null");
  expect(params.get("visibility_author.moderation_status")).toBe("eq.active");
}

function expectValidSignedInVisibilityQuery(url: string, viewer: string) {
  const params = queryParams(url);
  const parentOr = params.getAll("or");
  expect(parentOr).toHaveLength(1);
  expect(unwrapPostgrestGroup(parentOr[0] ?? "")).toBe(
    `deleted_at.is.null,user_id.eq.${viewer}`
  );
  expectValidPostgrestLogicTree(parentOr[0] ?? "");

  const embedOr = params.get("visibility_author.or");
  expect(unwrapPostgrestGroup(embedOr ?? "")).toBe(
    `moderation_status.eq.active,and(moderation_status.eq.shadowbanned,id.eq.${viewer})`
  );
  expectValidPostgrestLogicTree(embedOr ?? "");
  expect(embedOr).not.toContain("user_id");
  expect(embedOr).not.toContain("deleted_at");
}
