import Link from "next/link";
import { notFound } from "next/navigation";
import CertificateDetailsPanel from "../../../../components/learning/partners/CertificateDetailsPanel";
import SaveCourseButton from "../../../../components/learning/partners/SaveCourseButton";
import { resolveOutboundCourseUrl } from "../../../../../lib/learning/partners/affiliateFoundation";
import { getLearningPartnerCourse } from "../../../../../lib/learning/partners/catalog";
import { tCopy } from "../../../../../lib/learning/partners/copy";
import {
  localizedCourseTitle,
  localizedText,
} from "../../../../../lib/learning/partners/localization";
import {
  getLearningAffiliateRecord,
  providerDisplayName,
  providerHomeUrl,
} from "../../../../../lib/learning/partners/providerFacts";
import { learningPartnerHref } from "../../../../../lib/learning/partners/sandboxLinks";
import {
  localizedDepartmentName,
  localizedSubcategoryName,
} from "../../../../../lib/learning/partners/taxonomy";

export const dynamic = "force-dynamic";

type PageProps = {
  params?: Promise<{ slug: string }> | { slug: string };
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function LearningPartnerCoursePage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await Promise.resolve(params ?? { slug: "" });
  const raw = await Promise.resolve(searchParams ?? {});
  const dir = Array.isArray(raw.dir) ? raw.dir[0] : raw.dir;
  const rtl = dir === "rtl";
  const locale = rtl ? "ar" : "en";
  const course = getLearningPartnerCourse(resolvedParams.slug);
  if (!course) notFound();

  const affiliate = getLearningAffiliateRecord(course.provider);
  const outbound = resolveOutboundCourseUrl(course, affiliate);

  return (
    <main
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[#050510] px-3 py-6 text-white sm:px-6"
    >
      <div className="mx-auto max-w-3xl pb-16">
        <Link
          href={learningPartnerHref({ rtl })}
          className="watch-focus-ring text-sm font-bold text-white/60 hover:text-white"
        >
          ← {tCopy("title", locale)}
        </Link>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-sky-200/80">
          {providerDisplayName(course.provider)}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {localizedCourseTitle(course, locale)}
        </h1>
        <p className="mt-2 text-sm text-white/50">{course.original_title}</p>
        <p className="mt-3 text-sm text-white/70">
          {course.institution ?? course.instructor ?? providerDisplayName(course.provider)}
        </p>
        <p className="mt-2 text-xs text-white/45">
          {localizedDepartmentName(course.department, locale)} ·{" "}
          {localizedSubcategoryName(course.department, course.subcategory, locale)} ·{" "}
          {course.level}
        </p>
        <p className="mt-4 text-sm text-white/60">
          {localizedText(course.pricing.notes, locale)}
        </p>
        <p className="mt-2 text-sm text-white/50">
          {localizedText(course.duration_notes, locale)}
        </p>
        <p className="mt-4 text-sm text-amber-100/80">{tCopy("leaveNotice", locale)}</p>
        <p className="mt-2 text-xs text-white/40">
          {localizedText(course.source_attribution, locale)}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={outbound}
            target="_blank"
            rel="noopener noreferrer"
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            {tCopy("startCta", locale)}
          </a>
          <a
            href={providerHomeUrl(course.provider)}
            target="_blank"
            rel="noopener noreferrer"
            className="watch-focus-ring rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/85"
          >
            {tCopy("platformCta", locale)}
          </a>
          <SaveCourseButton courseId={course.id} locale={locale} />
        </div>

        <div className="mt-8">
          <CertificateDetailsPanel course={course} locale={locale} />
        </div>
      </div>
    </main>
  );
}
