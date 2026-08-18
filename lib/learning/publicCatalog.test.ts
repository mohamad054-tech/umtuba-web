import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_PUBLIC_PREVIEW_MIGRATION,
  LEARNING_PUBLIC_PREVIEW_RPCS,
  LEARNING_PUBLIC_ROUTES,
  isPublicCatalogEligible,
  mapPublicCourseCard,
  mapPublicCurriculum,
  mapPublicPreview,
  resolvePublicIsFree,
  resolvePublicLessonSafeHref,
  sanitizePublicText,
} from "./publicCatalog";

const ROOT = process.cwd();
const MIGRATION = `supabase/migrations/${LEARNING_PUBLIC_PREVIEW_MIGRATION}`;

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Public Catalog Foundation V1 — routes & files", () => {
  it("exposes public catalog routes without colliding with My Learning hub", () => {
    expect(LEARNING_PUBLIC_ROUTES.catalog).toBe("/learning/catalog");
    expect(LEARNING_PUBLIC_ROUTES.course("ai-applications-master-course")).toBe(
      "/learning/catalog/ai-applications-master-course"
    );
    expect(LEARNING_PUBLIC_ROUTES.catalog).not.toBe("/learning");
  });

  it("ships migration after 20260865", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(LEARNING_PUBLIC_PREVIEW_MIGRATION).toBe(
      "20260866_learning_public_course_preview_foundation_v1.sql"
    );
    expect(MIGRATION > "supabase/migrations/20260865_articles_teaser_foundation_v1.sql").toBe(
      true
    );
  });
});

describe("Public Catalog Foundation V1 — sanitizePublicText", () => {
  it("strips umtuba-package:// URLs", () => {
    expect(
      sanitizePublicText("See umtuba-package://courses/ai/pack.zip for more")
    ).toBe("See for more");
  });

  it("strips package path mentions and sk- patterns", () => {
    expect(
      sanitizePublicText("Open package path then use sk-live-abc123XYZ")
    ).toBe("Open then use");
  });

  it("returns null for empty after sanitize", () => {
    expect(sanitizePublicText("umtuba-package://only")).toBeNull();
    expect(sanitizePublicText(null)).toBeNull();
    expect(sanitizePublicText("")).toBeNull();
  });
});

describe("Public Catalog Foundation V1 — private course filter", () => {
  it("rejects non-public / non-published courses", () => {
    expect(
      isPublicCatalogEligible({ status: "published", visibility: "public" })
    ).toBe(true);
    expect(
      isPublicCatalogEligible({ status: "published", visibility: "private" })
    ).toBe(false);
    expect(
      isPublicCatalogEligible({ status: "draft", visibility: "public" })
    ).toBe(false);
    expect(
      isPublicCatalogEligible({ status: "published", visibility: "unlisted" })
    ).toBe(false);
  });

  it("mapPublicCourseCard returns null for private rows", () => {
    expect(
      mapPublicCourseCard({
        id: "c1",
        name: "Secret",
        slug: "secret",
        status: "published",
        visibility: "private",
      })
    ).toBeNull();
  });
});

describe("Public Catalog Foundation V1 — preview mapping fail-closed", () => {
  it("returns null when disabled / missing / incomplete", () => {
    expect(mapPublicPreview(null)).toBeNull();
    expect(mapPublicPreview(undefined)).toBeNull();
    expect(
      mapPublicPreview({
        course_id: "c1",
        title: "T",
        summary: "S",
        body_excerpt: "B",
        enabled: false,
      })
    ).toBeNull();
    expect(
      mapPublicPreview({
        course_id: "c1",
        title: "T",
        summary: "S",
        body_excerpt: "B",
      })
    ).toBeNull();
  });

  it("maps enabled preview fields only", () => {
    const preview = mapPublicPreview({
      course_id: "c1",
      lesson_id: "l1",
      title: "Preview title",
      summary: "Preview summary",
      body_excerpt: "Body excerpt here",
      enabled: true,
      content_blocks: [{ type: "video" }],
      resources: [{ url: "umtuba-package://x" }],
    });
    expect(preview).toEqual({
      course_id: "c1",
      lesson_id: "l1",
      title: "Preview title",
      summary: "Preview summary",
      body_excerpt: "Body excerpt here",
      enabled: true,
    });
    expect(preview).not.toHaveProperty("content_blocks");
    expect(preview).not.toHaveProperty("resources");
  });
});

describe("Public Catalog Foundation V1 — public card mapper safety", () => {
  it("omits content blocks / resources / package paths from the card shape", () => {
    const card = mapPublicCourseCard({
      id: "f8ecde63-818c-49ac-a350-0a4008f20d5f",
      name: "AI Applications Master Course",
      slug: "ai-applications-master-course",
      status: "published",
      visibility: "public",
      description: "Learn AI. umtuba-package://secret.zip",
      difficulty: "intermediate",
      estimated_duration_minutes: 1200,
      marketplace_ready: false,
      branding_metadata: {
        thumbnail_url: "https://cdn.example.com/thumb.jpg",
        cover_url: "umtuba-package://cover.bin",
        intro_video_url: "https://cdn.example.com/intro.mp4",
      },
      ai_metadata: {
        skills: ["Prompting", "umtuba-package://x"],
        outcomes: ["Build apps"],
      },
      module_count: 8,
      lesson_count: 28,
      content_blocks: [{ id: "b1", body: "SECRET" }],
      resources: [{ url: "umtuba-package://r" }],
      package_url: "umtuba-package://course.zip",
    });

    expect(card).not.toBeNull();
    expect(card!.description).toBe("Learn AI.");
    expect(card!.thumbnail_url).toBe("https://cdn.example.com/thumb.jpg");
    expect(card!.cover_url).toBeNull();
    expect(card!.skills).toEqual(["Prompting"]);
    expect(card!.outcomes).toEqual(["Build apps"]);
    expect(card!.is_free).toBe(true);
    expect(card!).not.toHaveProperty("content_blocks");
    expect(card!).not.toHaveProperty("resources");
    expect(card!).not.toHaveProperty("package_url");
    expect(card!).not.toHaveProperty("intro_video_url");
    expect(JSON.stringify(card)).not.toMatch(/umtuba-package:/);
    expect(JSON.stringify(card)).not.toMatch(/content_blocks/);
  });

  it("marks marketplace_ready courses as paid when self-enroll unknown", () => {
    expect(resolvePublicIsFree({ marketplace_ready: true })).toBe(false);
    expect(
      resolvePublicIsFree({ marketplace_ready: true, allow_self_enroll: true })
    ).toBe(true);
  });
});

describe("Public Catalog Foundation V1 — curriculum mapper names only", () => {
  it("maps module + lesson titles and never copies descriptions", () => {
    const curriculum = mapPublicCurriculum([
      {
        id: "s1",
        name: "Module 1",
        slug: "m1",
        position: 1,
        description: "SECRET module desc umtuba-package://x",
        lessons: [
          {
            id: "l1",
            name: "Lesson A",
            slug: "a",
            position: 0,
            description: "SECRET lesson with package path",
          },
          {
            id: "l2",
            name: "Lesson B",
            slug: "b",
            position: 1,
            description: "sk-abc123",
          },
        ],
      },
    ]);

    expect(curriculum).toHaveLength(1);
    expect(curriculum[0].name).toBe("Module 1");
    expect(curriculum[0].lessons.map((l) => l.name)).toEqual([
      "Lesson A",
      "Lesson B",
    ]);
    expect(curriculum[0]).not.toHaveProperty("description");
    expect(curriculum[0].lessons[0]).not.toHaveProperty("description");
    expect(JSON.stringify(curriculum)).not.toMatch(/SECRET/);
    expect(JSON.stringify(curriculum)).not.toMatch(/umtuba-package:/);
    expect(JSON.stringify(curriculum)).not.toMatch(/sk-/);
    expect(JSON.stringify(curriculum)).not.toMatch(/description/);
  });
});

describe("Public Catalog Foundation V1 — migration contracts", () => {
  const sql = read(MIGRATION);

  it("creates preview table with fail-closed enabled default", () => {
    expect(sql).toMatch(/create table if not exists public\.learning_course_public_previews/);
    expect(sql).toMatch(/enabled boolean not null default false/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/FAIL CLOSED/i);
  });

  it("never grants public SELECT on content blocks or resources", () => {
    const body = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(body).not.toMatch(
      /grant\s+select\s+on\s+table\s+public\.learning_lesson_content_blocks/i
    );
    expect(body).not.toMatch(
      /grant\s+select\s+on\s+table\s+public\.learning_course_resources/i
    );
    expect(body).not.toMatch(
      /from\s+public\.learning_lesson_content_blocks/i
    );
    expect(body).not.toMatch(/from\s+public\.learning_course_resources/i);
    expect(body).not.toMatch(/join\s+public\.learning_lesson_content_blocks/i);
    expect(body).not.toMatch(/join\s+public\.learning_course_resources/i);
  });

  it("defines RPCs and grants get to anon + authenticated", () => {
    expect(sql).toMatch(
      new RegExp(
        `create or replace function public\\.${LEARNING_PUBLIC_PREVIEW_RPCS.upsert}`
      )
    );
    expect(sql).toMatch(
      new RegExp(
        `create or replace function public\\.${LEARNING_PUBLIC_PREVIEW_RPCS.get}`
      )
    );
    expect(sql).toMatch(
      /grant execute on function public\.get_learning_course_public_preview\(uuid\)\s+to anon, authenticated/
    );
    expect(sql).toMatch(/Video Preview streaming is OUT OF SCOPE/i);
  });

  it("public SELECT requires enabled + published public parent chain", () => {
    expect(sql).toMatch(/Public read enabled course previews/);
    expect(sql).toMatch(/enabled = true/);
    expect(sql).toMatch(/c\.status = 'published'/);
    expect(sql).toMatch(/c\.visibility = 'public'/);
    expect(sql).toMatch(/p\.status = 'published'/);
    expect(sql).toMatch(/p\.visibility = 'public'/);
    expect(sql).toMatch(/s\.status = 'active'/);
    expect(sql).toMatch(/s\.visibility = 'public'/);
  });
});

describe("Public lesson access context", () => {
  it("sends public lesson traffic to the course landing, never a raw lesson 404", () => {
    expect(
      resolvePublicLessonSafeHref({
        lesson_id: "8934ff00-6661-42bb-92c8-efe559e76ea1",
        lesson_name: "Lesson M01-L03",
        lesson_slug: "m01-l03",
        course_id: "course-ja-09",
        course_name: "Building AI Applications (Product Patterns)",
        course_slug: "ja-09",
      })
    ).toBe(
      "/learning/catalog/ja-09?lesson=8934ff00-6661-42bb-92c8-efe559e76ea1"
    );
    expect(resolvePublicLessonSafeHref(null)).toBe("/learning/catalog");
  });

  it("public lesson lookup stays on published+public titles only", () => {
    const src = read("lib/learning/publicCatalog.ts");
    expect(src).toContain("export async function loadPublicLessonAccessContext");
    expect(src).toMatch(/eq\("status", "published"\)/);
    expect(src).toMatch(/eq\("visibility", "public"\)/);
    expect(src).not.toMatch(
      /from\("learning_lesson_content_blocks"\)[\s\S]{0,80}loadPublicLessonAccessContext/
    );
  });

  it("public course landing lists curriculum titles without lesson deep-links", () => {
    const landing = read("app/learning/catalog/[courseSlug]/page.tsx");
    expect(landing).toContain("{lesson.name}");
    expect(landing).not.toMatch(/href=\{LEARNING_LEARNER_ROUTES\.lesson/);
    expect(landing).toMatch(/LEARNING_LEARNER_ROUTES\.lesson\(nextLessonId\)/);
    expect(landing).toContain("nextLessonId");
  });
});
