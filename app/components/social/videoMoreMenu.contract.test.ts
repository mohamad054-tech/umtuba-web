import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("video More menu v1", () => {
  it("replaces rail Report/Delete with one More menu on both feeds", () => {
    const menu = read("app/components/social/VideoMoreMenu.tsx");
    expect(menu).toMatch(/video\.more\.editCaption/);
    expect(menu).not.toMatch(/video\.more\.copyLink/);
    const share = read("app/components/social/ShareMenu.tsx");
    expect(share).toMatch(/Copy link/);
    expect(menu).toMatch(/video\.more\.notInterested/);
    expect(menu).toMatch(/video\.more\.report/);
    expect(menu).toMatch(/deletePostAction/);
    expect(menu).toMatch(/updatePostCaptionAction/);
    expect(menu).toMatch(/onHideFromFeed/);
    expect(menu).toMatch(/onUiLockChange/);
    expect(menu).toMatch(/Escape|useDialogA11y/);

    const discover = read("app/discover/components/DiscoverActionRail.tsx");
    expect(discover).toMatch(/VideoMoreMenu/);
    expect(discover).not.toMatch(/OwnerContentDeleteControl/);
    expect(discover).not.toMatch(/UgcReportControl/);

    const watch = read("app/components/video/VideoActionRail.tsx");
    expect(watch).toMatch(/VideoMoreMenu/);
    expect(watch).not.toMatch(/OwnerContentDeleteControl/);
    expect(watch).not.toMatch(/UgcReportControl/);

    const life = read("app/life/LifePostCard.tsx");
    expect(life).toMatch(/VideoMoreMenu/);
    expect(life).toMatch(/surface="life"/);
    expect(life).toMatch(/onHideFromFeed/);
    const lifeExperience = read("app/life/LifeExperience.tsx");
    expect(lifeExperience).toMatch(/handleRemoveFromList/);
    expect(lifeExperience).toMatch(/onHideFromFeed=\{handleRemoveFromList\}/);
  });
});
