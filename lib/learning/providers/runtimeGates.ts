/**
 * Runtime rechecks: playback/hosting, enrollment, AI Tutor, certificates.
 */

import {
  evaluateAiTutorIngest,
  evaluateCertificateIssuance,
  evaluateContentHosting,
  evaluateEnrollmentRoute,
  evaluateMetadataDisplay,
} from "./rights";
import type { LearningNormalizedCourse, LearningProvider } from "./types";

export function recheckLearningPlayback(input: {
  provider: LearningProvider;
  course: LearningNormalizedCourse;
}) {
  const meta = evaluateMetadataDisplay(input.provider);
  const host = evaluateContentHosting(input);
  return {
    metadata: meta,
    hosting: host,
    playableOnUmtuba: meta.allowed && host.allowed && input.course.hostedOnUmtuba,
  };
}

export function recheckLearningEnrollment(input: {
  provider: LearningProvider;
  course: LearningNormalizedCourse;
}) {
  return evaluateEnrollmentRoute(input);
}

export function recheckAiTutorIngest(input: {
  provider: LearningProvider;
  course: LearningNormalizedCourse;
}) {
  return evaluateAiTutorIngest(input);
}

export function recheckCertificateIssuance(input: {
  provider: LearningProvider;
  course: LearningNormalizedCourse;
}) {
  return evaluateCertificateIssuance(input);
}

export function learningSurfaceLabel(course: LearningNormalizedCourse): {
  label: "Original" | "Partner" | "External";
  mockNotice: string | null;
} {
  return {
    label: course.label,
    mockNotice:
      course.dataClass === "MOCK_DATA"
        ? "UMTUBA Mock Learning — not a real partner course"
        : null,
  };
}
