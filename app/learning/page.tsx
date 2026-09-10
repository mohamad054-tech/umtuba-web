import { learningHubMetadata } from "../../lib/site/routeMetadata";
import {
  loadLearningHomeSurface,
  loadLearningTeacherCenterSurface,
  shouldPreferLiveLearningData,
} from "../../lib/learning/productization";
import { parseLearningHubSection } from "../../lib/learning/learningHub";
import {
  emptyOneToOneHubData,
  loadOneToOneHubData,
} from "../../lib/learning/oneToOne";
import { loc } from "../../lib/learning/visualDemo";
import { listLearningPartnerCourses } from "../../lib/learning/partners/catalog";
import { learningPartnerHref } from "../../lib/learning/partners/sandboxLinks";
import { resolveRequestLocale } from "../../lib/i18n/server";
import LearningHomeView from "../components/learning/visual/LearningHomeView";
import { LearningHubNav } from "../components/learning/hub/LearningHubNav";
import { LearningHubShell } from "../components/learning/hub/LearningHubShell";
import {
  AssessmentsHubPanel,
  CoursesHubPanel,
  LiveHubPanel,
  MarketplaceHubPanel,
  ProgressHubPanel,
  TeacherHubPanel,
} from "../components/learning/hub/LearningHubPanels";
import { OneToOnePanel } from "../components/learning/hub/OneToOnePanel";
import { TeacherAvailabilityPanel } from "../components/learning/hub/TeacherAvailabilityPanel";
import PartnerCourseCard from "../components/learning/partners/PartnerCourseCard";

export const metadata = learningHubMetadata;

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<{
        surface?: string;
        hub?: string;
        teacher?: string;
      }>
    | {
        surface?: string;
        hub?: string;
        teacher?: string;
      };
};

export default async function LearningHubPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams ?? {});
  const surface = query.surface === "library" ? "library" : "discover";
  const { locale } = await resolveRequestLocale();
  const home = await loadLearningHomeSurface(surface);
  const teacherLoaded = await loadLearningTeacherCenterSurface();
  const teacherSurface =
    teacherLoaded.kind === "ready" ? teacherLoaded.surface : null;
  const isTeacher = Boolean(teacherSurface?.canOperate);
  const initialSection = parseLearningHubSection(query.hub);
  const teachers = home.teachers.map((teacher) => ({
    id: teacher.id,
    name: loc(teacher.name, locale),
  }));

  let oneToOne = emptyOneToOneHubData(teachers);
  oneToOne.selectedTeacherId = query.teacher ?? teachers[0]?.id ?? null;
  if (shouldPreferLiveLearningData()) {
    try {
      const { createClient, getServerUser } = await import(
        "../../lib/supabase/server"
      );
      const user = await getServerUser();
      const supabase = await createClient();
      oneToOne = await loadOneToOneHubData(supabase, {
        viewerId: user?.id ?? null,
        teachers,
        selectedTeacherId: query.teacher,
        live: true,
      });
    } catch {
      oneToOne = emptyOneToOneHubData(teachers);
    }
  }

  const partnerLocale = locale === "ar" ? "ar" : "en";
  const partnerCourses = listLearningPartnerCourses().slice(0, 6);

  return (
    <LearningHubShell
      isTeacher={isTeacher}
      initialSection={initialSection}
      surface={surface}
      source={home.source}
      homePanel={
        <LearningHomeView
          home={home}
          headerExtra={
            <LearningHubNav
              activeSection="home"
              isTeacher={isTeacher}
              surface={surface}
            />
          }
        />
      }
      panels={{
        courses: <CoursesHubPanel home={home} />,
        progress: <ProgressHubPanel home={home} />,
        live: <LiveHubPanel home={home} />,
        assessments: <AssessmentsHubPanel home={home} />,
        oneToOne: <OneToOnePanel data={oneToOne} />,
        teacher: (
          <>
            <TeacherHubPanel model={teacherSurface} />
            <TeacherAvailabilityPanel data={oneToOne} visible={isTeacher} />
          </>
        ),
        marketplace: (
          <MarketplaceHubPanel>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {partnerCourses.map((course) => (
                <PartnerCourseCard
                  key={course.slug}
                  course={course}
                  locale={partnerLocale}
                  rtl={locale === "ar"}
                  detailsHref={learningPartnerHref({
                    slug: course.slug,
                    rtl: locale === "ar",
                  })}
                />
              ))}
            </div>
          </MarketplaceHubPanel>
        ),
      }}
    />
  );
}
