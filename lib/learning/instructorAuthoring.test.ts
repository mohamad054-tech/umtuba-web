import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARNING_SPACE_RPCS } from "./spacesFoundation";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  validateLearningSpaceName,
  validateLearningSpaceSlug,
} from "./instructorAuthoring";

const ROOT = process.cwd();
const DOC =
  "docs/learning/implementation/INSTRUCTOR_AUTHORING_FOUNDATION_V1.md";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Instructor Authoring Foundation V1 — files & routes", () => {
  it("ships module, tests, docs, and instructor routes", () => {
    expect(existsSync(join(ROOT, "lib/learning/instructorAuthoring.ts"))).toBe(
      true
    );
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(
      existsSync(join(ROOT, "app/learning/instructor/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "app/learning/instructor/spaces/new/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/learning/instructor/spaces/[spaceId]/page.tsx")
      )
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "app/learning/instructor/actions.ts"))
    ).toBe(true);
  });

  it("documents instructor routes under /learning/instructor", () => {
    expect(LEARNING_INSTRUCTOR_ROUTES.hub).toBe("/learning/instructor");
    expect(LEARNING_INSTRUCTOR_ROUTES.spaceNew).toBe(
      "/learning/instructor/spaces/new"
    );
    expect(LEARNING_INSTRUCTOR_ROUTES.space("s1")).toBe(
      "/learning/instructor/spaces/s1"
    );
  });

  it("does not create a migration for this UI slice", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/No migrations/i);
  });
});

describe("Instructor Authoring Foundation V1 — RPC contracts", () => {
  it("uses existing space RPC names only", () => {
    const src = read("lib/learning/instructorAuthoring.ts");
    expect(src).toContain("LEARNING_SPACE_RPCS");
    expect(src).toContain("LEARNING_SPACE_RPCS.create");
    expect(src).toContain("LEARNING_SPACE_RPCS.publish");
    expect(src).toContain("LEARNING_SPACE_RPCS.archive");
    expect(LEARNING_SPACE_RPCS.create).toBe("create_learning_space");
    expect(LEARNING_SPACE_RPCS.publish).toBe("publish_learning_space");
    expect(LEARNING_SPACE_RPCS.archive).toBe("archive_learning_space");
  });

  it("forbids service role and does not redesign RPCs", () => {
    const src = read("lib/learning/instructorAuthoring.ts");
    expect(src).toMatch(/No service role/i);
    expect(src).not.toMatch(/createServiceRole|service_role|SERVICE_ROLE/);
    expect(src).not.toMatch(/create or replace function/i);
  });

  it("does not modify learner routes", () => {
    const src = read("lib/learning/instructorAuthoring.ts");
    expect(src).not.toContain("LEARNING_LEARNER_ROUTES");
    const learnerPage = read("app/learning/page.tsx");
    expect(learnerPage).toContain("LEARNING_LEARNER_ROUTES");
    expect(learnerPage).not.toContain("instructorAuthoring");
  });
});

describe("Instructor Authoring Foundation V1 — validation", () => {
  it("validates space slug like SQL", () => {
    expect(validateLearningSpaceSlug("ab")).toBeTruthy();
    expect(validateLearningSpaceSlug("My Space")).toBeTruthy();
    expect(validateLearningSpaceSlug("ok-space")).toBeNull();
    expect(validateLearningSpaceSlug("academy-01")).toBeNull();
  });

  it("validates space name length", () => {
    expect(validateLearningSpaceName("")).toBeTruthy();
    expect(validateLearningSpaceName("   ")).toBeTruthy();
    expect(validateLearningSpaceName("UMTUBA Academy")).toBeNull();
  });
});
