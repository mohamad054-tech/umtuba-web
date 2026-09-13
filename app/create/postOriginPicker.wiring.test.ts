import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, translate } from "../../lib/i18n";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("post origin picker wiring", () => {
  it("is shared by both create forms and never geolocates", () => {
    const picker = read("app/create/PostOriginPicker.tsx");
    const video = read("app/create/video/CreateVideoForm.tsx");
    const post = read("app/create/post/CreatePostForm.tsx");
    const action = read("app/actions/createVideoPost.ts");
    const insert = read("lib/supabase/videoPosts.ts");
    const createPost = read("lib/supabase/posts.ts");

    expect(picker).toMatch(/create\.origin\.hint/);
    expect(picker).not.toMatch(/geolocation|getCurrentPosition|cf-ipcountry/i);
    expect(video).toMatch(/PostOriginPicker/);
    expect(post).toMatch(/PostOriginPicker/);
    expect(action).toMatch(/originCountryCode/);
    expect(insert).toMatch(/insertVideoPostLegacy/);
    expect(insert).toMatch(/originWriteFields/);
    expect(createPost).toMatch(/resolveWorldCityCenter/);
    expect(insert).not.toMatch(/city: "UMTUBA"/);
    expect(insert).not.toMatch(/country: "Worldwide"/);
  });

  it("ships origin picker keys in all 13 catalogs", () => {
    const keys = [
      "create.origin.countryLabel",
      "create.origin.cityLabel",
      "create.origin.optional",
      "create.origin.countryNone",
      "create.origin.cityPlaceholder",
      "create.origin.cityDisabledHint",
      "create.origin.clear",
      "create.origin.hint",
    ] as const;

    for (const locale of SUPPORTED_LOCALES) {
      for (const key of keys) {
        const value = translate(locale, key);
        expect(value.length).toBeGreaterThan(0);
        expect(value).not.toBe(key);
      }
    }
  });
});
