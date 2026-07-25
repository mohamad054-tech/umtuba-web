import { describe, expect, it, vi } from "vitest";
import {
  allocateUniqueInstructorSlug,
  createWithUniqueInstructorSlug,
  isInstructorSlugConflictError,
  slugifyInstructorName,
} from "./instructorSlug";

describe("slugifyInstructorName", () => {
  it("lowercases, hyphenates spaces, and strips invalid characters", () => {
    expect(slugifyInstructorName("Acme Academy")).toBe("acme-academy");
    expect(slugifyInstructorName("  Hello World!!  ")).toBe("hello-world");
    expect(slugifyInstructorName("React & Node.js")).toBe("react-node-js");
    expect(slugifyInstructorName("UPPER_case")).toBe("upper-case");
  });

  it("pads ultra-short names to meet min length", () => {
    expect(slugifyInstructorName("Hi")).toBe("hix");
    expect(slugifyInstructorName("A")).toBe("axx");
  });
});

describe("allocateUniqueInstructorSlug", () => {
  it("returns base when free", () => {
    expect(allocateUniqueInstructorSlug("Intro Section", [])).toBe(
      "intro-section"
    );
  });

  it("appends numeric suffixes for collisions", () => {
    expect(
      allocateUniqueInstructorSlug("Intro", ["intro", "intro-2"])
    ).toBe("intro-3");
  });

  it("keeps candidates within 64 characters", () => {
    const long = "a".repeat(70);
    const slug = allocateUniqueInstructorSlug(long, [slugifyInstructorName(long)]);
    expect(slug.length).toBeLessThanOrEqual(64);
    expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});

describe("createWithUniqueInstructorSlug", () => {
  it("retries on duplicate slug errors", async () => {
    const createOnce = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: "duplicate key unique" })
      .mockResolvedValueOnce({ ok: true, data: { id: "ok" } });

    const result = await createWithUniqueInstructorSlug("Lesson", createOnce, {
      taken: ["lesson"],
    });
    expect(result.ok).toBe(true);
    expect(createOnce).toHaveBeenCalledTimes(2);
    expect(createOnce.mock.calls[0][0]).toBe("lesson-2");
    expect(createOnce.mock.calls[1][0]).toBe("lesson-3");
  });

  it("does not retry non-conflict errors", async () => {
    const createOnce = vi
      .fn()
      .mockResolvedValue({ ok: false, message: "Not allowed" });
    const result = await createWithUniqueInstructorSlug("Lesson", createOnce);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/not allowed/i);
    expect(createOnce).toHaveBeenCalledTimes(1);
  });

  it("detects conflict messages", () => {
    expect(isInstructorSlugConflictError("duplicate key")).toBe(true);
    expect(isInstructorSlugConflictError("Permission denied")).toBe(false);
  });
});
