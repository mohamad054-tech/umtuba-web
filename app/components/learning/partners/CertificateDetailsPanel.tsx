import {
  certificateTypeLabel,
  customerFacingAccreditationAbsence,
  customerFacingAccreditationText,
} from "../../../../lib/learning/partners/certificateModel";
import { tCopy } from "../../../../lib/learning/partners/copy";
import { localizedText } from "../../../../lib/learning/partners/localization";
import type { LearningPartnerCourse } from "../../../../lib/learning/partners/types";

type CertificateDetailsPanelProps = {
  course: LearningPartnerCourse;
  locale: "en" | "ar";
};

export default function CertificateDetailsPanel({
  course,
  locale,
}: CertificateDetailsPanelProps) {
  const cert = course.certificate;
  const accreditation =
    customerFacingAccreditationText(cert, locale) ??
    customerFacingAccreditationAbsence(locale);
  const verification =
    cert.verification_available === true
      ? tCopy("verificationYes", locale)
      : cert.verification_available === false
        ? tCopy("verificationNo", locale)
        : tCopy("verificationUnknown", locale);
  const credit =
    cert.academic_credit === true
      ? tCopy("creditYes", locale)
      : cert.academic_credit === false
        ? tCopy("creditNo", locale)
        : tCopy("creditUnknown", locale);

  return (
    <section
      className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-6"
      aria-labelledby="certificate-details-heading"
    >
      <h2
        id="certificate-details-heading"
        className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-100/70"
      >
        {tCopy("certificatePanel", locale)}
      </h2>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-white/45">{tCopy("issuer", locale)}</dt>
          <dd className="mt-1 font-semibold">
            {cert.certificate_issuer ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-white/45">{tCopy("certType", locale)}</dt>
          <dd className="mt-1 font-semibold">
            {certificateTypeLabel(cert.certificate_type, locale)}
          </dd>
        </div>
        <div>
          <dt className="text-white/45">{tCopy("verification", locale)}</dt>
          <dd className="mt-1">{verification}</dd>
        </div>
        <div>
          <dt className="text-white/45">{tCopy("credit", locale)}</dt>
          <dd className="mt-1">{credit}</dd>
        </div>
        <div>
          <dt className="text-white/45">{tCopy("accreditation", locale)}</dt>
          <dd className="mt-1 text-amber-100/90">{accreditation}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-white/60">
        {localizedText(cert.certificate_notes, locale)}
      </p>
    </section>
  );
}
