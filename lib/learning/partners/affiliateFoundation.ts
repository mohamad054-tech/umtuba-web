import type {
  LearningAffiliateProgramStatus,
  LearningAffiliateRecord,
  LearningPartnerCourse,
  LearningPartnerProviderId,
} from "./types";
import { LEARNING_PARTNER_PROVIDER_IDS } from "./types";

const TRACKING_URL_HINTS =
  /impact\.com|irclickid|clickid=|aff_id=|affiliateid=|utm_affiliate|partnerref=/i;

export class LearningAffiliateSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningAffiliateSafetyError";
  }
}

export function isApprovedAffiliate(
  record: LearningAffiliateRecord
): boolean {
  return (
    record.affiliate_program_status === "APPROVED" &&
    typeof record.affiliate_tracking_url === "string" &&
    record.affiliate_tracking_url.trim().length > 0
  );
}

export function resolveOutboundCourseUrl(
  course: Pick<
    LearningPartnerCourse,
    "original_course_url" | "affiliate_tracking_url"
  >,
  affiliate: LearningAffiliateRecord
): string {
  if (affiliate.affiliate_program_status !== "APPROVED") {
    return course.original_course_url;
  }
  if (course.affiliate_tracking_url?.trim()) {
    return course.affiliate_tracking_url.trim();
  }
  if (affiliate.affiliate_tracking_url?.trim()) {
    return affiliate.affiliate_tracking_url.trim();
  }
  return course.original_course_url;
}

export function assertAffiliateRecordSafe(record: LearningAffiliateRecord): void {
  if (
    !LEARNING_PARTNER_PROVIDER_IDS.includes(
      record.provider as LearningPartnerProviderId
    )
  ) {
    throw new LearningAffiliateSafetyError(
      `Unknown affiliate provider: ${record.provider}`
    );
  }
  if (!record.last_verified_at?.trim()) {
    throw new LearningAffiliateSafetyError(
      `${record.provider}: last_verified_at is required`
    );
  }

  const pendingLike: LearningAffiliateProgramStatus[] = [
    "PENDING",
    "SUSPENDED",
    "NOT_APPLICABLE",
  ];
  if (pendingLike.includes(record.affiliate_program_status)) {
    if (record.affiliate_tracking_url) {
      throw new LearningAffiliateSafetyError(
        `${record.provider}: tracking URL is forbidden while status is ${record.affiliate_program_status}`
      );
    }
  }

  if (
    record.affiliate_program_status !== "APPROVED" &&
    record.affiliate_tracking_url
  ) {
    throw new LearningAffiliateSafetyError(
      `${record.provider}: fabricated tracking URL is not allowed`
    );
  }
}

export function assertNoFakeAffiliateLinks(input: {
  affiliates: readonly LearningAffiliateRecord[];
  courses: readonly Pick<
    LearningPartnerCourse,
    "id" | "original_course_url" | "affiliate_tracking_url"
  >[];
}): void {
  for (const record of input.affiliates) {
    assertAffiliateRecordSafe(record);
  }

  const byProvider = new Map(
    input.affiliates.map((record) => [record.provider, record])
  );

  for (const course of input.courses) {
    if (!course.affiliate_tracking_url) continue;
    const provider = inferProviderFromCourseId(course.id);
    const affiliate = provider ? byProvider.get(provider) : undefined;
    if (!affiliate || affiliate.affiliate_program_status !== "APPROVED") {
      throw new LearningAffiliateSafetyError(
        `${course.id}: affiliate_tracking_url set before approval`
      );
    }
  }

  for (const course of input.courses) {
    const haystack = `${course.original_course_url}\n${course.affiliate_tracking_url ?? ""}`;
    const provider = inferProviderFromCourseId(course.id);
    const affiliate = provider ? byProvider.get(provider) : undefined;
    if (
      TRACKING_URL_HINTS.test(haystack) &&
      affiliate?.affiliate_program_status !== "APPROVED"
    ) {
      throw new LearningAffiliateSafetyError(
        `${course.id}: tracking-style URL is not allowed while affiliate status is pending`
      );
    }
  }
}

function inferProviderFromCourseId(
  courseId: string
): LearningPartnerProviderId | null {
  const prefix = courseId.split("-")[0];
  if (
    LEARNING_PARTNER_PROVIDER_IDS.includes(prefix as LearningPartnerProviderId)
  ) {
    return prefix as LearningPartnerProviderId;
  }
  return null;
}
