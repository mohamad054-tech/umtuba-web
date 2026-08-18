import Link from "next/link";
import type { ReactNode } from "react";
import { LearningProgressBar } from "../../learning/ds/LearningProgressBar";
import { LearningSectionHeader } from "../../learning/ds/LearningSectionHeader";
import { LearningStatusBadge } from "../../learning/ds/LearningStatusBadge";
import type { AppLocale } from "../../../../lib/i18n";
import { SANDBOX_COMMERCIAL_MODEL } from "../../../../lib/sandbox/fixtures/commercial";
import {
  courseLessonCount,
  getSandboxCourse,
  SANDBOX_COURSES,
} from "../../../../lib/sandbox/fixtures/courses";
import {
  PROSPECTIVE_LEARNING_PARTNERS,
  SYNTHETIC_LEARNING_PROVIDERS,
} from "../../../../lib/sandbox/fixtures/partners";
import {
  getSandboxPerson,
  SANDBOX_INSTRUCTORS,
  SANDBOX_STUDENTS,
} from "../../../../lib/sandbox/fixtures/people";
import type { SandboxCourse } from "../../../../lib/sandbox/fixtures/types";
import { sandboxT } from "../../../../lib/sandbox/i18n";
import { catalogSummary, flattenLessons, isPaidCourse, lessonBodyState } from "../../../../lib/sandbox/learning/catalog";
import { enrollmentModelsCatalog } from "../../../../lib/sandbox/learning/enrollment";
import {
  instructorAnalytics,
  instructorCourses,
  instructorFinancialDemo,
  instructorOnboardingTruth,
} from "../../../../lib/sandbox/learning/instructor";
import { learningSandboxJudgments } from "../../../../lib/sandbox/learning/judgments";
import { learningPaymentEconomics } from "../../../../lib/sandbox/learning/payments";
import { FOCUS_STUDENT_ID, progressForStudent } from "../../../../lib/sandbox/learning/progress";
import { learningSandboxHref, type LearningSandboxRoute } from "../../../../lib/sandbox/learning/routes";
import { resolveSandboxTutorAccess } from "../../../../lib/sandbox/learning/tutor";
import { studentE2eClickPath } from "../../../../lib/sandbox/learning/clickPath";
import {
  AdminActivateDenied,
  AssessmentForm,
  CatalogSearch,
  CertificateStatus,
  CompleteLessonButton,
  DraftCreateForm,
  EnrollButton,
  ExerciseForm,
  MockPayButtons,
  QuizForm,
  TutorForm,
} from "./LearningActions";

function href(route: LearningSandboxRoute) {
  return learningSandboxHref(route);
}

function Card({
  title,
  children,
  to,
  action,
}: {
  title: string;
  children: ReactNode;
  to?: string;
  action?: string;
}) {
  const body = (
    <>
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="mt-2 text-sm text-[var(--sx-muted)]">{children}</div>
      {action ? <p className="mt-3 text-xs text-[var(--sx-accent)]">{action}</p> : null}
    </>
  );
  if (to) {
    return (
      <Link href={to} className="sx-card block hover:border-[var(--sx-accent)]">
        {body}
      </Link>
    );
  }
  return <article className="sx-card">{body}</article>;
}

function KindBadge({ kind }: { kind: SandboxCourse["kind"] }) {
  const tone = kind === "UMTUBA_ORIGINAL" ? "success" : kind === "PARTNER_COURSE" ? "warning" : "neutral";
  return <LearningStatusBadge tone={tone}>{kind.replaceAll("_", " ")}</LearningStatusBadge>;
}

function CourseGrid({ locale, courses }: { locale: AppLocale; courses: readonly SandboxCourse[] }) {
  return (
    <div className="sx-grid sx-grid-3">
      {courses.map((course) => (
        <Card
          key={course.id}
          title={course.title}
          to={href({ surface: "course", slug: course.slug })}
          action={sandboxT(locale, "openCourse")}
        >
          <KindBadge kind={course.kind} />
          <p className="mt-2">{course.shortDescription}</p>
          <p className="mt-2 text-xs">
            {course.modules.length}×{courseLessonCount(course) || 0} ·{" "}
            {isPaidCourse(course) ? sandboxT(locale, "paidLearning") : sandboxT(locale, "freeEnrollment")} ·
            publicCatalog=NO
          </p>
        </Card>
      ))}
    </div>
  );
}

function Home({ locale }: { locale: AppLocale }) {
  const summary = catalogSummary();
  const steps = studentE2eClickPath().slice(0, 8);
  return (
    <div className="sx-learning">
      <LearningSectionHeader
        eyebrow={sandboxT(locale, "learningHome")}
        title={sandboxT(locale, "learning")}
        description={sandboxT(locale, "learningHomeLead")}
      />
      <div className="sx-grid sx-grid-3 mt-4">
        <Card title={sandboxT(locale, "catalog")} to={href({ surface: "catalog" })} action={sandboxT(locale, "openCourse")}>
          {summary.total} · {summary.originals} Originals · {summary.partner} partner · {summary.external}{" "}
          external
        </Card>
        <Card
          title={sandboxT(locale, "studentRoster")}
          to={href({ surface: "students" })}
          action={sandboxT(locale, "openStudent")}
        >
          {SANDBOX_STUDENTS.length} {sandboxT(locale, "synthetic")}
        </Card>
        <Card
          title={sandboxT(locale, "instructorRoster")}
          to={href({ surface: "instructors" })}
          action={sandboxT(locale, "openInstructor")}
        >
          {SANDBOX_INSTRUCTORS.length} {sandboxT(locale, "synthetic")}
        </Card>
      </div>
      <div className="sx-grid mt-4">
        <Card title={sandboxT(locale, "enrollmentModels")} to={href({ surface: "enrollmentModels" })}>
          HOSTED · PAID · EXTERNAL_CONTINUE
        </Card>
        <Card title={sandboxT(locale, "learningAdmin")} to={href({ surface: "admin" })}>
          {sandboxT(locale, "prospectiveStay")}
        </Card>
      </div>
      <h3 className="mt-8 text-sm font-semibold">{sandboxT(locale, "studentE2e")}</h3>
      <ol className="mt-2 flex flex-wrap gap-2 text-xs">
        {steps.map((step) => (
          <li key={step.id}>
            <Link className="sx-badge" href={step.href}>
              {step.title}
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Students({ locale }: { locale: AppLocale }) {
  return (
    <div>
      <LearningSectionHeader title={sandboxT(locale, "studentRoster")} description={sandboxT(locale, "studentRosterLead")} />
      <div className="sx-grid sx-grid-3 mt-4">
        {SANDBOX_STUDENTS.map((person) => (
          <Card
            key={person.id}
            title={person.displayName}
            to={href({ surface: "student", studentId: person.id })}
            action={sandboxT(locale, "openStudent")}
          >
            {person.id} · {sandboxT(locale, "synthetic")}
          </Card>
        ))}
      </div>
    </div>
  );
}

function StudentProfile({ locale, studentId }: { locale: AppLocale; studentId: string }) {
  const person = getSandboxPerson(studentId);
  if (!person || person.role !== "student") return <p>{sandboxT(locale, "unknownStudent")}</p>;
  const rows = progressForStudent(studentId);
  return (
    <div>
      <LearningSectionHeader eyebrow={sandboxT(locale, "studentProfile")} title={person.displayName} />
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{sandboxT(locale, "syntheticPerson")}</p>
      <p className="mt-4">
        <Link className="sx-btn sx-btn-ok" href={href({ surface: "studentDashboard", studentId })}>
          {sandboxT(locale, "studentDashboard")}
        </Link>
      </p>
      <div className="sx-grid mt-4">
        {rows.map((row) => (
          <Card key={row.courseSlug} title={row.courseTitle} to={href({ surface: "course", slug: row.courseSlug })}>
            {row.percent}% · {row.lessonsCompleted}/{row.lessonsTotal} · cert={row.certificate}
          </Card>
        ))}
      </div>
    </div>
  );
}

function StudentDashboard({ locale, studentId }: { locale: AppLocale; studentId: string }) {
  const person = getSandboxPerson(studentId);
  if (!person) return <p>{sandboxT(locale, "unknownStudent")}</p>;
  const rows = progressForStudent(studentId);
  return (
    <div>
      <LearningSectionHeader eyebrow={sandboxT(locale, "studentDashboard")} title={person.displayName} />
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <article key={row.courseSlug} className="sx-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{row.courseTitle}</h3>
              <Link href={href({ surface: "course", slug: row.courseSlug })} className="text-sm text-[var(--sx-accent)]">
                {sandboxT(locale, "whatNext")}
              </Link>
            </div>
            <div className="mt-3">
              <LearningProgressBar percent={row.percent} label={sandboxT(locale, "progress")} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function CourseDetail({ locale, slug }: { locale: AppLocale; slug: string }) {
  const course = getSandboxCourse(slug);
  if (!course) return <p>{sandboxT(locale, "unknownCourse")}</p>;
  const instructor = getSandboxPerson(course.instructorId);
  const tutor = resolveSandboxTutorAccess(course);
  const economics = learningPaymentEconomics(course);
  const first = flattenLessons(course)[0];
  return (
    <div>
      <KindBadge kind={course.kind} />
      <h2 className="mt-3 text-2xl font-semibold">{course.title}</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">{course.shortDescription}</p>
      <p className="mt-2 text-xs">
        owner={course.contentOwner} · certificate={course.certificateOwner} · AI Tutor=
        {tutor.allowed ? "OWNED" : "DENIED"} · enroll={course.enrollmentMode}
      </p>
      <p className="mt-3 text-sm">
        <Link href={href({ surface: "instructor", instructorId: course.instructorId })}>
          {instructor?.displayName ?? course.instructorId}
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="sx-btn" href={href({ surface: "enroll", slug })}>
          {sandboxT(locale, "enrollSandbox")}
        </Link>
        {isPaidCourse(course) ? (
          <Link className="sx-btn" href={href({ surface: "pay", slug })}>
            {sandboxT(locale, "mockPayment")}
          </Link>
        ) : null}
        {first ? (
          <Link className="sx-btn sx-btn-ok" href={href({ surface: "lesson", slug, lessonId: first.lesson.id })}>
            {sandboxT(locale, "openLesson")}
          </Link>
        ) : null}
        {course.exercises[0] ? (
          <Link className="sx-btn" href={href({ surface: "exercise", slug, exerciseId: course.exercises[0].id })}>
            {sandboxT(locale, "exercise")}
          </Link>
        ) : null}
        {course.modules.length > 0 ? (
          <Link className="sx-btn" href={href({ surface: "assessment", slug })}>
            {sandboxT(locale, "finalAssessment")}
          </Link>
        ) : null}
        <Link className="sx-btn" href={href({ surface: "tutor", slug })}>
          {sandboxT(locale, "aiTutor")}
        </Link>
        <Link className="sx-btn" href={href({ surface: "certificate", slug })}>
          {sandboxT(locale, "certificate")}
        </Link>
      </div>
      {course.kind === "EXTERNAL_COURSE" ? (
        <p className="sx-card mt-4">{sandboxT(locale, "continueProvider")}</p>
      ) : (
        <div className="mt-6 space-y-4">
          {course.modules.map((module) => (
            <article key={module.id} className="sx-card">
              <h3 className="font-semibold">{module.title}</h3>
              <p className="mt-1 text-sm text-[var(--sx-muted)]">{module.summary}</p>
              <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link href={href({ surface: "lesson", slug, lessonId: lesson.id })} className="font-semibold">
                      {lesson.title}
                    </Link>{" "}
                    ({lesson.kind}
                    {lessonBodyState(lesson) === "MISSING" ? ` · ${sandboxT(locale, "bodyMissing")}` : ""})
                    {lesson.quiz[0] ? (
                      <span>
                        {" "}
                        ·{" "}
                        <Link href={href({ surface: "quiz", slug, lessonId: lesson.id })}>
                          {sandboxT(locale, "quiz")}
                        </Link>
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-[var(--sx-faint)]">
        {economics.note} · UMTUBA {economics.umtubaSharePercent ?? "n/a"}%
      </p>
    </div>
  );
}

function LessonView({
  locale,
  slug,
  lessonId,
  studentId,
}: {
  locale: AppLocale;
  slug: string;
  lessonId: string;
  studentId: string;
}) {
  const course = getSandboxCourse(slug);
  const rows = course ? flattenLessons(course) : [];
  const current = rows.find((row) => row.lesson.id === lessonId);
  if (!course || !current) return <p>{sandboxT(locale, "unknownLesson")}</p>;
  const next = rows[current.index + 1];
  const missing = lessonBodyState(current.lesson) === "MISSING";
  return (
    <div>
      <p className="text-xs text-[var(--sx-faint)]">
        {current.moduleTitle} · {current.index + 1}/{rows.length}
      </p>
      <h2 className="mt-2 text-2xl font-semibold">{current.lesson.title}</h2>
      {missing ? (
        <p className="sx-card mt-4">{sandboxT(locale, "bodyMissing")}</p>
      ) : (
        <p className="sx-card mt-4 whitespace-pre-wrap text-sm leading-7">{current.lesson.body}</p>
      )}
      <p className="mt-3 text-xs">{sandboxT(locale, "authoredSourceLanguage")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <CompleteLessonButton locale={locale} studentId={studentId} courseSlug={slug} lessonId={lessonId} />
        {current.lesson.quiz[0] ? (
          <Link className="sx-btn" href={href({ surface: "quiz", slug, lessonId })}>
            {sandboxT(locale, "quiz")}
          </Link>
        ) : null}
        <Link className="sx-btn" href={href({ surface: "tutor", slug, lessonId })}>
          {sandboxT(locale, "aiTutor")}
        </Link>
        {next ? (
          <Link className="sx-btn sx-btn-ok" href={href({ surface: "lesson", slug, lessonId: next.lesson.id })}>
            {sandboxT(locale, "nextLesson")}
          </Link>
        ) : (
          <Link className="sx-btn sx-btn-ok" href={href({ surface: "assessment", slug })}>
            {sandboxT(locale, "finalAssessment")}
          </Link>
        )}
      </div>
    </div>
  );
}

function Instructors({ locale }: { locale: AppLocale }) {
  return (
    <div>
      <LearningSectionHeader title={sandboxT(locale, "instructorRoster")} />
      <div className="sx-grid sx-grid-3 mt-4">
        {SANDBOX_INSTRUCTORS.map((person) => (
          <Card
            key={person.id}
            title={person.displayName}
            to={href({ surface: "instructor", instructorId: person.id })}
            action={sandboxT(locale, "openInstructor")}
          >
            {person.specialty} · {person.onboarding} · {instructorOnboardingTruth(person.onboarding ?? "DRAFT").note}
          </Card>
        ))}
      </div>
    </div>
  );
}

function InstructorProfile({ locale, instructorId }: { locale: AppLocale; instructorId: string }) {
  const person = getSandboxPerson(instructorId);
  if (!person || person.role !== "instructor") return <p>{sandboxT(locale, "unknownInstructor")}</p>;
  const courses = instructorCourses(instructorId);
  return (
    <div>
      <LearningSectionHeader eyebrow={sandboxT(locale, "instructorProfile")} title={person.displayName} />
      <p className="mt-2 text-sm">{instructorOnboardingTruth(person.onboarding ?? "DRAFT").note}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link className="sx-btn" href={href({ surface: "instructorDashboard", instructorId })}>
          {sandboxT(locale, "instructorDashboard")}
        </Link>
        <Link className="sx-btn" href={href({ surface: "courseCreation", instructorId })}>
          {sandboxT(locale, "courseCreation")}
        </Link>
        <Link className="sx-btn" href={href({ surface: "instructorAnalytics", instructorId })}>
          {sandboxT(locale, "instructorAnalytics")}
        </Link>
        <Link className="sx-btn" href={href({ surface: "instructorFinancial", instructorId })}>
          {sandboxT(locale, "instructorFinancial")}
        </Link>
      </div>
      <div className="mt-4">
        <CourseGrid locale={locale} courses={courses} />
      </div>
    </div>
  );
}

function Admin({ locale }: { locale: AppLocale }) {
  return (
    <div>
      <LearningSectionHeader title={sandboxT(locale, "learningAdmin")} description={sandboxT(locale, "adminLead")} />
      <div className="sx-grid mt-4">
        {SYNTHETIC_LEARNING_PROVIDERS.map((provider) => (
          <Card key={provider.id} title={provider.displayName}>
            status={provider.status} · {provider.note}
          </Card>
        ))}
      </div>
      <h3 className="mt-6 font-semibold">{sandboxT(locale, "prospectivePartners")}</h3>
      <div className="mt-3 space-y-3">
        {PROSPECTIVE_LEARNING_PARTNERS.map((partner) => (
          <article key={partner.id} className="sx-card">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold">{partner.displayName}</h4>
              <span className="sx-badge">{partner.label}</span>
              <span className="sx-badge">{partner.partnerClaim}</span>
            </div>
            <p className="mt-2 text-sm text-[var(--sx-muted)]">{partner.notes}</p>
            <AdminActivateDenied locale={locale} partnerName={partner.displayName} />
          </article>
        ))}
      </div>
    </div>
  );
}

function Judgments({ locale }: { locale: AppLocale }) {
  return (
    <aside className="sx-card mt-8">
      <h3 className="font-semibold">{sandboxT(locale, "qualityJudgments")}</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {learningSandboxJudgments().map((row) => (
          <li key={row.key}>
            <strong>{row.verdict}</strong> · {row.key}: {row.note}
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default function LearningSandbox({
  locale,
  route,
}: {
  locale: AppLocale;
  route: LearningSandboxRoute;
}) {
  const studentId = FOCUS_STUDENT_ID;

  let body: ReactNode;
  switch (route.surface) {
    case "home":
      body = <Home locale={locale} />;
      break;
    case "catalog":
      body = (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "catalog")} />
          <CourseGrid locale={locale} courses={SANDBOX_COURSES} />
        </div>
      );
      break;
    case "search":
      body = (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "searchFilter")} />
          <CatalogSearch locale={locale} />
        </div>
      );
      break;
    case "students":
      body = <Students locale={locale} />;
      break;
    case "student":
      body = <StudentProfile locale={locale} studentId={route.studentId} />;
      break;
    case "studentDashboard":
      body = <StudentDashboard locale={locale} studentId={route.studentId} />;
      break;
    case "course":
      body = <CourseDetail locale={locale} slug={route.slug} />;
      break;
    case "lesson":
      body = <LessonView locale={locale} slug={route.slug} lessonId={route.lessonId} studentId={studentId} />;
      break;
    case "quiz": {
      const course = getSandboxCourse(route.slug);
      const lesson = course ? flattenLessons(course).find((row) => row.lesson.id === route.lessonId) : null;
      body = lesson?.lesson.quiz[0] ? (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "quiz")} description={lesson.lesson.title} />
          <QuizForm
            locale={locale}
            studentId={studentId}
            courseSlug={route.slug}
            lessonId={route.lessonId}
            question={lesson.lesson.quiz[0]}
          />
        </div>
      ) : (
        <p>{sandboxT(locale, "unknownLesson")}</p>
      );
      break;
    }
    case "exercise": {
      const course = getSandboxCourse(route.slug);
      const exercise = course?.exercises.find((row) => row.id === route.exerciseId);
      body = exercise ? (
        <div>
          <LearningSectionHeader title={exercise.title} />
          <ExerciseForm
            locale={locale}
            studentId={studentId}
            courseSlug={route.slug}
            exerciseId={exercise.id}
            prompt={exercise.prompt}
          />
        </div>
      ) : (
        <p>{sandboxT(locale, "unknownLesson")}</p>
      );
      break;
    }
    case "assessment": {
      const course = getSandboxCourse(route.slug);
      const questions = course ? flattenLessons(course).flatMap((row) => row.lesson.quiz) : [];
      body = course ? (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "finalAssessment")} description={sandboxT(locale, "noAccreditation")} />
          <AssessmentForm locale={locale} studentId={studentId} courseSlug={route.slug} questions={questions} />
        </div>
      ) : (
        <p>{sandboxT(locale, "unknownCourse")}</p>
      );
      break;
    }
    case "tutor": {
      const course = getSandboxCourse(route.slug);
      const access = course ? resolveSandboxTutorAccess(course) : null;
      const lessonId = route.lessonId ?? (course ? flattenLessons(course)[0]?.lesson.id : undefined);
      body = (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "aiTutor")} description={access?.reason} />
          {access?.allowed && lessonId ? (
            <TutorForm locale={locale} courseSlug={route.slug} lessonId={lessonId} />
          ) : (
            <p className="sx-card mt-4">{access?.reason ?? sandboxT(locale, "tutorDenied")}</p>
          )}
        </div>
      );
      break;
    }
    case "certificate": {
      const course = getSandboxCourse(route.slug);
      body = course ? (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "certificate")} />
          <CertificateStatus locale={locale} studentId={studentId} courseSlug={route.slug} />
        </div>
      ) : (
        <p>{sandboxT(locale, "unknownCourse")}</p>
      );
      break;
    }
    case "enroll": {
      const course = getSandboxCourse(route.slug);
      body = course ? (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "enrollSandbox")} description={course.title} />
          {course.enrollmentMode === "EXTERNAL_CONTINUE" ? (
            <p className="sx-card mt-4">{sandboxT(locale, "continueProvider")}</p>
          ) : isPaidCourse(course) ? (
            <p className="sx-card mt-4">
              {sandboxT(locale, "paidFirst")}{" "}
              <Link href={href({ surface: "pay", slug: route.slug })}>{sandboxT(locale, "mockPayment")}</Link>
            </p>
          ) : (
            <div className="mt-4">
              <EnrollButton locale={locale} studentId={studentId} courseSlug={route.slug} />
            </div>
          )}
        </div>
      ) : (
        <p>{sandboxT(locale, "unknownCourse")}</p>
      );
      break;
    }
    case "pay":
      body = (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "mockPayment")} />
          <MockPayButtons locale={locale} studentId={studentId} courseSlug={route.slug} />
        </div>
      );
      break;
    case "instructors":
      body = <Instructors locale={locale} />;
      break;
    case "instructor":
      body = <InstructorProfile locale={locale} instructorId={route.instructorId} />;
      break;
    case "instructorDashboard":
      body = (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "instructorDashboard")} />
          <InstructorProfile locale={locale} instructorId={route.instructorId} />
        </div>
      );
      break;
    case "courseCreation":
      body = (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "courseCreation")} description={sandboxT(locale, "creationLead")} />
          <DraftCreateForm locale={locale} instructorId={route.instructorId} />
        </div>
      );
      break;
    case "instructorAnalytics": {
      const analytics = instructorAnalytics(route.instructorId);
      body = (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "instructorAnalytics")} description={analytics.note} />
          <div className="sx-grid mt-4">
            {analytics.courses.map((row) => (
              <Card key={row.slug} title={row.title}>
                learners={row.learnersSynthetic} · completion={row.completionSynthetic}% · {row.kind}
              </Card>
            ))}
          </div>
        </div>
      );
      break;
    }
    case "instructorFinancial": {
      const demo = instructorFinancialDemo(route.instructorId);
      body = (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "instructorFinancial")} />
          <article className="sx-card mt-4">
            <p>
              {demo.paidCourseCount} paid · {demo.syntheticGrossMinor} USD cents · payout=OFF
            </p>
            <p className="mt-2 text-sm">{demo.payoutReason}</p>
          </article>
        </div>
      );
      break;
    }
    case "admin":
      body = <Admin locale={locale} />;
      break;
    case "partners":
      body = (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "learningPartners")} />
          <Admin locale={locale} />
        </div>
      );
      break;
    case "enrollmentModels":
      body = (
        <div>
          <LearningSectionHeader title={sandboxT(locale, "enrollmentModels")} />
          <div className="sx-grid mt-4">
            {enrollmentModelsCatalog().map((row) => (
              <Card
                key={row.mode}
                title={row.title}
                to={row.exampleSlug ? href({ surface: "course", slug: row.exampleSlug }) : undefined}
              >
                <p>
                  <strong>WHY:</strong> {row.why}
                </p>
                <p className="mt-2">
                  <strong>WHAT NEXT:</strong> {row.whatNext}
                </p>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-xs">{SANDBOX_COMMERCIAL_MODEL.disclaimer}</p>
        </div>
      );
      break;
    default:
      body = <Home locale={locale} />;
  }

  return (
    <div>
      {body}
      {route.surface === "home" ? <Judgments locale={locale} /> : null}
    </div>
  );
}
