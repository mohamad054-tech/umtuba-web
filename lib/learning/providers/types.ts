/**
 * Learning provider foundation V2 — provider-neutral course import + rights.
 * Extends the existing Learning catalog; does not replace it.
 */

import type { DataClass, SourceType } from "../../partners/types";
import type { LearningCourseDifficulty } from "../coursesFoundation";

export const LEARNING_PROVIDER_TYPES = [
  "UMTUBA_ORIGINAL",
  "PARTNER",
  "EXTERNAL",
] as const;
export type LearningProviderType = (typeof LEARNING_PROVIDER_TYPES)[number];

export const LEARNING_PROVIDER_RIGHTS = [
  "METADATA_DISPLAY_ALLOWED",
  "CONTENT_HOSTING_ALLOWED",
  "VIDEO_HOSTING_ALLOWED",
  "ENROLLMENT_ALLOWED",
  "PAYMENT_ALLOWED",
  "AI_USAGE_ALLOWED",
  "CERTIFICATE_INTEGRATION_ALLOWED",
] as const;
export type LearningProviderRight = (typeof LEARNING_PROVIDER_RIGHTS)[number];

export const LEARNING_PROVIDER_STATUSES = [
  "DRAFT",
  "ENABLED",
  "DISABLED",
  "REMOVED",
] as const;
export type LearningProviderStatus = (typeof LEARNING_PROVIDER_STATUSES)[number];

export const LEARNING_ENROLLMENT_ROUTES = [
  "UMTUBA_ENROLL",
  "EXTERNAL_ENROLL_URL",
  "DENIED",
] as const;
export type LearningEnrollmentRoute = (typeof LEARNING_ENROLLMENT_ROUTES)[number];

export const PROGRESS_OWNERSHIP = [
  "UMTUBA",
  "PROVIDER",
  "SPLIT",
  "UNKNOWN",
] as const;
export type ProgressOwnership = (typeof PROGRESS_OWNERSHIP)[number];

export const CERTIFICATE_OWNERSHIP = [
  "UMTUBA",
  "PROVIDER",
  "NONE",
  "UNKNOWN",
] as const;
export type CertificateOwnership = (typeof CERTIFICATE_OWNERSHIP)[number];

export const LEARNING_CONTENT_LABELS = [
  "Original",
  "Partner",
  "External",
] as const;
export type LearningContentLabel = (typeof LEARNING_CONTENT_LABELS)[number];

export type LearningRightsRecord = {
  id: string;
  providerId: string;
  grants: Partial<Record<LearningProviderRight, boolean>>;
  updatedAt: string;
};

export type LearningProvider = {
  id: string;
  slug: string;
  displayName: string;
  providerType: LearningProviderType;
  status: LearningProviderStatus;
  dataClass: DataClass;
  sourceType: SourceType;
  rights: LearningRightsRecord;
  progressOwnership: ProgressOwnership;
  certificateOwnership: CertificateOwnership;
  createdAt: string;
  updatedAt: string;
  disabledAt: string | null;
  removedAt: string | null;
};

export type LearningCourseProvenance = {
  providerId: string;
  externalId: string;
  sourceType: SourceType;
  rightsRecordId: string;
  dataClass: DataClass;
  syncVersion: number;
  importedAt: string;
  lastSyncedAt: string;
};

export type LearningRawInstructor = {
  externalId: string;
  displayName: string;
  title?: string;
};

export type LearningRawCourseRecord = {
  externalId: string;
  title?: string;
  description?: string;
  language?: string;
  category?: string;
  difficulty?: LearningCourseDifficulty | string;
  priceMinor?: number;
  currency?: string;
  enrollmentModel?: "free" | "paid" | "external";
  externalEnrollmentUrl?: string;
  instructors?: LearningRawInstructor[];
  lessonCount?: number;
};

export type LearningNormalizedInstructor = {
  externalId: string;
  displayName: string;
  title: string | null;
};

export type LearningNormalizedCourse = {
  providerId: string;
  externalId: string;
  sourceType: SourceType;
  rightsRecordId: string;
  provenance: LearningCourseProvenance;
  dataClass: DataClass;
  syncVersion: number;
  title: string;
  description: string | null;
  language: string;
  category: string | null;
  difficulty: LearningCourseDifficulty | null;
  priceMinor: number;
  currency: string;
  enrollmentModel: "free" | "paid" | "external";
  externalEnrollmentUrl: string | null;
  instructors: LearningNormalizedInstructor[];
  lessonCount: number;
  label: LearningContentLabel;
  progressOwnership: ProgressOwnership;
  certificateOwnership: CertificateOwnership;
  lastSyncedAt: string;
  /** Optional bind into existing learning_courses. */
  boundCourseId: string | null;
  hostedOnUmtuba: boolean;
};

export type LearningImportIssue = {
  externalId: string;
  code: string;
  message: string;
};

export type LearningImportRun = {
  id: string;
  providerId: string;
  startedAt: string;
  finishedAt: string;
  accepted: LearningNormalizedCourse[];
  rejected: LearningImportIssue[];
};

export const ALL_UNKNOWN_LEARNING_RIGHTS_DEFAULT = false;
export const DEFAULT_AI_USAGE_ALLOWED = false;
