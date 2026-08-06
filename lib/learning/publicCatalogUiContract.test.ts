import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_LEARNER_ROUTES } from "./learnerDelivery";
import {
  isPublicCatalogEligible,
  LEARNING_PUBLIC_ROUTES,
  mapPublicCurriculum,
  resolvePublicIsFree,
  sanitizePublicText,
} from "./publicCatalog";

const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const CATALOG = read("app/learning/catalog/page.tsx");
const DETAIL = read("app/learning/catalog/[courseSlug]/page.tsx");
const LIB = read("lib/learning/publicCatalog.ts");

describe("Public catalog UI contract — listing page", () => {
  it("loads courses via listPublicCatalogCourses and renders empty state", () => {
    expect(CATALOG).toMatch(/listPublicCatalogCourses\(supabase\)/);
    expect(CATALOG).toMatch(/courses\.length === 0/);
    expect(CATALOG).toMatch(/No public courses are available yet\./);
  });

  it("renders course cards with metadata and canonical detail href", () => {
    expect(CATALOG).toMatch(/courses\.map\(\(course\)/);
    expect(CATALOG).toMatch(/\{course\.name\}/);
    expect(CATALOG).toMatch(/course\.description/);
    expect(CATALOG).toMatch(/course\.thumbnail_url \?\? course\.cover_url/);
    expect(CATALOG).toMatch(/course\.module_count/);
    expect(CATALOG).toMatch(/course\.lesson_count/);
    expect(CATALOG).toMatch(/course\.is_free \? "Free" : "Paid"/);
    expect(CATALOG).toMatch(
      /href=\{LEARNING_PUBLIC_ROUTES\.course\(course\.slug\)\}/
    );
    expect(CATALOG).toMatch(/>\s*View Course\s*</);
  });

  it("separates guest vs learner CTAs without instructor actions", () => {
    expect(CATALOG).toMatch(/getServerUser\(\)/);
    expect(CATALOG).toMatch(/LEARNING_LEARNER_ROUTES\.hub/);
    expect(CATALOG).toMatch(/APP_ROUTES\.signup/);
    expect(CATALOG).toMatch(/APP_ROUTES\.login/);
    expect(CATALOG).toMatch(/backHref=\{user \? LEARNING_LEARNER_ROUTES\.hub : APP_ROUTES\.home\}/);
    expect(CATALOG).not.toMatch(/LEARNING_INSTRUCTOR/);
    expect(CATALOG).not.toMatch(/\/learning\/instructor/);
    expect(CATALOG).not.toMatch(/Publish|Unpublish|Archive/);
  });

  it("has no raw HTML injection path on listing cards", () => {
    expect(CATALOG).not.toMatch(/dangerouslySetInnerHTML/);
    expect(CATALOG).not.toMatch(/innerHTML/);
  });
});

describe("Public catalog UI contract — course detail / landing", () => {
  it("loads by slug via loadPublicCourseBySlug and fail-closes with notFound", () => {
    expect(DETAIL).toMatch(/loadPublicCourseBySlug\(supabase, courseSlug\)/);
    expect(DETAIL).toMatch(/if \(!landing\) \{\s*notFound\(\);/);
    expect(DETAIL).toMatch(/backHref=\{LEARNING_PUBLIC_ROUTES\.catalog\}/);
  });

  it("renders published course identity and optional metadata safely", () => {
    expect(DETAIL).toMatch(/\{course\.name\}/);
    expect(DETAIL).toMatch(/course\.description/);
    expect(DETAIL).toMatch(/course\.cover_url \?\? course\.thumbnail_url/);
    expect(DETAIL).toMatch(/course\.difficulty \? \(/);
    expect(DETAIL).toMatch(/durationLabel \? \(/);
    expect(DETAIL).toMatch(/course\.is_free \? "Free" : "Paid"/);
  });

  it("renders curriculum preview in provided module/lesson order (titles only)", () => {
    expect(DETAIL).toMatch(/curriculum\.map\(\(mod\)/);
    expect(DETAIL).toMatch(/mod\.lessons\.map\(\(lesson\)/);
    expect(DETAIL).toMatch(/\{mod\.name\}/);
    expect(DETAIL).toMatch(/\{lesson\.name\}/);
    expect(DETAIL).toMatch(/Curriculum coming soon\./);
    expect(DETAIL).toMatch(
      /Module and lesson titles only\. Full content unlocks after enrollment\./
    );
    // Public curriculum must not deep-link into protected lesson delivery.
    expect(DETAIL).not.toMatch(/LEARNING_LEARNER_ROUTES\.lesson/);
    expect(DETAIL).not.toMatch(/href=\{`\/learning\/lessons\//);
  });

  it("separates guest / enrolled / enroll CTAs via current route truth", () => {
    expect(DETAIL).toMatch(/isUserEnrolledInCourse/);
    expect(DETAIL).toMatch(/\{!user \? \(/);
    expect(DETAIL).toMatch(/\) : enrolled \? \(/);
    expect(DETAIL).toMatch(/enrollInPublicCourseAction/);
    expect(DETAIL).toMatch(
      /loginNext = LEARNING_LEARNER_ROUTES\.course\(course\.id\)/
    );
    expect(DETAIL).toMatch(
      /href=\{LEARNING_LEARNER_ROUTES\.course\(course\.id\)\}/
    );
    expect(DETAIL).toMatch(/>\s*Continue Course\s*</);
    expect(DETAIL).toMatch(/>\s*Start Course\s*</);
    expect(DETAIL).toMatch(/Create Account/);
    expect(DETAIL).toMatch(/Log In/);
  });

  it("does not expose instructor edit/authoring actions", () => {
    expect(DETAIL).not.toMatch(/LEARNING_INSTRUCTOR/);
    expect(DETAIL).not.toMatch(/\/learning\/instructor/);
    expect(DETAIL).not.toMatch(/InstructorActionForm/);
    expect(DETAIL).not.toMatch(/publishCourse|archiveCourse/);
    expect(DETAIL).not.toMatch(/dangerouslySetInnerHTML/);
  });
});

describe("Public catalog UI contract — shared route + eligibility truth", () => {
  it("LEARNING_PUBLIC_ROUTES templates stay canonical", () => {
    expect(LEARNING_PUBLIC_ROUTES.catalog).toBe("/learning/catalog");
    expect(LEARNING_PUBLIC_ROUTES.course("ai-course")).toBe(
      "/learning/catalog/ai-course"
    );
    expect(LEARNING_PUBLIC_ROUTES.catalog).not.toBe(LEARNING_LEARNER_ROUTES.hub);
    expect(LIB).toMatch(/catalog:\s*"\/learning\/catalog"/);
  });

  it("listing/detail import route builders instead of hardcoding path templates", () => {
    for (const src of [CATALOG, DETAIL]) {
      expect(src).toMatch(/LEARNING_PUBLIC_ROUTES/);
      expect(src).not.toMatch(/href=\{`\/learning\/catalog\//);
      expect(src).not.toMatch(/href="\/learning\/catalog\//);
      expect(src).not.toMatch(/href=\{`\/learning\/courses\//);
      expect(src).not.toMatch(/href=\{`\/learning\/lessons\//);
    }
  });

  it("list/load helpers keep published+public filters and position ordering", () => {
    expect(LIB).toMatch(/\.eq\("status", "published"\)/);
    expect(LIB).toMatch(/\.eq\("visibility", "public"\)/);
    expect(LIB).toMatch(/\.order\("position", \{ ascending: true \}\)/);
    expect(LIB).toMatch(/isPublicCatalogEligible/);
    expect(isPublicCatalogEligible({ status: "published", visibility: "public" })).toBe(
      true
    );
    expect(isPublicCatalogEligible({ status: "draft", visibility: "public" })).toBe(
      false
    );
    expect(
      isPublicCatalogEligible({ status: "published", visibility: "private" })
    ).toBe(false);
  });

  it("curriculum mapper sorts by position and drops descriptions", () => {
    const mapped = mapPublicCurriculum([
      {
        id: "s2",
        name: "Later",
        slug: "later",
        position: 2,
        description: "secret section desc",
        lessons: [
          {
            id: "l2",
            name: "B",
            slug: "b",
            position: 2,
            description: "secret lesson",
          },
          {
            id: "l1",
            name: "A",
            slug: "a",
            position: 1,
            description: "secret lesson",
          },
        ],
      },
      {
        id: "s1",
        name: "First",
        slug: "first",
        position: 1,
        lessons: [],
      },
    ]);
    expect(mapped.map((m) => m.slug)).toEqual(["first", "later"]);
    expect(mapped[1].lessons.map((l) => l.slug)).toEqual(["a", "b"]);
    expect(JSON.stringify(mapped)).not.toMatch(/secret/);
  });

  it("optional metadata sanitization and free/paid helper fail closed safely", () => {
    expect(sanitizePublicText("Hello  sk-abc123secret  world")).toBe(
      "Hello world"
    );
    expect(sanitizePublicText("umtuba-package://x")).toBeNull();
    expect(resolvePublicIsFree({ marketplace_ready: false })).toBe(true);
    expect(resolvePublicIsFree({ marketplace_ready: true })).toBe(false);
    expect(resolvePublicIsFree({ allow_self_enroll: true })).toBe(true);
  });

  it("detail page surfaces query.error as alert without inventing fake course ids", () => {
    expect(DETAIL).toMatch(/query\.error/);
    expect(DETAIL).toMatch(/role="alert"/);
    expect(DETAIL).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(CATALOG).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});
