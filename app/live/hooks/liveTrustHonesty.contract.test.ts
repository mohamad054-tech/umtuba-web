import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("beta trust & honesty contracts", () => {
  it("labels landing secondary CTA as Go Live to /live", () => {
    const hero = read("app/components/landing/LandingHero.tsx");
    expect(hero).toMatch(/Go Live/);
    expect(hero).toMatch(/APP_ROUTES\.live/);
    expect(hero).not.toMatch(/Watch Demo/);
  });

  it("marks captions and quality as Coming soon (not fake controls)", () => {
    const controls = read("app/live/components/LiveStreamControls.tsx");
    expect(controls).toMatch(/Captions · Coming soon/);
    expect(controls).toMatch(/Quality · Coming soon/);
    expect(controls).not.toMatch(/LIVE_QUALITY_OPTIONS/);
    expect(controls).not.toMatch(/aria-label="Stream quality"/);
    expect(controls).not.toMatch(/onToggleCaptions\(\)/);

    const stage = read("app/live/components/LiveStreamStage.tsx");
    expect(stage).not.toMatch(/Captions will connect to live translation/);
  });

  it("keeps Live lobby copy free of SQL filenames and env var names", () => {
    const lobby = read("app/live/LiveExperience.tsx");
    expect(lobby).toMatch(/Live is temporarily unavailable/);
    expect(lobby).toMatch(/Try again/);
    expect(lobby).toMatch(/getLiveBetaReadinessAction/);
    expect(lobby).not.toMatch(/20260713_live_streaming/);
    expect(lobby).not.toMatch(/LIVEKIT_API/);
    expect(lobby).not.toMatch(/supabase\/migrations/);
  });

  it("keeps LiveKit mint errors free of env var instructions", () => {
    const mint = read("lib/livekit/server.ts");
    expect(mint).toMatch(/Live video is temporarily unavailable/);
    expect(mint).not.toMatch(
      /Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL/
    );
    expect(mint).not.toMatch(/Set NEXT_PUBLIC_LIVEKIT_URL to your LiveKit/);
  });
});
