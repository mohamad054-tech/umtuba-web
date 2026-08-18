/**
 * Course import contract — mapping, rights/provenance, mock partner courses only.
 */

import { LEARNING_COURSE_DIFFICULTIES, type LearningCourseDifficulty } from "../coursesFoundation";
import { normalizeCurrencyCode, validateAmountMinor } from "../../store/money";
import {
  containsForbiddenLearningToken,
  evaluateContentHosting,
  labelForProviderType,
} from "./rights";
import type {
  LearningImportIssue,
  LearningImportRun,
  LearningNormalizedCourse,
  LearningNormalizedInstructor,
  LearningProvider,
  LearningRawCourseRecord,
} from "./types";

const FABRICATED_INSTRUCTOR_RE =
  /\b(coursera|udemy|edx|khan academy|linkedin learning|skillshare)\b/i;

function asDifficulty(value: unknown): LearningCourseDifficulty | null {
  if (
    typeof value === "string" &&
    (LEARNING_COURSE_DIFFICULTIES as readonly string[]).includes(value)
  ) {
    return value as LearningCourseDifficulty;
  }
  return null;
}

function mapInstructors(
  raw: LearningRawCourseRecord["instructors"]
): { ok: true; instructors: LearningNormalizedInstructor[] } | { ok: false; message: string } {
  const instructors: LearningNormalizedInstructor[] = [];
  for (const instructor of raw ?? []) {
    const name = (instructor.displayName ?? "").trim();
    if (!name) continue;
    if (FABRICATED_INSTRUCTOR_RE.test(name) || containsForbiddenLearningToken(name)) {
      return { ok: false, message: "External or fabricated instructor attribution is denied." };
    }
    if (!/mock|umtuba/i.test(name)) {
      return {
        ok: false,
        message: "Instructor metadata must be UMTUBA or Mock labeled in this foundation.",
      };
    }
    instructors.push({
      externalId: instructor.externalId,
      displayName: name,
      title: (instructor.title ?? "").trim() || null,
    });
  }
  return { ok: true, instructors };
}

function assertIsolation(
  course: LearningNormalizedCourse,
  provider: LearningProvider
): { ok: true } | { ok: false; message: string } {
  if (!course.providerId || !course.externalId || !course.rightsRecordId) {
    return { ok: false, message: "Imported courses cannot be orphaned from a provider." };
  }
  if (course.providerId !== provider.id) {
    return { ok: false, message: "Course provider_id mismatch." };
  }
  if (course.provenance.rightsRecordId !== provider.rights.id) {
    return { ok: false, message: "Course rights_record_id mismatch." };
  }
  return { ok: true };
}

export function importLearningCourses(input: {
  runId: string;
  provider: LearningProvider;
  records: readonly LearningRawCourseRecord[];
  at: string;
  syncVersion?: number;
}): LearningImportRun {
  const accepted: LearningNormalizedCourse[] = [];
  const rejected: LearningImportIssue[] = [];
  const seen = new Set<string>();
  const syncVersion = input.syncVersion ?? 1;

  for (const record of input.records) {
    const externalId = (record.externalId ?? "").trim();
    if (!externalId) {
      rejected.push({
        externalId: "unknown",
        code: "MISSING_EXTERNAL_ID",
        message: "external_id is required.",
      });
      continue;
    }
    if (seen.has(externalId)) {
      rejected.push({
        externalId,
        code: "DUPLICATE_EXTERNAL_ID",
        message: "Duplicate external_id in this import.",
      });
      continue;
    }
    seen.add(externalId);

    const title = (record.title ?? "").trim();
    if (title.length < 2 || title.length > 200) {
      rejected.push({ externalId, code: "INVALID_TITLE", message: "title must be 2–200 characters." });
      continue;
    }
    if (containsForbiddenLearningToken(title) || containsForbiddenLearningToken(record.description)) {
      rejected.push({
        externalId,
        code: "FORBIDDEN_THIRD_PARTY_CONTENT",
        message: "Unauthorized third-party course or brand token is denied.",
      });
      continue;
    }

    const currency = normalizeCurrencyCode(record.currency ?? "USD");
    const priceCheck = validateAmountMinor(record.priceMinor ?? 0, currency);
    if (!priceCheck.ok) {
      rejected.push({ externalId, code: "INVALID_PRICE", message: priceCheck.message });
      continue;
    }

    const instructors = mapInstructors(record.instructors);
    if (!instructors.ok) {
      rejected.push({ externalId, code: "INVALID_INSTRUCTOR", message: instructors.message });
      continue;
    }

    const enrollmentModel = record.enrollmentModel ?? "free";
    const externalUrl = (record.externalEnrollmentUrl ?? "").trim() || null;
    if (enrollmentModel === "external" && !externalUrl) {
      rejected.push({
        externalId,
        code: "MISSING_EXTERNAL_ENROLL_URL",
        message: "external enrollment model requires externalEnrollmentUrl.",
      });
      continue;
    }

    const course: LearningNormalizedCourse = {
      providerId: input.provider.id,
      externalId,
      sourceType: input.provider.sourceType,
      rightsRecordId: input.provider.rights.id,
      provenance: {
        providerId: input.provider.id,
        externalId,
        sourceType: input.provider.sourceType,
        rightsRecordId: input.provider.rights.id,
        dataClass: input.provider.dataClass,
        syncVersion,
        importedAt: input.at,
        lastSyncedAt: input.at,
      },
      dataClass: input.provider.dataClass,
      syncVersion,
      title,
      description: (record.description ?? "").trim() || null,
      language: (record.language ?? "en").trim().toLowerCase() || "en",
      category: (record.category ?? "").trim() || null,
      difficulty: asDifficulty(record.difficulty),
      priceMinor: priceCheck.amountMinor,
      currency,
      enrollmentModel,
      externalEnrollmentUrl: externalUrl,
      instructors: instructors.instructors,
      lessonCount: Math.max(0, Math.trunc(record.lessonCount ?? 0)),
      label: labelForProviderType(input.provider.providerType),
      progressOwnership: input.provider.progressOwnership,
      certificateOwnership: input.provider.certificateOwnership,
      lastSyncedAt: input.at,
      boundCourseId: null,
      hostedOnUmtuba: false,
    };

    const isolation = assertIsolation(course, input.provider);
    if (!isolation.ok) {
      rejected.push({ externalId, code: "PROVENANCE_ISOLATION", message: isolation.message });
      continue;
    }

    const hosting = evaluateContentHosting({ provider: input.provider, course });
    course.hostedOnUmtuba = hosting.allowed;

    accepted.push(course);
  }

  return {
    id: input.runId,
    providerId: input.provider.id,
    startedAt: input.at,
    finishedAt: input.at,
    accepted,
    rejected,
  };
}

export function takedownLearningProviderCourses(
  courses: readonly LearningNormalizedCourse[]
): LearningNormalizedCourse[] {
  return courses.map((course) => ({
    ...course,
    hostedOnUmtuba: false,
    boundCourseId: null,
  }));
}
