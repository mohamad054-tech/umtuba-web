import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveMetadataTitle, stripTrailingBrandPipes } from "./titleBrand";
import { buildWatchPostMetadata, truthfulVideoTitle } from "./videoSeo";

describe("title brand appears once", () => {
  it("strips a trailing | UMTUBA suffix", () => {
    expect(stripTrailingBrandPipes("Admin | UMTUBA")).toBe("Admin");
    expect(stripTrailingBrandPipes("Campaign Review | UMTUBA Admin")).toBe(
      "Campaign Review"
    );
    expect(stripTrailingBrandPipes("Advertise on UMTUBA | UMTUBA")).toBe(
      "Advertise on UMTUBA"
    );
  });

  it("uses an absolute title when the segment already names the brand", () => {
    expect(resolveMetadataTitle("Ada (@ada) on UMTUBA")).toEqual({
      absolute: "Ada (@ada) on UMTUBA",
    });
    expect(resolveMetadataTitle("Advertise on UMTUBA | UMTUBA")).toEqual({
      absolute: "Advertise on UMTUBA",
    });
    expect(resolveMetadataTitle("Watch")).toBe("Watch");
  });

  it("keeps watch author titles to a single UMTUBA", () => {
    const title = truthfulVideoTitle({
      id: 1,
      caption: "  ",
      createdAt: "2026-08-01T00:00:00.000Z",
      durationMs: null,
      authorName: "Ada",
      authorUsername: "ada",
      articleTitle: null,
    });
    expect(title).toBe("Ada (@ada) on UMTUBA");
    const meta = buildWatchPostMetadata({
      id: 1,
      caption: "  ",
      createdAt: "2026-08-01T00:00:00.000Z",
      durationMs: null,
      authorName: "Ada",
      authorUsername: "ada",
      articleTitle: null,
    });
    expect(meta.title).toEqual({ absolute: "Ada (@ada) on UMTUBA" });
    expect(JSON.stringify(meta.title)).not.toMatch(/UMTUBA.+UMTUBA/);
  });

  it("does not leave | UMTUBA inside page metadata title strings", () => {
    const root = join(process.cwd(), "app");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(ts|tsx)$/.test(name)) files.push(path);
      }
    };
    walk(root);
    const leaks: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      if (/title:\s*(["'`])[^"'`]*\|\s*UMTUBA/.test(source)) {
        leaks.push(file.replace(process.cwd() + "\\", ""));
      }
    }
    expect(leaks).toEqual([]);
  });
});
