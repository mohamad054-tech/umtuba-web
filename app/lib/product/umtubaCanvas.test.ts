import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(__dirname, "../../..");

describe("UMTUBA document canvas", () => {
  const globals = readFileSync(resolve(repoRoot, "app/globals.css"), "utf8");
  const layout = readFileSync(resolve(repoRoot, "app/layout.tsx"), "utf8");
  const discoverShell = readFileSync(
    resolve(repoRoot, "app/discover/components/DiscoverShell.tsx"),
    "utf8"
  );

  it("paints html and body with the dark canvas, never light-scheme white", () => {
    expect(globals).toMatch(/:root\s*\{[\s\S]*?--background:\s*#050510;/);
    expect(globals).toMatch(/color-scheme:\s*dark;/);
    expect(globals).toMatch(/html\s*\{[\s\S]*?background:\s*var\(--background\);/);
    expect(globals).toMatch(/html\s*\{[\s\S]*?overflow-x:\s*hidden;/);
    expect(globals).toMatch(/body\s*\{[\s\S]*?background:\s*var\(--background\);/);
    expect(globals).not.toMatch(/:root\s*\{[\s\S]*?--background:\s*#ffffff;/);
    expect(globals).not.toMatch(
      /prefers-color-scheme:\s*dark[\s\S]*--background:\s*#0a0a0a/
    );
    expect(layout).toMatch(/bg-\[#050510\]/);
  });

  it("clips Home atmosphere blobs so they cannot extend the document", () => {
    expect(discoverShell).toMatch(/overflow-x-hidden/);
    expect(discoverShell).toMatch(
      /pointer-events-none absolute inset-0 overflow-hidden/
    );
    expect(discoverShell).toMatch(/min-h-dvh/);
  });
});
