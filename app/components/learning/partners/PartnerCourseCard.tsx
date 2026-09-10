import Link from "next/link";
import {
  resolveOutboundCourseUrl,
} from "../../../../lib/learning/partners/affiliateFoundation";
import { certificateTypeLabel } from "../../../../lib/learning/partners/certificateModel";
import { tCopy } from "../../../../lib/learning/partners/copy";
import { localizedCourseTitle, localizedText } from "../../../../lib/learning/partners/localization";
import {
  getLearningAffiliateRecord,
  providerDisplayName,
  providerHomeUrl,
} from "../../../../lib/learning/partners/providerFacts";
import {
  localizedDepartmentName,
  localizedSubcategoryName,
} from "../../../../lib/learning/partners/taxonomy";
import type { LearningPartnerCourse } from "../../../../lib/learning/partners/types";
import SaveCourseButton from "./SaveCourseButton";

type PartnerCourseCardProps = {
  course: LearningPartnerCourse;
  locale: "en" | "ar";
  rtl: boolean;
  detailsHref: string;
};

const BADGE: Record<LearningPartnerCourse["provider"], string> = {
  coursera: "border-sky-400/40 bg-sky-500/15 text-sky-100",
  edx: "border-indigo-400/40 bg-indigo-500/15 text-indigo-100",
  skillshare: "border-teal-400/40 bg-teal-500/15 text-teal-100",
  udemy: "border-violet-400/40 bg-violet-500/15 text-violet-100",
};

export default function PartnerCourseCard({
  course,
  locale,
  rtl,
  detailsHref,
}: PartnerCourseCardProps) {
  const affiliate = getLearningAffiliateRecord(course.provider);
  const outbound = resolveOutboundCourseUrl(course, affiliate);
  const title = localizedCourseTitle(course, locale);
  const price = localizedText(course.pricing.notes, locale);

  return (
    <article className="flex h-full flex-col rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${BADGE[course.provider]}`}
        >
          {providerDisplayName(course.provider)}
        </span>
        {course.certificate.certificate_available ? (
          <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
            {certificateTypeLabel(course.certificate.certificate_type, locale)}
          </span>
        ) : null}
      </div>
      <h2 className="mt-3 text-lg font-black tracking-tight">{title}</h2>
      <p className="mt-1 text-xs text-white/45">{course.original_title}</p>
      <p className="mt-2 text-sm text-white/70">
        {course.institution ?? course.instructor ?? providerDisplayName(course.provider)}
      </p>
      <p className="mt-2 text-xs text-white/45">
        {localizedDepartmentName(course.department, locale)} ·{" "}
        {localizedSubcategoryName(course.department, course.subcategory, locale)}
      </p>
      <ul className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/60">
        <li>{course.level}</li>
        <li>{course.language.toUpperCase()}</li>
        <li>{course.pricing.model}</li>
        {course.recommendation_labels.map((label) => (
          <li key={label} className="rounded-full bg-white/5 px-2 py-0.5">
            {label === "BEGINNER"
              ? tCopy("beginner", locale)
              : label === "CAREER_FOCUSED"
                ? tCopy("career", locale)
                : label === "BEST_VALUE"
                  ? tCopy("bestValue", locale)
                  : tCopy("mostPopular", locale)}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-white/55">{price}</p>
      {course.rating.value == null ? (
        <p className="mt-1 text-xs text-white/40">{tCopy("unknownRating", locale)}</p>
      ) : (
        <p className="mt-1 text-xs text-white/40">
          {course.rating.value}/{course.rating.scale}
        </p>
      )}
      <p className="mt-3 text-xs text-white/40">
        {localizedText(course.source_attribution, locale)}
      </p>
      <div className={`mt-auto flex flex-wrap gap-2 pt-4 ${rtl ? "flex-row-reverse" : ""}`}>
        <Link
          href={detailsHref}
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-xs font-black text-black"
        >
          {tCopy("detailsCta", locale)}
        </Link>
        <a
          href={outbound}
          target="_blank"
          rel="noopener noreferrer"
          className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/85 hover:border-white/40"
        >
          {tCopy("startCta", locale)}
        </a>
        <a
          href={providerHomeUrl(course.provider)}
          target="_blank"
          rel="noopener noreferrer"
          className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/85 hover:border-white/40"
        >
          {tCopy("platformCta", locale)}
        </a>
        <SaveCourseButton courseId={course.id} locale={locale} />
      </div>
    </article>
  );
}
