import type {
  LearningCertificateMetadata,
  LearningCertificateType,
  LearningPartnerCourse,
  LocalizedText,
} from "./types";
import { LEARNING_CERTIFICATE_TYPES } from "./types";

export const ACCREDITATION_CUSTOMER_TERMS = [
  "accredited",
  "accreditation",
  "officially recognized",
  "official recognition",
  "معتمد",
  "معتمدة",
  "اعتماد رسمي",
  "معترف به رسميا",
  "معترف بها رسمياً",
  "معترف بها رسميا",
] as const;

export class LearningCertificateSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningCertificateSafetyError";
  }
}

export function isLearningCertificateType(
  value: unknown
): value is LearningCertificateType {
  return (
    typeof value === "string" &&
    (LEARNING_CERTIFICATE_TYPES as readonly string[]).includes(value)
  );
}

/**
 * “Accredited” / “officially recognized” may appear only when the specific
 * program has a documented source and an explicit verified flag.
 * Platform membership (Coursera/edX/Udemy/Skillshare) is never evidence.
 */
export function canShowAccreditationClaim(
  certificate: LearningCertificateMetadata
): boolean {
  return (
    certificate.accreditation_claim === true &&
    certificate.accreditation_verified === true &&
    typeof certificate.accreditation_source === "string" &&
    certificate.accreditation_source.trim().length > 0
  );
}

export function customerFacingAccreditationText(
  certificate: LearningCertificateMetadata,
  locale: "en" | "ar"
): string | null {
  if (!canShowAccreditationClaim(certificate)) return null;
  const source = certificate.accreditation_source!.trim();
  if (locale === "ar") {
    return `تم التحقق من ادعاء الاعتراف الرسمي لهذا البرنامج تحديداً. المصدر: ${source}`;
  }
  return `Official recognition was verified for this specific program. Source: ${source}`;
}

export function customerFacingAccreditationAbsence(
  locale: "en" | "ar"
): string {
  if (locale === "ar") {
    return "لم يُتحقق من اعتماد رسمي أو اعتراف رسمي لهذا البرنامج. وجود الدورة على المنصة لا يعني اعتماداً رسمياً.";
  }
  return "Official accreditation or recognition has not been verified for this specific program. Being listed on a platform is not evidence of official recognition.";
}

export function assertCertificateMetadataSafe(
  certificate: LearningCertificateMetadata,
  context = "certificate"
): void {
  if (!isLearningCertificateType(certificate.certificate_type)) {
    throw new LearningCertificateSafetyError(
      `${context}: unknown certificate_type`
    );
  }

  if (
    certificate.accreditation_claim &&
    !certificate.accreditation_source?.trim()
  ) {
    throw new LearningCertificateSafetyError(
      `${context}: accreditation_claim requires accreditation_source`
    );
  }

  if (certificate.accreditation_claim && !certificate.accreditation_verified) {
    throw new LearningCertificateSafetyError(
      `${context}: accreditation_claim requires accreditation_verified`
    );
  }

  if (
    !certificate.accreditation_claim &&
    certificate.accreditation_verified
  ) {
    throw new LearningCertificateSafetyError(
      `${context}: accreditation_verified cannot be true without accreditation_claim`
    );
  }

  if (containsUnsafeAccreditationLanguage(certificate.certificate_notes)) {
    throw new LearningCertificateSafetyError(
      `${context}: certificate notes use accreditation language without a verified claim`
    );
  }
}

export function containsUnsafeAccreditationLanguage(
  notes: LocalizedText,
  certificate?: LearningCertificateMetadata
): boolean {
  if (certificate && canShowAccreditationClaim(certificate)) return false;
  const haystack = `${notes.en}\n${notes.ar}`.toLowerCase();
  return ACCREDITATION_CUSTOMER_TERMS.some((term) =>
    haystack.includes(term.toLowerCase())
  );
}

export function assertCourseCertificateSafe(course: LearningPartnerCourse): void {
  assertCertificateMetadataSafe(certificateFor(course), course.id);
  if (course.certificate.certificate_issuer?.trim().toUpperCase() === "UMTUBA") {
    throw new LearningCertificateSafetyError(
      `${course.id}: UMTUBA must not be listed as issuer of a third-party certificate`
    );
  }
}

export function assertCatalogCertificateSafety(
  courses: readonly LearningPartnerCourse[]
): void {
  for (const course of courses) {
    assertCourseCertificateSafe(course);
  }
}

function certificateFor(
  course: LearningPartnerCourse
): LearningCertificateMetadata {
  return course.certificate;
}

export function certificateTypeLabel(
  type: LearningCertificateType,
  locale: "en" | "ar"
): string {
  const labels: Record<LearningCertificateType, LocalizedText> = {
    COMPLETION: { en: "Completion certificate", ar: "شهادة إتمام" },
    PROFESSIONAL: { en: "Professional certificate", ar: "شهادة مهنية" },
    VERIFIED: { en: "Verified certificate", ar: "شهادة موثّقة" },
    UNIVERSITY_PROVIDER: {
      en: "University / institution certificate",
      ar: "شهادة من جامعة أو مؤسسة",
    },
    ACADEMIC_CREDIT: { en: "Academic credit", ar: "ساعات أكاديمية" },
    DEGREE_OR_FORMAL_QUALIFICATION: {
      en: "Degree or formal qualification",
      ar: "درجة أو مؤهل رسمي",
    },
    NONE: { en: "No certificate", ar: "لا شهادة" },
    UNKNOWN: { en: "Certificate status unknown", ar: "حالة الشهادة غير مؤكدة" },
  };
  return locale === "ar" ? labels[type].ar : labels[type].en;
}
