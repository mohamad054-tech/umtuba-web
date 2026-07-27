import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  CONTENT_REGISTRY_RPCS,
  isIndependentVideoPost,
  sourceEntityIdFromPostId,
  sourceEntityIdFromUuid,
} from "./contentRegistry";
import { articleContentAdapter } from "./adapters/articleAdapter";
import { videoContentAdapter } from "./adapters/videoAdapter";
import {
  TEASER_DURATION_MS,
  TEASER_HEIGHT,
  TEASER_WIDTH,
  buildTeaserFfmpegArgsFromTemplate,
  buildTeaserTemplateContract,
  defaultCtaForTemplate,
  layoutTeaserTitle,
} from "./teaser/teaserTemplateEngine";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260868_unified_content_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Unified Content Foundation V1", () => {
  it("ships migration 20260868 with registry, RLS, RPCs, and backfill", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260868_unified_content_foundation_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.content_registry/);
    expect(sql).toMatch(/content_registry_kind_source_uidx/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/Public read published content registry/);
    expect(sql).toMatch(
      new RegExp(`create or replace function public\\.${CONTENT_REGISTRY_RPCS.upsert}`)
    );
    expect(sql).toMatch(
      new RegExp(`create or replace function public\\.${CONTENT_REGISTRY_RPCS.deactivate}`)
    );
    expect(sql).toMatch(
      new RegExp(`create or replace function public\\.${CONTENT_REGISTRY_RPCS.backfill}`)
    );
    expect(sql).toMatch(/grant execute on function public\.backfill_content_registry_v1\(\)\s+to service_role/);
    expect(sql).not.toMatch(/grant insert on table public\.content_registry to authenticated/);
    expect(sql).toMatch(/article_id is null/);
  });

  it("article adapter resolves canonical href and profile card", () => {
    const href = articleContentAdapter.resolveCanonicalHref(
      "11111111-1111-4111-8111-111111111111"
    );
    expect(href).toBe("/articles/11111111-1111-4111-8111-111111111111");
    expect(articleContentAdapter.resolveVisibility({ publishState: "published" })).toBe(
      "public"
    );
    expect(
      articleContentAdapter.resolveVisibility({ publishState: "unpublished" })
    ).toBe("private");
    const card = articleContentAdapter.resolveProfileCard({
      id: "r1",
      content_kind: "article",
      source_entity_id: "11111111-1111-4111-8111-111111111111",
      owner_user_id: "u1",
      visibility: "public",
      publish_state: "published",
      canonical_href: href,
      discovery_post_id: 42,
      title: "Hello",
      published_at: "2026-01-01T00:00:00Z",
      created_at: "",
      updated_at: "",
    });
    expect(card.kind).toBe("article");
    expect(card.discoveryPostId).toBe(42);
    expect(card.href).toBe(href);
  });

  it("video adapter treats only independent posts as video content", () => {
    expect(isIndependentVideoPost({ article_id: null })).toBe(true);
    expect(isIndependentVideoPost({ article_id: "art-1" })).toBe(false);
    expect(videoContentAdapter.resolveCanonicalHref("99")).toMatch(/post=99/);
    expect(sourceEntityIdFromPostId(99)).toBe("99");
    expect(sourceEntityIdFromUuid("abc")).toBe("abc");
  });

  it("profile All panel reads registry and keeps articles/videos tabs", () => {
    const experience = read("app/profile/ProfileExperience.tsx");
    expect(experience).toMatch(/ProfileAllPanel/);
    expect(experience).toMatch(/registryItems/);
    expect(experience).toMatch(/activeTab === "articles"/);
    expect(experience).toMatch(/activeTab === "videos"/);
    expect(experience).toMatch(/ProfileLinkedArticlePrompt/);
    const panel = read("app/profile/components/ProfileAllPanel.tsx");
    expect(panel).toMatch(/dir=\{dir\}/);
    expect(panel).toMatch(/No published content yet/);
  });

  it("publish and worker sync registry without breaking teaser path", () => {
    const actions = read("app/actions/articles.ts");
    expect(actions).toMatch(/articleContentAdapter/);
    expect(actions).toMatch(/enqueueArticleTeaserJob/);
    expect(actions).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    const worker = read("scripts/media/articleTeaserWorker.ts");
    expect(worker).toMatch(/syncArticleDiscoveryPost/);
    expect(worker).toMatch(/buildTeaserFfmpegArgs/);
    const videos = read("lib/supabase/videoPosts.ts");
    expect(videos).toMatch(/videoContentAdapter/);
  });

  it("teaser template engine stays 5s 9:16 silent h264 and supports article kind", () => {
    expect(TEASER_DURATION_MS).toBe(5000);
    expect(TEASER_WIDTH).toBe(1080);
    expect(TEASER_HEIGHT).toBe(1920);
    const contract = buildTeaserTemplateContract({
      kind: "article",
      title: "عنوان طويل للاختبار مع دعم العربية",
      creatorHandle: "lina",
      backgroundMode: "gradient",
    });
    expect(contract.audioMode).toBe("silent");
    expect(contract.aspectRatio).toBe("9:16");
    expect(defaultCtaForTemplate("article", "مرحبا")).toMatch(/اقرأ/);
    const layout = layoutTeaserTitle(contract.title);
    expect(layout.direction).toBe("rtl");
    expect(layout.lines.length).toBeGreaterThan(0);
    const args = buildTeaserFfmpegArgsFromTemplate({
      template: contract,
      outputPath: "out.mp4",
      fontFile: "C:/Windows/Fonts/arial.ttf",
    });
    expect(args).toContain("-t");
    expect(args).toContain("5");
    expect(args).toContain("libx264");
    expect(args).toContain("yuv420p");
    expect(args).toContain("-an");
    expect(args.some((a) => a.includes("1080x1920") || a.includes("1123x1996"))).toBe(
      true
    );
  });

  it("article ffmpeg wrapper delegates to shared engine", () => {
    const wrapper = read("lib/articles/articleTeaserFfmpeg.ts");
    expect(wrapper).toMatch(/buildTeaserFfmpegArgsFromTemplate/);
    expect(wrapper).toMatch(/buildTeaserTemplateContract/);
    const layout = read("lib/articles/articleTeaserTitleLayout.ts");
    expect(layout).toMatch(/teaserTemplateEngine/);
  });

  it("does not redesign Home feed loader", () => {
    const home = read("app/components/home/HomeFeedLoader.tsx");
    expect(home).toMatch(/DiscoverExperience/);
    expect(home).toMatch(/getDiscoverVideosServer/);
    expect(home).not.toMatch(/content_registry/);
  });

  it("architecture doc remains the approved design reference", () => {
    expect(
      existsSync(join(ROOT, "docs/architecture/UNIFIED_CONTENT_FOUNDATION_V1.md"))
    ).toBe(true);
  });
});
