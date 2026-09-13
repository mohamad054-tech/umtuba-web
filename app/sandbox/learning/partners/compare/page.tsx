import Link from "next/link";
import PartnerCourseCard from "../../../../components/learning/partners/PartnerCourseCard";
import { listLearningPartnerCourses } from "../../../../../lib/learning/partners/catalog";
import { compareLearningTopic } from "../../../../../lib/learning/partners/comparison";
import { tCopy } from "../../../../../lib/learning/partners/copy";
import { learningPartnerHref } from "../../../../../lib/learning/partners/sandboxLinks";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

export default async function LearningPartnersComparePage({
  searchParams,
}: PageProps) {
  const raw = await Promise.resolve(searchParams ?? {});
  const dir = Array.isArray(raw.dir) ? raw.dir[0] : raw.dir;
  const topicRaw = Array.isArray(raw.topic) ? raw.topic[0] : raw.topic;
  const rtl = dir === "rtl";
  const locale = rtl ? "ar" : "en";
  const topic = topicRaw?.trim() || "python";
  const comparison = compareLearningTopic(listLearningPartnerCourses(), topic);

  return (
    <main
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[#050510] px-3 py-6 text-white sm:px-6"
    >
      <div className="mx-auto max-w-6xl pb-16">
        <Link
          href={learningPartnerHref({ rtl })}
          className="watch-focus-ring text-sm font-bold text-white/60 hover:text-white"
        >
          ← {tCopy("title", locale)}
        </Link>
        <h1 className="mt-4 text-3xl font-black tracking-tight">
          {tCopy("compare", locale)}: {topic}
        </h1>
        <p className="mt-2 text-sm text-white/55">
          {comparison.providers.join(" · ") || tCopy("noResults", locale)}
        </p>
        {comparison.courses.length === 0 ? (
          <p className="mt-8 text-sm text-white/55">{tCopy("noResults", locale)}</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {comparison.courses.map((course) => (
              <PartnerCourseCard
                key={course.id}
                course={course}
                locale={locale}
                rtl={rtl}
                detailsHref={learningPartnerHref({ slug: course.slug, rtl })}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
