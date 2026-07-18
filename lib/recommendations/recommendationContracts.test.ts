import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(...parts: string[]): string {
  return readFileSync(path.join(process.cwd(), ...parts), "utf8");
}

describe("recommendation infrastructure contracts", () => {
  it("ships migration + verify SQL for watch signals and quality tables", () => {
    const migration = readRepoFile(
      "supabase/migrations/20260731_recommendation_infrastructure_v1.sql"
    );
    const verify = readRepoFile(
      "scripts/verify-recommendation-infrastructure.sql"
    );

    expect(migration).toMatch(/create table if not exists public\.watch_signals/);
    expect(migration).toMatch(/user_interest_profiles/);
    expect(migration).toMatch(/creator_quality_signals/);
    expect(migration).toMatch(/video_quality_signals/);
    expect(migration).toMatch(/record_watch_signal/);
    expect(migration).toMatch(/ml_features/);
    expect(migration).toMatch(/deterministic-v1/);
    expect(migration).toMatch(/watch_duration_ms/);
    expect(migration).toMatch(/watch_percent/);
    expect(migration).toMatch(/rewatch_count/);
    expect(migration).toMatch(/follow_after_watch/);
    expect(migration).toMatch(/skipped_early/);

    expect(verify).toMatch(/20260731_recommendation_infrastructure/);
    expect(verify).toMatch(/record_watch_signal/);
    expect(verify).toMatch(/watch_signals/);
  });

  it("keeps chronological feed loader intact (no ranking rewrite)", () => {
    const feed = readRepoFile("lib/supabase/videoPostsServer.ts");
    expect(feed).toMatch(/loadCanonicalVideoFeedPage/);
    expect(feed).toMatch(/created_at/);
    expect(feed).not.toMatch(/assembleRecommendationPage/);
    expect(feed).not.toMatch(/record_watch_signal/);
  });

  it("wires Discover and Watch to flush watch signals without replacing view RPC", () => {
    const discoverCard = readRepoFile(
      "app/discover/components/DiscoverVideoCard.tsx"
    );
    const videoSlide = readRepoFile("app/components/video/VideoSlide.tsx");
    const recordView = readRepoFile("app/lib/video/recordFeedView.ts");

    expect(discoverCard).toMatch(/flushWatchSession/);
    expect(discoverCard).toMatch(/recordFeedViewOnce/);
    expect(videoSlide).toMatch(/flushWatchSession/);
    expect(recordView).toMatch(/recordViewAction/);
  });

  it("documents manual apply in supabase README", () => {
    const readme = readRepoFile("supabase/README.md");
    expect(readme).toMatch(/20260731_recommendation_infrastructure_v1\.sql/);
    expect(readme).toMatch(/verify-recommendation-infrastructure\.sql/);
  });
});
