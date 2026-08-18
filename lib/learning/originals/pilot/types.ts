/**
 * UMTUBA Originals pilot — first-party draft courses with real lesson depth.
 * Draft first. Do not publish to Production automatically.
 */

import type { LearningCourseDifficulty } from "../../coursesFoundation";
import type { OriginalLessonKind } from "../types";

export const PILOT_CONTENT_OWNER = "UMTUBA" as const;
export const PILOT_CONTENT_RIGHTS = "OWNED" as const;

export type PilotQuizChoice = {
  id: string;
  text: string;
};

export type PilotQuizQuestion = {
  id: string;
  prompt: string;
  choices: PilotQuizChoice[];
  correctChoiceId: string;
  explanation: string;
};

export type PilotExercise = {
  id: string;
  title: string;
  prompt: string;
  successCriteria: string[];
};

export type PilotResource = {
  title: string;
  kind: "worksheet" | "checklist" | "reference";
  body: string;
};

export type PilotLesson = {
  id: string;
  kind: OriginalLessonKind;
  title: string;
  body: string;
  estimatedMinutes: number;
  resource: PilotResource | null;
  quiz: PilotQuizQuestion[];
};

export type PilotModule = {
  id: string;
  title: string;
  summary: string;
  lessons: PilotLesson[];
};

export type PilotCertificatePolicy = {
  issuer: "UMTUBA";
  represents: "UMTUBA_ONLY";
  requiresFinalAssessmentPass: true;
  passingScorePercent: number;
  notAnAccreditedCredential: true;
  statement: string;
};

export type UmtubaOriginalPilotCourse = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  targetAudience: string;
  level: LearningCourseDifficulty;
  language: string;
  category: string;
  learningObjectives: string[];
  estimatedDurationMinutes: number;
  authors: { userId: string; displayName: string; role: "author" | "instructor" }[];
  modules: PilotModule[];
  exercises: PilotExercise[];
  finalAssessment: PilotQuizQuestion[];
  certificatePolicy: PilotCertificatePolicy;
  contentOwner: typeof PILOT_CONTENT_OWNER;
  contentRights: typeof PILOT_CONTENT_RIGHTS;
  aiTutorAllowed: true;
  status: "draft";
};

export const UMTUBA_PILOT_AUTHOR = {
  userId: "umtuba-originals-staff",
  displayName: "UMTUBA Learning Staff",
  role: "author" as const,
};

export const UMTUBA_CERTIFICATE_STATEMENT =
  "This certificate confirms completion of an UMTUBA Originals course. It is issued by UMTUBA and represents UMTUBA only. It is not a university degree, government license, or accredited professional credential.";
