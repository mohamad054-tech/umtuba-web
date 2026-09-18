import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGE_CATALOGS } from "../../i18n/messages/catalogs";
import { gamesArMessages, gamesEnMessages } from "../../i18n/messages/gamesCatalogs";
import {
  PLAYABLE_GAME_SLUGS,
  getPlayableGame,
  isPlayableGameSlug,
} from "./catalog";

const ROOT = join(process.cwd());

describe("playable games catalog", () => {
  it("lists the six approved slugs and 404s unknown ids", () => {
    expect([...PLAYABLE_GAME_SLUGS]).toEqual([
      "sudoku",
      "g2048",
      "snake",
      "memory",
      "xo",
      "hanoi",
    ]);
    expect(isPlayableGameSlug("sudoku")).toBe(true);
    expect(isPlayableGameSlug("quick-q")).toBe(false);
    expect(getPlayableGame("missing")).toBeNull();
  });

  it("writes Arabic and English games chrome and keeps the play page noindex", () => {
    expect(gamesArMessages["games.title"]).toBe("الألعاب");
    expect(gamesEnMessages["games.title"]).toBe("Games");
    expect(MESSAGE_CATALOGS.fr["games.title"]).toBe(gamesEnMessages["games.title"]);
    expect(MESSAGE_CATALOGS.es["games.play"]).toBe(gamesEnMessages["games.play"]);
    expect(MESSAGE_CATALOGS.de["games.newGame"]).toBe(gamesEnMessages["games.newGame"]);
    expect(MESSAGE_CATALOGS.pt["games.localBest"]).toBe(
      gamesEnMessages["games.localBest"]
    );
    const page = readFileSync(join(ROOT, "app/games/page.tsx"), "utf8");
    expect(page).not.toMatch(/not available/i);
    expect(page).not.toMatch(/\bBeta\b/);
    const play = readFileSync(join(ROOT, "app/games/[slug]/page.tsx"), "utf8");
    expect(play).toMatch(/notFound\(\)/);
    expect(play).toMatch(/index: "noindex"/);
    const sitemap = readFileSync(join(ROOT, "lib/site/indexing.ts"), "utf8");
    expect(sitemap).not.toMatch(/\/games\/\[slug\]/);
    expect(sitemap).not.toMatch(/gamesPlayPath/);
  });
});
