import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerUser = vi.fn();
const createClient = vi.fn();
const deletePostForOwner = vi.fn();
const revalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("../../lib/supabase/server", () => ({
  getServerUser: (...args: unknown[]) => getServerUser(...args),
  createClient: (...args: unknown[]) => createClient(...args),
}));

vi.mock("../../lib/supabase/deleteOwnedPost", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/supabase/deleteOwnedPost")>();
  return {
    ...actual,
    deletePostForOwner: (...args: unknown[]) => deletePostForOwner(...args),
  };
});

describe("deletePostAction authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClient.mockResolvedValue({ mocked: true });
  });

  it("UNAUTHENTICATED_DELETE_BLOCKED: anonymous cannot delete", async () => {
    getServerUser.mockResolvedValue(null);
    const { deletePostAction } = await import("./deletePost");
    const result = await deletePostAction(42);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("auth_required");
    }
    expect(deletePostForOwner).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("OWNER_DELETE: authenticated owner path reaches backend delete", async () => {
    getServerUser.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" });
    deletePostForOwner.mockResolvedValue({
      ok: true,
      postId: 42,
      postType: "video",
    });
    const { deletePostAction } = await import("./deletePost");
    const result = await deletePostAction(42);
    expect(result.ok).toBe(true);
    expect(deletePostForOwner).toHaveBeenCalledWith(
      { mocked: true },
      "11111111-1111-4111-8111-111111111111",
      42
    );
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("NON_OWNER_DELETE_BLOCKED: action returns backend denial", async () => {
    getServerUser.mockResolvedValue({ id: "22222222-2222-4222-8222-222222222222" });
    deletePostForOwner.mockResolvedValue({
      ok: false,
      code: "not_owner",
      message: "You can only delete your own content.",
    });
    const { deletePostAction } = await import("./deletePost");
    const result = await deletePostAction(42);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("not_owner");
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects invalid ids before hitting the database", async () => {
    getServerUser.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" });
    const { deletePostAction } = await import("./deletePost");
    const result = await deletePostAction(0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("invalid");
    }
    expect(deletePostForOwner).not.toHaveBeenCalled();
  });
});
