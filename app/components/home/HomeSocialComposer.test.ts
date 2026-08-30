import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("Home social composer PART 1B-A", () => {
  it("reuses CreatePostModal on Home shell without a second feed loader", () => {
    const shell = read("app/discover/components/DiscoverShell.tsx");
    const composer = read("app/components/home/HomeSocialComposer.tsx");
    const loader = read("app/components/home/HomeFeedLoader.tsx");
    const modal = read("app/components/CreatePostModal.tsx");

    expect(shell).toMatch(/HomeSocialComposer/);
    expect(shell).toMatch(/HomeSectionCircles/);
    expect(composer).toMatch(/CreatePostModal/);
    expect(composer).toMatch(/social\.composer\.prompt/);
    expect(composer).not.toMatch(/What's on your mind/);
    expect(modal).toMatch(/dispatchHomeSocialPosted/);
    expect(modal).toMatch(/social\.composer\.discardTitle/);
    expect(loader).toMatch(/getDiscoverVideosServer/);
    expect(loader).not.toMatch(/loadFeedPostsAction/);
  });

  it("shows the latest text/image post as an overlay, not a competing Home feed", () => {
    const layer = read("app/components/home/HomeLatestPostLayer.tsx");
    expect(layer).toMatch(/social\.latest\.eyebrow/);
    expect(layer).toMatch(/buildHomeSocialProfileHref/);
    expect(layer).toMatch(/toggleLikeAction/);
    expect(layer).toMatch(/toggleSaveAction/);
    expect(layer).toMatch(/ShareToMessagesPanel/);
    expect(layer).not.toMatch(/loadFeedPostsAction/);
    expect(layer).not.toMatch(/HomeFeedLoader/);
  });

  it("adds Send in Messages on the existing share menu", () => {
    const menu = read("app/components/social/ShareMenu.tsx");
    const rail = read("app/discover/components/DiscoverActionRail.tsx");
    expect(menu).toMatch(/onSendInMessages/);
    expect(menu).toMatch(/social\.shareMessages/);
    expect(rail).toMatch(/ShareToMessagesPanel/);
    expect(rail).toMatch(/onSendInMessages/);
  });
});
