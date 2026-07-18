import { describe, expect, it } from "vitest";
import {
  appendUniqueById,
  FEED_LOAD_MORE_ERROR_MESSAGE,
  shouldStartFeedLoadMore,
} from "./feedPagination";

describe("feedPagination", () => {
  it("appends only unique ids and preserves existing order", () => {
    const current = [{ id: "1" }, { id: "2" }];
    const next = appendUniqueById(current, [
      { id: "2" },
      { id: "3" },
      { id: "1" },
    ]);
    expect(next.map((v) => v.id)).toEqual(["1", "2", "3"]);
    expect(current).toHaveLength(2);
  });

  it("gates concurrent and empty-cursor load-more", () => {
    expect(
      shouldStartFeedLoadMore({
        nextCursor: "c1",
        loadingMore: false,
      })
    ).toBe(true);
    expect(
      shouldStartFeedLoadMore({
        nextCursor: "c1",
        loadingMore: true,
      })
    ).toBe(false);
    expect(
      shouldStartFeedLoadMore({
        nextCursor: null,
        loadingMore: false,
      })
    ).toBe(false);
    expect(
      shouldStartFeedLoadMore({
        nextCursor: "c1",
        loadingMore: false,
        disabled: true,
      })
    ).toBe(false);
  });

  it("exposes a non-technical load-more error", () => {
    expect(FEED_LOAD_MORE_ERROR_MESSAGE).not.toMatch(/sql|supabase|stack/i);
    expect(FEED_LOAD_MORE_ERROR_MESSAGE.toLowerCase()).toMatch(/try again/);
  });
});
