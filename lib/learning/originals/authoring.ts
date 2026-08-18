/**
 * Original course creation — draft/publish, versioning, AI permission, certification.
 * Authors must be UMTUBA-attributed. No external instructor fabrication.
 */

import { MOCK_LEARNING_PROVIDER_IDS } from "../providers/mockFixtures";
import type {
  OriginalAuthor,
  OriginalLesson,
  UmtubaOriginalCourse,
} from "./types";

const FABRICATED_RE =
  /\b(coursera|udemy|edx|khan academy|linkedin learning|skillshare|harvard|mit|stanford)\b/i;

export function assertUmtubaAuthor(
  author: OriginalAuthor
): { ok: true } | { ok: false; message: string } {
  const name = author.displayName.trim();
  if (name.length < 2) return { ok: false, message: "Author display name is required." };
  if (FABRICATED_RE.test(name)) {
    return { ok: false, message: "External instructor or institution attribution is not allowed." };
  }
  if (!/umtuba/i.test(name)) {
    return { ok: false, message: "Originals authors must be UMTUBA-attributed." };
  }
  return { ok: true };
}

export function createOriginalDraft(input: {
  id: string;
  slug: string;
  title: string;
  description: string;
  language?: string;
  category?: string | null;
  difficulty?: UmtubaOriginalCourse["difficulty"];
  authors: OriginalAuthor[];
  at: string;
}): { ok: true; course: UmtubaOriginalCourse } | { ok: false; message: string } {
  const title = input.title.trim();
  const slug = input.slug.trim().toLowerCase();
  if (title.length < 3 || title.length > 200) {
    return { ok: false, message: "title must be 3–200 characters." };
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, message: "slug must be lowercase kebab-case." };
  }
  if (input.authors.length === 0) {
    return { ok: false, message: "At least one UMTUBA author is required." };
  }
  for (const author of input.authors) {
    const check = assertUmtubaAuthor(author);
    if (!check.ok) return check;
  }
  return {
    ok: true,
    course: {
      id: input.id,
      slug,
      title,
      description: input.description.trim(),
      status: "draft",
      language: (input.language ?? "en").trim() || "en",
      category: input.category ?? null,
      difficulty: input.difficulty ?? "beginner",
      authors: input.authors,
      lessons: [],
      rights: {
        owner: "UMTUBA",
        aiUsageAllowed: true,
        certificateOwnedByUmtuba: true,
        hostingAllowed: true,
      },
      versions: [{ version: 1, createdAt: input.at, note: "draft created" }],
      publishedAt: null,
      providerId: MOCK_LEARNING_PROVIDER_IDS.original,
      sourceType: "UMTUBA_ORIGINAL",
      dataClass: "MOCK_DATA",
    },
  };
}

export function addOriginalLesson(
  course: UmtubaOriginalCourse,
  lesson: OriginalLesson,
  at: string
): { ok: true; course: UmtubaOriginalCourse } | { ok: false; message: string } {
  if (course.status === "archived") {
    return { ok: false, message: "Archived originals cannot add lessons." };
  }
  const title = lesson.title.trim();
  if (title.length < 2) return { ok: false, message: "Lesson title is required." };
  const next: UmtubaOriginalCourse = {
    ...course,
    lessons: [...course.lessons, { ...lesson, title, position: course.lessons.length }],
    versions: [
      ...course.versions,
      { version: course.versions.length + 1, createdAt: at, note: `lesson added:${lesson.kind}` },
    ],
  };
  return { ok: true, course: next };
}

export function publishOriginal(
  course: UmtubaOriginalCourse,
  at: string
): { ok: true; course: UmtubaOriginalCourse } | { ok: false; message: string } {
  if (course.lessons.length === 0) {
    return { ok: false, message: "Cannot publish an original with no lessons." };
  }
  if (course.status === "archived") {
    return { ok: false, message: "Archived originals cannot be published." };
  }
  return {
    ok: true,
    course: {
      ...course,
      status: "published",
      publishedAt: at,
      versions: [
        ...course.versions,
        { version: course.versions.length + 1, createdAt: at, note: "published" },
      ],
    },
  };
}

export function evaluateOriginalAiTutor(course: UmtubaOriginalCourse): {
  allowed: boolean;
  reason: string;
} {
  if (course.sourceType !== "UMTUBA_ORIGINAL" || course.rights.owner !== "UMTUBA") {
    return { allowed: false, reason: "AI Tutor is only permitted for UMTUBA-owned originals." };
  }
  if (!course.rights.aiUsageAllowed) {
    return { allowed: false, reason: "AI_USAGE_ALLOWED is false on this original." };
  }
  if (course.status !== "published") {
    return { allowed: false, reason: "AI Tutor ingest requires a published original." };
  }
  return { allowed: true, reason: "UMTUBA-owned published original may use AI Tutor." };
}

export function evaluateOriginalCertificate(course: UmtubaOriginalCourse): {
  allowed: boolean;
  reason: string;
} {
  if (!course.rights.certificateOwnedByUmtuba || course.rights.owner !== "UMTUBA") {
    return { allowed: false, reason: "UMTUBA can issue certificates only for originals it owns." };
  }
  if (course.status !== "published") {
    return { allowed: false, reason: "Certificate flow requires a published original." };
  }
  return { allowed: true, reason: "UMTUBA certificate flow is available for this original." };
}

export function originalProgressOwnedByUmtuba(course: UmtubaOriginalCourse): boolean {
  return course.rights.owner === "UMTUBA";
}
