import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("Post Journey globe wiring", () => {
  it("passes get_post_journey countries into the globe section", () => {
    const page = read("app/post-journey/page.tsx");
    expect(page).toMatch(/getPostJourney/);
    expect(page).toMatch(/<PostJourneyGlobeSection/);
    expect(page).toMatch(/hasPost=\{hasPost\}/);
    expect(page).toMatch(/countries=\{journey\?\.countries \?\? \[\]\}/);
    expect(page).toMatch(/isoCountryDisplayName/);
  });

  it("forwards countries into JourneyGlobe and keeps the no-postId demo path", () => {
    const section = read("app/post-journey/PostJourneyGlobeSection.tsx");
    expect(section).toMatch(/hasPost=\{hasPost\}/);
    expect(section).toMatch(/countries=\{countries\}/);
    const globe = read("app/components/JourneyGlobe.tsx");
    expect(globe).toMatch(/const showDemoNetwork = !hasPost/);
    expect(globe).toMatch(/resolveGlobeReachMarkers/);
    expect(globe).toMatch(/CountryReachMarker/);
    expect(globe).not.toMatch(/profiles\.city/);
    expect(globe).not.toMatch(/profiles\.country/);
  });
});
