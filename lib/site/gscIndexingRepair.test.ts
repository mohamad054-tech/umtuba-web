import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROBOTS_ALLOW_PATHS, ROBOTS_DISALLOW_PATHS } from "./indexing";
import {
  buildLearningLessonMetadata,
  learningLessonPath,
} from "./learningSeo";
import { buildWatchUnavailableMetadata } from "./videoSeo";

const ROOT = process.cwd();

describe("GSC full indexing repair V1", () => {
  it("explicitly allows public Learning lesson and catalog prefixes", () => {
    expect(ROBOTS_ALLOW_PATHS).toContain("/learning/lessons");
    expect(ROBOTS_ALLOW_PATHS).toContain("/learning/catalog");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/learning/instructor");
    expect(ROBOTS_DISALLOW_PATHS).toContain("/learning/attempts");
    expect(ROBOTS_DISALLOW_PATHS).not.toContain("/learning");
    expect(ROBOTS_DISALLOW_PATHS).not.toContain("/learning/lessons");
    const robots = readFileSync(join(ROOT, "app/robots.ts"), "utf8");
    expect(robots).toMatch(/ROBOTS_ALLOW_PATHS/);
    expect(robots).toMatch(/force-dynamic/);
  });

  it("keeps private and account prefixes disallowed", () => {
    for (const path of [
      "/login",
      "/settings",
      "/messages",
      "/creator",
      "/admin",
      "/seller",
      "/store/cart",
    ]) {
      expect(ROBOTS_DISALLOW_PATHS).toContain(path);
    }
  });

  it("gives public lessons a self canonical and index,follow", () => {
    const id = "bb320cb4-81d5-4e00-a151-0249388fc542";
    expect(learningLessonPath(id)).toBe(`/learning/lessons/${id}`);
    const meta = buildLearningLessonMetadata({
      lessonId: id,
      title: "Public lesson",
      description: "A real public lesson.",
      indexable: true,
    });
    expect(meta.alternates?.canonical).toBe(`/learning/lessons/${id}`);
    expect(meta.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    });
    expect(meta.alternates?.languages?.["x-default"]).toBe(
      `/learning/lessons/${id}`
    );
  });

  it("noindexes unavailable lessons with a self canonical", () => {
    const meta = buildLearningLessonMetadata({
      lessonId: "missing-lesson",
      indexable: false,
    });
    expect(meta.alternates?.canonical).toBe("/learning/lessons/missing-lesson");
    expect(meta.robots).toMatchObject({
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    });
    expect(meta.alternates?.languages).toBeUndefined();
  });

  it("noindexes unpublished Watch posts on the post URL, not the hub", () => {
    const meta = buildWatchUnavailableMetadata(307);
    expect(meta.alternates?.canonical).toBe("/watch?post=307");
    expect(meta.robots).toMatchObject({
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    });
    expect(meta.alternates?.languages).toBeUndefined();
  });

  it("wires lesson and Watch pages to the repair helpers", () => {
    const lesson = readFileSync(
      join(ROOT, "app/learning/lessons/[lessonId]/page.tsx"),
      "utf8"
    );
    expect(lesson).toMatch(/buildLearningLessonMetadata/);
    expect(lesson).not.toMatch(/Lesson · Learning \| UMTUBA/);
    const watch = readFileSync(join(ROOT, "app/watch/page.tsx"), "utf8");
    expect(watch).toMatch(/notFound\(/);
    expect(watch).toMatch(/readWatchPostQuery/);
  });
});
