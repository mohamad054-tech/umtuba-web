import Link from "next/link";
import PartnerCourseCard from "../../../components/learning/partners/PartnerCourseCard";
import {
  LEARNING_PARTNER_SANDBOX_BANNER,
  LEARNING_PARTNER_SANDBOX_SUBTITLE,
  tCopy,
} from "../../../../lib/learning/partners/copy";
import {
  listLearningPartnerCourses,
  listLearningPaths,
  loadLearningPartnerPilot,
} from "../../../../lib/learning/partners/catalog";
import { localizedText } from "../../../../lib/learning/partners/localization";
import {
  LEARNING_PROVIDER_FACTS,
  providerDisplayName,
} from "../../../../lib/learning/partners/providerFacts";
import { learningPartnerHref } from "../../../../lib/learning/partners/sandboxLinks";
import {
  parseLearningSearchParams,
  searchLearningCourses,
} from "../../../../lib/learning/partners/search";
import { LEARNING_DEPARTMENTS } from "../../../../lib/learning/partners/taxonomy";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LearningPartnersSandboxPage({
  searchParams,
}: PageProps) {
  const raw = await Promise.resolve(searchParams ?? {});
  const params = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, first(value)])
  );
  const rtl = params.dir === "rtl";
  const locale = rtl ? "ar" : "en";
  const filters = parseLearningSearchParams(params);
  const file = loadLearningPartnerPilot();
  const courses = searchLearningCourses(
    listLearningPartnerCourses(),
    filters,
    locale
  );
  const paths = listLearningPaths();
  const skillshareMissing = !file.courses.some((row) => row.provider === "skillshare");

  return (
    <main
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-screen bg-[#050510] px-3 py-6 text-white sm:px-6"
    >
      <div className="mx-auto max-w-6xl pb-16">
        <p className="text-[10px] font-black tracking-[0.22em] text-sky-200/90">
          {LEARNING_PARTNER_SANDBOX_BANNER[locale]}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          {tCopy("title", locale)}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-white/65">
          {tCopy("subtitle", locale)}
        </p>
        <p className="mt-2 max-w-3xl text-sm text-white/50">
          {LEARNING_PARTNER_SANDBOX_SUBTITLE[locale]}
        </p>
        <p className="mt-2 text-xs text-white/40">{tCopy("rankingNote", locale)}</p>

        <nav className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            className="underline decoration-white/30 hover:decoration-white"
            href={learningPartnerHref({
              compare: "python",
              rtl,
            })}
          >
            {tCopy("pythonCompare", locale)}
          </Link>
          <Link
            className="underline decoration-white/30 hover:decoration-white"
            href={learningPartnerHref({
              filters,
              rtl: !rtl,
            })}
          >
            {rtl ? "LTR" : "RTL"}
          </Link>
        </nav>

        <form
          method="get"
          className="mt-6 grid gap-3 rounded-[28px] border border-white/10 bg-[#080816]/70 p-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {rtl ? <input type="hidden" name="dir" value="rtl" /> : null}
          <label className="block text-xs text-white/60">
            {tCopy("search", locale)}
            <input
              name="q"
              defaultValue={filters.query ?? ""}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-white/60">
            {tCopy("allProviders", locale)}
            <select
              name="provider"
              defaultValue={filters.provider ?? "ALL"}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">{tCopy("allProviders", locale)}</option>
              {LEARNING_PROVIDER_FACTS.map((row) => (
                <option key={row.provider} value={row.provider}>
                  {row.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-white/60">
            {tCopy("allDepartments", locale)}
            <select
              name="dept"
              defaultValue={filters.department ?? "ALL"}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">{tCopy("allDepartments", locale)}</option>
              {LEARNING_DEPARTMENTS.map((row) => (
                <option key={row.id} value={row.id}>
                  {locale === "ar" ? row.name_ar : row.name_en}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-white/60">
            {tCopy("allLevels", locale)}
            <select
              name="level"
              defaultValue={filters.level ?? "ALL"}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">{tCopy("allLevels", locale)}</option>
              <option value="BEGINNER">{tCopy("beginner", locale)}</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="MIXED">Mixed</option>
            </select>
          </label>
          <label className="block text-xs text-white/60">
            {tCopy("freePaid", locale)}
            <select
              name="price"
              defaultValue={filters.price ?? "ALL"}
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
            >
              <option value="ALL">{tCopy("freePaid", locale)}</option>
              <option value="FREE">{tCopy("free", locale)}</option>
              <option value="PAID">{tCopy("paid", locale)}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" name="cert" value="1" defaultChecked={filters.certificate} />
            {tCopy("withCertificate", locale)}
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              name="pro"
              value="1"
              defaultChecked={filters.professionalCertificate}
            />
            {tCopy("professionalCert", locale)}
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              name="uni"
              value="1"
              defaultChecked={filters.universityProvider}
            />
            {tCopy("universityProvider", locale)}
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              name="credit"
              value="1"
              defaultChecked={filters.academicCredit}
            />
            {tCopy("academicCredit", locale)}
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              name="rec"
              value="BEGINNER"
              defaultChecked={filters.recommendation === "BEGINNER"}
            />
            {tCopy("beginner", locale)}
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              name="rec"
              value="CAREER_FOCUSED"
              defaultChecked={filters.recommendation === "CAREER_FOCUSED"}
            />
            {tCopy("career", locale)}
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              name="rec"
              value="BEST_VALUE"
              defaultChecked={filters.recommendation === "BEST_VALUE"}
            />
            {tCopy("bestValue", locale)}
          </label>
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
          >
            {tCopy("filters", locale)}
          </button>
        </form>

        <p className="mt-5 text-sm text-white/55">
          {courses.length} {tCopy("results", locale)}
        </p>

        {skillshareMissing ? (
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
            {tCopy("skillshareEmpty", locale)}
          </p>
        ) : null}

        {courses.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-white/10 px-4 py-6 text-sm text-white/55">
            {tCopy("noResults", locale)}
          </p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
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

        <section className="mt-10">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {tCopy("paths", locale)}
          </h2>
          <p className="mt-2 text-sm text-white/50">{tCopy("pathsNote", locale)}</p>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {paths.map((path) => (
              <li
                key={path.id}
                className="rounded-[28px] border border-white/10 bg-[#080816]/70 p-5"
              >
                <p className="text-lg font-black">
                  {localizedText(path.title, locale)}
                </p>
                <p className="mt-2 text-sm text-white/55">
                  {localizedText(path.summary, locale)}
                </p>
                <p className="mt-2 text-xs text-white/40">
                  {path.course_ids.length} {tCopy("results", locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {locale === "ar" ? "حقائق المنصات" : "Provider facts"}
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {LEARNING_PROVIDER_FACTS.map((row) => (
              <li
                key={row.provider}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"
              >
                <p className="font-black">{providerDisplayName(row.provider)}</p>
                <p className="mt-1 text-white/60">{row.commission_published_summary}</p>
                <p className="mt-1 text-xs text-white/40">
                  Cookie: {row.cookie_window_days ?? "—"} · {row.affiliate_network} ·
                  PENDING · {row.last_verified_at}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
