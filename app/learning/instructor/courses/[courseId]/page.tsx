import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import InstructorActionForm from "../../../../components/learning/instructor/InstructorActionForm";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_INSTRUCTOR_ROUTES,
  loadInstructorCourseTree,
  type InstructorCourseTree,
} from "../../../../../lib/learning/instructorAuthoring";
import { LEARNING_ASSESSMENT_ROUTES } from "../../../../../lib/learning/assessmentAuthoring";
import { LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES } from "../../../../../lib/learning/assessmentManualReview";
import { LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES } from "../../../../../lib/learning/instructorExperience";
import { LEARNING_ASSIGNMENT_ROUTES } from "../../../../../lib/learning/assignmentsCoursework";
import {
  archiveActivityAction,
  archiveLessonAction,
  archiveSectionAction,
  createActivityAction,
  createLessonAction,
  createSectionAction,
  publishActivityAction,
  publishLessonAction,
  publishSectionAction,
  reorderActivitiesAction,
  reorderLessonsAction,
  reorderSectionsAction,
  updateActivityAction,
  updateLessonAction,
  updateSectionAction,
} from "../../actions";

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function InstructorCourseAuthoringPage({
  params,
}: PageProps) {
  const { courseId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_INSTRUCTOR_ROUTES.course(courseId))}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadInstructorCourseTree(supabase, courseId);
  if (!loaded.ok) {
    return (
      <LearningShell
        title="Course unavailable"
        backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
        backLabel="Instructor workspace"
      >
        <p className="mt-6 rounded-lg border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          {loaded.message}
        </p>
      </LearningShell>
    );
  }

  const payload = loaded.data as {
    tree: InstructorCourseTree;
    canManage: boolean;
  };
  const tree = payload.tree;
  const canManage = payload.canManage;
  const sectionIdsOrdered = tree.sections.map((s) => s.id).join(",");

  return (
    <LearningShell
      title={tree.course.name}
      subtitle={`Authoring · ${tree.course.status}`}
      backHref={LEARNING_INSTRUCTOR_ROUTES.hub}
      backLabel="Instructor workspace"
    >
      <p className="mt-3 text-sm text-white/60">
        Lifecycle controls call existing publish/archive RPCs. Double-publish of
        non-draft items fails closed. Open an activity to manage its questions.
      </p>

      <nav className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link
          href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.courseOverview(courseId)}
          className="font-bold text-white underline underline-offset-2"
        >
          Overview
        </Link>
        <Link
          href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.learners(courseId)}
          className="font-bold text-white underline underline-offset-2"
        >
          Learners
        </Link>
        <Link
          href={LEARNING_INSTRUCTOR_EXPERIENCE_ROUTES.completion(courseId)}
          className="font-bold text-white underline underline-offset-2"
        >
          Completion
        </Link>
        <Link
          href={LEARNING_ASSESSMENT_MANUAL_REVIEW_ROUTES.queue(courseId)}
          className="font-bold text-white underline underline-offset-2"
        >
          Manual review queue
        </Link>
        <Link
          href={LEARNING_ASSIGNMENT_ROUTES.queue(courseId)}
          className="font-bold text-white underline underline-offset-2"
        >
          Assignment queue
        </Link>
      </nav>

      <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-base font-bold">Add section</h2>
        <InstructorActionForm
          action={createSectionAction}
          className="mt-3 space-y-2"
          successMessage="Section created."
        >
          <input type="hidden" name="courseId" value={courseId} />
          <input
            name="name"
            required
            placeholder="Section name"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
          />
          <input
            name="slug"
            required
            placeholder="section-slug"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
          />
          <textarea
            name="description"
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
            rows={2}
          />
        </InstructorActionForm>
      </section>

      {canManage && tree.sections.length > 1 ? (
        <section className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-base font-bold">Reorder sections</h2>
          <p className="mt-1 text-xs text-white/50">
            Provide the complete ordered section id list for this course.
          </p>
          <InstructorActionForm
            action={reorderSectionsAction}
            className="mt-3 space-y-2"
            successMessage="Sections reordered."
          >
            <input type="hidden" name="courseId" value={courseId} />
            <textarea
              name="sectionIds"
              required
              defaultValue={sectionIdsOrdered}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 font-mono text-xs"
              rows={3}
            />
          </InstructorActionForm>
        </section>
      ) : null}

      <div className="mt-8 space-y-6">
        {tree.sections.length === 0 ? (
          <p className="text-sm text-white/60">No sections yet.</p>
        ) : (
          tree.sections.map((section) => {
            const lessonIdsOrdered = section.lessons.map((l) => l.id).join(",");
            return (
              <section
                key={section.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-bold">{section.name}</h2>
                  <span className="text-xs uppercase text-white/50">
                    {section.status} · pos {section.position}
                  </span>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <InstructorActionForm
                    action={updateSectionAction}
                    successMessage="Section updated."
                    className="space-y-2 rounded-lg border border-white/10 p-3"
                  >
                    <p className="text-xs font-bold text-white/50">Update</p>
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <input
                      name="name"
                      defaultValue={section.name}
                      className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                    />
                    <textarea
                      name="description"
                      defaultValue={section.description ?? ""}
                      className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                      rows={2}
                    />
                  </InstructorActionForm>

                  {canManage ? (
                    <div className="space-y-2 rounded-lg border border-white/10 p-3">
                      <p className="text-xs font-bold text-white/50">Lifecycle</p>
                      <InstructorActionForm
                        action={publishSectionAction}
                        submitLabel="Publish"
                        successMessage="Section published."
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="sectionId"
                          value={section.id}
                        />
                      </InstructorActionForm>
                      <InstructorActionForm
                        action={archiveSectionAction}
                        successMessage="Section archived."
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="sectionId"
                          value={section.id}
                        />
                      </InstructorActionForm>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 rounded-lg border border-dashed border-white/15 p-3">
                  <h3 className="text-sm font-bold">Add lesson</h3>
                  <InstructorActionForm
                    action={createLessonAction}
                    className="mt-2 space-y-2"
                    successMessage="Lesson created."
                  >
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="sectionId" value={section.id} />
                    <input
                      name="name"
                      required
                      placeholder="Lesson name"
                      className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                    />
                    <input
                      name="slug"
                      required
                      placeholder="lesson-slug"
                      className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                    />
                  </InstructorActionForm>
                </div>

                {canManage && section.lessons.length > 1 ? (
                  <div className="mt-3">
                    <InstructorActionForm
                      action={reorderLessonsAction}
                      successMessage="Lessons reordered."
                      className="space-y-2"
                    >
                      <input type="hidden" name="courseId" value={courseId} />
                      <input type="hidden" name="sectionId" value={section.id} />
                      <textarea
                        name="lessonIds"
                        required
                        defaultValue={lessonIdsOrdered}
                        className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-xs"
                        rows={2}
                      />
                    </InstructorActionForm>
                  </div>
                ) : null}

                <ul className="mt-4 space-y-4">
                  {section.lessons.map((lesson) => {
                    const activityIdsOrdered = lesson.activities
                      .map((a) => a.id)
                      .join(",");
                    return (
                      <li
                        key={lesson.id}
                        className="rounded-lg border border-white/10 bg-black/20 p-3"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <p className="font-bold">{lesson.name}</p>
                            <p className="text-xs text-white/50">
                              {lesson.status} · pos {lesson.position}
                            </p>
                          </div>
                          <Link
                            href={LEARNING_INSTRUCTOR_ROUTES.lesson(
                              courseId,
                              lesson.id
                            )}
                            className="watch-focus-ring text-sm font-bold text-sky-300 hover:underline"
                          >
                            Content blocks →
                          </Link>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <InstructorActionForm
                            action={updateLessonAction}
                            successMessage="Lesson updated."
                            className="space-y-2"
                          >
                            <input type="hidden" name="courseId" value={courseId} />
                            <input
                              type="hidden"
                              name="lessonId"
                              value={lesson.id}
                            />
                            <input
                              name="name"
                              defaultValue={lesson.name}
                              className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                            />
                          </InstructorActionForm>
                          {canManage ? (
                            <div className="space-y-2">
                              <InstructorActionForm action={publishLessonAction}>
                                <input
                                  type="hidden"
                                  name="courseId"
                                  value={courseId}
                                />
                                <input
                                  type="hidden"
                                  name="lessonId"
                                  value={lesson.id}
                                />
                              </InstructorActionForm>
                              <InstructorActionForm
                                action={archiveLessonAction}
                                successMessage="Lesson archived."
                              >
                                <input
                                  type="hidden"
                                  name="courseId"
                                  value={courseId}
                                />
                                <input
                                  type="hidden"
                                  name="lessonId"
                                  value={lesson.id}
                                />
                              </InstructorActionForm>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-3 rounded border border-dashed border-white/15 p-3">
                          <h4 className="text-sm font-bold">Add activity</h4>
                          <InstructorActionForm
                            action={createActivityAction}
                            className="mt-2 space-y-2"
                            successMessage="Activity created."
                          >
                            <input type="hidden" name="courseId" value={courseId} />
                            <input
                              type="hidden"
                              name="lessonId"
                              value={lesson.id}
                            />
                            <select
                              name="type"
                              defaultValue="quiz"
                              className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                            >
                              <option value="quiz">quiz</option>
                              <option value="assignment">assignment</option>
                              <option value="practice">practice</option>
                              <option value="discussion">discussion</option>
                            </select>
                            <input
                              name="name"
                              required
                              placeholder="Activity name"
                              className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                            />
                            <input
                              name="slug"
                              required
                              placeholder="activity-slug"
                              className="w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                            />
                          </InstructorActionForm>
                        </div>

                        {canManage && lesson.activities.length > 1 ? (
                          <div className="mt-2">
                            <InstructorActionForm
                              action={reorderActivitiesAction}
                              successMessage="Activities reordered."
                            >
                              <input
                                type="hidden"
                                name="courseId"
                                value={courseId}
                              />
                              <input
                                type="hidden"
                                name="lessonId"
                                value={lesson.id}
                              />
                              <textarea
                                name="activityIds"
                                required
                                defaultValue={activityIdsOrdered}
                                className="mt-2 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-xs"
                                rows={2}
                              />
                            </InstructorActionForm>
                          </div>
                        ) : null}

                        <ul className="mt-3 space-y-2">
                          {lesson.activities.map((activity) => (
                            <li
                              key={activity.id}
                              className="rounded border border-white/10 p-2 text-sm"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="font-bold">
                                  {activity.name}{" "}
                                  <span className="font-normal text-white/50">
                                    ({activity.type})
                                  </span>
                                </span>
                                <span className="flex items-center gap-3 text-xs uppercase text-white/50">
                                  {activity.type === "assignment" ? (
                                    <Link
                                      href={LEARNING_ASSIGNMENT_ROUTES.author(
                                        courseId,
                                        activity.id
                                      )}
                                      className="normal-case text-sky-300 underline underline-offset-2"
                                    >
                                      Assignment
                                    </Link>
                                  ) : (
                                    <Link
                                      href={LEARNING_ASSESSMENT_ROUTES.activityQuestions(
                                        courseId,
                                        activity.id
                                      )}
                                      className="normal-case text-sky-300 underline underline-offset-2"
                                    >
                                      Questions
                                    </Link>
                                  )}
                                  <span>{activity.status}</span>
                                </span>
                              </div>
                              <div className="mt-2 grid gap-2 md:grid-cols-2">
                                <InstructorActionForm
                                  action={updateActivityAction}
                                  successMessage="Activity updated."
                                >
                                  <input
                                    type="hidden"
                                    name="courseId"
                                    value={courseId}
                                  />
                                  <input
                                    type="hidden"
                                    name="activityId"
                                    value={activity.id}
                                  />
                                  <input
                                    name="name"
                                    defaultValue={activity.name}
                                    className="w-full rounded border border-white/15 bg-black/40 px-2 py-1 text-sm"
                                  />
                                </InstructorActionForm>
                                {canManage ? (
                                  <div className="space-y-1">
                                    <InstructorActionForm
                                      action={publishActivityAction}
                                    >
                                      <input
                                        type="hidden"
                                        name="courseId"
                                        value={courseId}
                                      />
                                      <input
                                        type="hidden"
                                        name="activityId"
                                        value={activity.id}
                                      />
                                    </InstructorActionForm>
                                    <InstructorActionForm
                                      action={archiveActivityAction}
                                      successMessage="Activity archived."
                                    >
                                      <input
                                        type="hidden"
                                        name="courseId"
                                        value={courseId}
                                      />
                                      <input
                                        type="hidden"
                                        name="activityId"
                                        value={activity.id}
                                      />
                                    </InstructorActionForm>
                                  </div>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </LearningShell>
  );
}
