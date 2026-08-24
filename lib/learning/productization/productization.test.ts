import { afterEach, describe, expect, it } from "vitest";
import { inferVisualCategory, mapPublicCardToVisual } from "./mapToVisual";
import {
  hasLearningBackendEnv,
  isLearningVisualDemoForced,
  shouldPreferLiveLearningData,
} from "./env";

const KEYS = [
  "NEXT_PUBLIC_UMTUBA_LEARNING_VISUAL_DEMO",
  "UMTUBA_LEARNING_VISUAL_DEMO",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const snapshot = Object.fromEntries(
  KEYS.map((key) => [key, process.env[key]])
);

afterEach(() => {
  for (const key of KEYS) {
    const value = snapshot[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("learning productization env", () => {
  it("does not treat missing backend as forced demo", () => {
    delete process.env.NEXT_PUBLIC_UMTUBA_LEARNING_VISUAL_DEMO;
    delete process.env.UMTUBA_LEARNING_VISUAL_DEMO;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(isLearningVisualDemoForced()).toBe(false);
    expect(hasLearningBackendEnv()).toBe(false);
    expect(shouldPreferLiveLearningData()).toBe(false);
  });

  it("forces demo only when the explicit flag is on", () => {
    process.env.UMTUBA_LEARNING_VISUAL_DEMO = "1";
    expect(isLearningVisualDemoForced()).toBe(true);
    expect(shouldPreferLiveLearningData()).toBe(false);
  });
});

describe("learning visual mapping", () => {
  it("maps a public catalog card into the approved visual course model", () => {
    const course = mapPublicCardToVisual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Practical AI Studio",
      slug: "practical-ai-studio",
      description: "Ship a small model with Arabic-first prompts.",
      difficulty: "intermediate",
      estimated_duration_minutes: 180,
      thumbnail_url: null,
      cover_url: "https://example.com/cover.png",
      skills: ["prompts"],
      outcomes: ["Ship a studio"],
      module_count: 4,
      lesson_count: 12,
      is_free: true,
    });
    expect(course.slug).toBe("practical-ai-studio");
    expect(course.level).toBe("intermediate");
    expect(course.durationHours).toBe(3);
    expect(course.isFree).toBe(true);
    expect(course.category).toBe("ai");
    expect(course.id.startsWith("demo-")).toBe(false);
  });

  it("infers categories from bilingual hints", () => {
    expect(inferVisualCategory({ name: "تطوير الجوال" })).toBe("mobile");
    expect(inferVisualCategory({ skills: ["تسويق"] })).toBe("marketing");
  });
});
