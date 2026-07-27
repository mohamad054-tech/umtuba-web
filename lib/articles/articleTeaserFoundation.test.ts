import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ARTICLE_TEASER_DURATION_MS,
  ARTICLE_TEASER_RPCS,
  gradientTemplatePath,
  isTeaserPostFeedVisible,
  planArticleTeaserPublish,
  resolveGradientTemplate,
  sanitizeTeaserErrorCode,
  teaserStatusUserMessage,
} from "./articleTeaserFoundation";
import { buildTeaserFfmpegArgs } from "./articleTeaserFfmpeg";
import {
  detectTeaserTextDirection,
  layoutTeaserTitle,
  teaserCtaForTitle,
} from "./articleTeaserTitleLayout";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260867_article_auto_teaser_video_v1.sql";
const WORKER = "scripts/media/articleTeaserWorker.ts";
const ACTIONS = "app/actions/articles.ts";
const CREATE_FORM = "app/create/article/CreateArticleForm.tsx";
const ARTICLE_PAGE = "app/articles/[articleId]/page.tsx";
const DEEPLINK_TEST =
  "app/lib/nav/creatorProfileArticleDeeplink.test.ts";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Article Auto-Teaser Video V1", () => {
  it("ships additive migration 20260867 with jobs table and RPCs", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260867_article_auto_teaser_video_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.article_teaser_jobs/);
    expect(sql).toMatch(/article_teaser_jobs_article_id_uidx/);
    expect(sql).toMatch(/status in \('not_required', 'pending', 'processing', 'ready', 'failed'\)/);
    expect(sql).toMatch(
      new RegExp(`create or replace function public\\.${ARTICLE_TEASER_RPCS.enqueue}`)
    );
    expect(sql).toMatch(
      new RegExp(`create or replace function public\\.${ARTICLE_TEASER_RPCS.claim}`)
    );
    expect(sql).toMatch(
      new RegExp(`create or replace function public\\.${ARTICLE_TEASER_RPCS.retry}`)
    );
    expect(sql).toMatch(/grant execute on function public\.claim_article_teaser_job\(\)\s+to service_role/);
    expect(sql).not.toMatch(/grant execute on function public\.claim_article_teaser_job\(\)\s+to authenticated/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/Owners read own article teaser jobs/);
  });

  it("uploaded teaser plan skips generation; missing teaser plans generate", () => {
    expect(planArticleTeaserPublish({ teaserPostId: 42 })).toEqual({
      mode: "uploaded",
    });
    expect(planArticleTeaserPublish({ teaserPostId: null })).toEqual({
      mode: "generate",
    });
    expect(planArticleTeaserPublish({ teaserPostId: 0 })).toEqual({
      mode: "generate",
    });
  });

  it("publish action enqueues job only for generate path and never runs ffmpeg", () => {
    const src = read(ACTIONS);
    expect(src).toMatch(/planArticleTeaserPublish/);
    expect(src).toMatch(/enqueueArticleTeaserJob/);
    expect(src).toMatch(/markArticleTeaserUploaded/);
    expect(src).not.toMatch(/ffmpeg/i);
    expect(src).not.toMatch(/articleTeaserWorker/);
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("worker produces silent 5s ffmpeg args and uses service role only in script", () => {
    expect(existsSync(join(ROOT, WORKER))).toBe(true);
    const worker = read(WORKER);
    expect(worker).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(worker).toMatch(/createMediaWorkerRuntime|createArticleTeaserProcessor/);
    const processor = read(
      "lib/media/processing/processors/articleTeaserProcessor.ts"
    );
    expect(processor).toMatch(/buildTeaserFfmpegArgs/);
    expect(processor).toMatch(/claim_article_teaser_job|ARTICLE_TEASER_RPCS\.claim/);
    expect(processor).toMatch(/media_status: "ready"/);
    expect(processor).toMatch(/markJobFailed/);

    const args = buildTeaserFfmpegArgs({
      title: "مرحبا بالعالم",
      authorLabel: "lina",
      outputPath: "out.mp4",
      fontFile: "C:/Windows/Fonts/arial.ttf",
      backgroundMode: "gradient",
      backgroundAssetPath: gradientTemplatePath("midnight"),
    });
    expect(args).toContain("-t");
    expect(args).toContain(String(ARTICLE_TEASER_DURATION_MS / 1000));
    expect(args).toContain("-an");
    expect(args).toContain("libx264");
    expect(ARTICLE_TEASER_DURATION_MS).toBe(5000);
  });

  it("feed gate hides posts before ready / without video_path", () => {
    expect(
      isTeaserPostFeedVisible({ media_status: "pending", video_path: "x.mp4" })
    ).toBe(false);
    expect(
      isTeaserPostFeedVisible({ media_status: "ready", video_path: null })
    ).toBe(false);
    expect(
      isTeaserPostFeedVisible({
        media_status: "ready",
        video_path: "user/teaser.mp4",
      })
    ).toBe(true);
  });

  it("failure messaging stays user-safe and sanitizes error codes", () => {
    expect(sanitizeTeaserErrorCode("render_failed; DROP TABLE")).toBe(
      "render_failed"
    );
    expect(sanitizeTeaserErrorCode("hack")).toBe("render_failed");
    expect(teaserStatusUserMessage("failed")).not.toMatch(/stack|ffmpeg|sql/i);
    expect(teaserStatusUserMessage("pending")).toMatch(/queued/i);
  });

  it("supports Arabic RTL, LTR, and long title wrapping", () => {
    expect(detectTeaserTextDirection("مرحبا بك في أم طيبة")).toBe("rtl");
    expect(detectTeaserTextDirection("Hello UMTUBA world")).toBe("ltr");
    expect(teaserCtaForTitle("عنوان عربي")).toMatch(/اقرأ/);
    expect(teaserCtaForTitle("English title")).toMatch(/Read full article/);
    const long = layoutTeaserTitle(
      "هذا عنوان طويل جدا جدا جدا يجب أن يلتف على عدة أسطر بدون أن يخرج من الإطار المحدد للفيديو"
    );
    expect(long.direction).toBe("rtl");
    expect(long.lines.length).toBeGreaterThan(1);
    expect(long.lines.length).toBeLessThanOrEqual(4);
    expect(long.fontSize).toBeLessThanOrEqual(72);
  });

  it("create UI offers optional video and auto-teaser preview settings", () => {
    const form = read(CREATE_FORM);
    expect(form).toMatch(/Auto teaser preview/);
    expect(form).toMatch(/aspect-\[9\/16\]/);
    expect(form).toMatch(/backgroundMode/);
    expect(form).toMatch(/silent/);
    expect(form).toMatch(/deferred/);
    expect(form).not.toMatch(/spotify|youtube/i);
  });

  it("owner article page can retry or attach manual teaser", () => {
    const page = read(ARTICLE_PAGE);
    expect(page).toMatch(/ArticleTeaserOwnerPanel/);
    expect(page).toMatch(/getArticleTeaserJobForOwner/);
    const panel = read(
      "app/articles/[articleId]/ArticleTeaserOwnerPanel.tsx"
    );
    expect(panel).toMatch(/Retry auto teaser/);
    expect(panel).toMatch(/Use uploaded video/);
    expect(panel).not.toMatch(/stack|stderr|SERVICE_ROLE/i);
  });

  it("does not modify old articles migration or invent music library", () => {
    const old = read(
      "supabase/migrations/20260865_articles_teaser_foundation_v1.sql"
    );
    expect(old).toMatch(/publish_my_article/);
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/platform_teaser_audio_tracks/);
    expect(sql).toMatch(/audio_mode text not null default 'silent'/);
  });

  it("keeps creator profile article deeplink tests intact", () => {
    expect(existsSync(join(ROOT, DEEPLINK_TEST))).toBe(true);
    const src = read(DEEPLINK_TEST);
    expect(src).toMatch(/buildCreatorProfileHref/);
    expect(src).toMatch(/ProfileLinkedArticlePrompt/);
  });

  it("idempotency: unique article_id and worker reuses generated_post_id", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/unique index if not exists article_teaser_jobs_article_id_uidx/);
    const processor = read(
      "lib/media/processing/processors/articleTeaserProcessor.ts"
    );
    expect(processor).toMatch(/generated_post_id/);
    expect(processor).toMatch(/existing\?\.id|alreadyReady|idempotent/i);
  });

  it("resolves gradient templates safely", () => {
    expect(resolveGradientTemplate("template:aurora")).toBe("aurora");
    expect(resolveGradientTemplate("nope")).toBe("midnight");
  });
});
