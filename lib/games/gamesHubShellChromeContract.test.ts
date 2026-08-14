import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const shellSrc = readFileSync(
  join(process.cwd(), "app/components/games/GamesHubShell.tsx"),
  "utf8"
);
const hubSrc = readFileSync(
  join(process.cwd(), "app/components/games/GamesHub.tsx"),
  "utf8"
);

describe("GamesHubShell platform chrome contract", () => {
  it("keeps AppTopNav full-bleed (not nested inside max-w-3xl)", () => {
    const navIdx = shellSrc.indexOf("<AppTopNav");
    const constrainIdx = shellSrc.indexOf('className="mx-auto max-w-3xl');
    expect(navIdx).toBeGreaterThan(-1);
    expect(constrainIdx).toBeGreaterThan(-1);
    expect(navIdx).toBeLessThan(constrainIdx);
  });

  it("keeps a single document H1 via AppTopNav (Hub intro uses h2)", () => {
    expect(hubSrc).toMatch(/<h2[^>]*>\s*Games Hub\s*<\/h2>/);
    expect(hubSrc).not.toMatch(/<h1[^>]*>\s*Games Hub\s*<\/h1>/);
  });
});
