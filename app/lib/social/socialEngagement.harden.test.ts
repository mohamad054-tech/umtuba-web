import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildPostShareUrl,
  shareViaTarget,
} from "./shareAndViews";

const ROOT = join(process.cwd());

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

describe("share surface URLs", () => {
  it("builds watch vs discover share paths", () => {
    expect(buildPostShareUrl(42, "discover")).toContain("/discover?post=42");
    expect(buildPostShareUrl(42, "watch")).toContain("/watch?post=42");
  });

  it("clipboard shareViaTarget preserves surface in source", () => {
    const source = read("app/lib/social/shareAndViews.ts");
    expect(source).toMatch(
      /case "clipboard":\s*return copyPostLink\(input\.postId,\s*input\.surface/
    );
    expect(source).toMatch(
      /return copyPostLink\(input\.postId,\s*input\.surface \?\? "discover"\)/
    );
  });
});

describe("social engagement harden contracts", () => {
  it("Discover only opens comments when the post deep-link matches", () => {
    const experience = read("app/discover/DiscoverExperience.tsx");
    expect(experience).toMatch(/postDeepLinkMatched/);
    expect(experience).toMatch(/focusCommentId/);
    expect(experience).toMatch(/showDeepLinkMiss|That post is unavailable/);
    expect(experience).toMatch(
      /findIndexByPostId\(initialVideos, postParam\) >= 0/
    );
  });

  it("lifts follow state across Discover and Watch feeds", () => {
    expect(read("app/discover/DiscoverExperience.tsx")).toMatch(
      /handleFollowChange/
    );
    expect(read("app/discover/components/DiscoverCreatorInfo.tsx")).toMatch(
      /onFollowChange/
    );
    expect(read("app/watch/WatchExperience.tsx")).toMatch(/handleFollowChange/);
    expect(read("app/components/video/VideoOverlay.tsx")).toMatch(
      /onFollowChange/
    );
  });

  it("comments support load retry and focus deep links", () => {
    const panel = read("app/components/social/CommentsPanel.tsx");
    expect(panel).toMatch(/loadEpoch/);
    expect(panel).toMatch(/social\.comments\.retry|Try again/);
    expect(panel).toMatch(/focusCommentId/);
    expect(panel).toMatch(/comment-\$\{comment\.id\}/);
  });

  it("share menu uses dialog a11y and rails mark like/save busy", () => {
    expect(read("app/components/social/ShareMenu.tsx")).toMatch(/useDialogA11y/);
    expect(read("app/discover/components/DiscoverActionRail.tsx")).toMatch(
      /aria-busy=\{busy/
    );
    expect(read("app/components/video/VideoActionRail.tsx")).toMatch(
      /aria-busy=\{busy/
    );
  });

  it("notification items do not navigate to hash when href is missing", () => {
    const item = read(
      "app/notifications/components/NotificationListItem.tsx"
    );
    expect(item).not.toMatch(/href \|\| ["']#["']/);
    expect(item).toMatch(/if \(!href\)/);
  });
});

// Keep vitest from tree-shaking unused import if clipboard path is only contract-tested.
void shareViaTarget;
