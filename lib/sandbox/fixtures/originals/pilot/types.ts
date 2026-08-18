/**
 * Authoritative UMTUBA Originals draft content (PC2 / pre-company pilot).
 * Copied verbatim into the sandbox. Do not rewrite lesson bodies.
 * Draft first. Do not publish to Production automatically.
 */

export const PILOT_CONTENT_OWNER = "UMTUBA" as const;
export const PILOT_CONTENT_RIGHTS = "OWNED" as const;
export const PILOT_PROVIDER_TYPE = "UMTUBA_ORIGINAL" as const;
export const PILOT_PUBLISH_STATE = "DRAFT" as const;
export const PILOT_PASS_THRESHOLD_PERCENT = 70;
export const PILOT_PROGRESS_RULES = [
  "Every lesson in every module must be completed.",
  "Every module quiz must be passed at the course pass threshold.",
  "The final assessment must be passed at the course pass threshold.",
  "Certificate issuance requires an explicit publish, completion, and the UMTUBA-only certificate policy.",
  "Draft courses stay out of the public catalog until an explicit publish.",
] as const;

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
  kind: "video" | "text" | "resource" | "quiz";
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
  fullDescription: string;
  targetAudience: string;
  level: "beginner" | "intermediate" | "advanced";
  language: string;
  category: string;
  prerequisites: string[];
  learningObjectives: string[];
  estimatedDurationMinutes: number;
  passThresholdPercent: typeof PILOT_PASS_THRESHOLD_PERCENT;
  progressRules: readonly string[];
  authors: { userId: string; displayName: string; role: "author" | "instructor" }[];
  modules: PilotModule[];
  exercises: PilotExercise[];
  finalAssessment: PilotQuizQuestion[];
  certificatePolicy: PilotCertificatePolicy;
  contentOwner: typeof PILOT_CONTENT_OWNER;
  contentRights: typeof PILOT_CONTENT_RIGHTS;
  providerType: typeof PILOT_PROVIDER_TYPE;
  publishState: typeof PILOT_PUBLISH_STATE;
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
