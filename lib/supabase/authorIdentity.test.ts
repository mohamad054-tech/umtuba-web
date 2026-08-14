import { describe, expect, it } from "vitest";
import { applyLiveAuthorIdentity, type PublicPostDTO } from "./videoPosts";

function post(overrides: Partial<PublicPostDTO> = {}): PublicPostDTO {
  return {
    id: 1,
    user_id: "11111111-1111-4111-8111-111111111111",
    content: "hello",
    post_type: "video",
    author_name: "Old Name",
    author_username: "@old_handle",
    author_avatar: "O",
    image_url: null,
    video_url: "https://example.com/v.mp4",
    article_id: null,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    views: 0,
    likedByMe: false,
    savedByMe: false,
    created_at: "2026-08-14T00:00:00.000Z",
    ...overrides,
  };
}

describe("UAF-11 live author identity overlay", () => {
  it("replaces snapshotted username and display name from profiles", () => {
    const [next] = applyLiveAuthorIdentity([post()], [
      {
        id: "11111111-1111-4111-8111-111111111111",
        username: "new_handle",
        display_name: "New Name",
        full_name: "New Name",
        avatar_initial: "N",
      },
    ]);
    expect(next.author_username).toBe("@new_handle");
    expect(next.author_name).toBe("New Name");
    expect(next.author_avatar).toBe("N");
  });

  it("keeps the snapshot when the post has no author user id", () => {
    const [next] = applyLiveAuthorIdentity([post({ user_id: null })], [
      {
        id: "11111111-1111-4111-8111-111111111111",
        username: "new_handle",
        display_name: "New Name",
      },
    ]);
    expect(next.author_username).toBe("@old_handle");
    expect(next.author_name).toBe("Old Name");
  });
});
