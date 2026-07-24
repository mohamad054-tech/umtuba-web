import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../../../../../../components/learning/LearningShell";
import InstructorActionForm from "../../../../../../../components/learning/instructor/InstructorActionForm";
import { createClient, getServerUser } from "../../../../../../../../lib/supabase/server";
import {
  LEARNING_ASSESSMENT_ROUTES,
  loadAssessmentActivityQuestions,
  type AssessmentAuthoringActivityContext,
  type AssessmentAuthoringQuestion,
} from "../../../../../../../../lib/learning/assessmentAuthoring";
import { LEARNING_INSTRUCTOR_ROUTES } from "../../../../../../../../lib/learning/instructorAuthoring";
import { LEARNING_QUESTION_CREATABLE_TYPES } from "../../../../../../../../lib/learning/questionsFoundation";
import {
  archiveQuestionAction,
  createQuestionAction,
  publishQuestionAction,
  reorderQuestionsAction,
  setAnswerKeyAction,
  unpublishQuestionAction,
  updateQuestionAction,
} from "../../../../../assessmentActions";

type PageProps = {
  params: Promise<{ courseId: string; activityId: string }>;
};

function optionsDefault(content: Record<string, unknown>): string {
  const options = content.options;
  if (!Array.isArray(options)) return "a|Option A\nb|Option B";
  return options
    .map((o) => {
      if (
        typeof o === "object" &&
        o !== null &&
        "key" in o &&
        "text" in o
      ) {
        return `${String((o as { key: unknown }).key)}|${String(
          (o as { text: unknown }).text
        )}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function blanksDefault(content: Record<string, unknown>): string {
  const blanks = content.blanks;
  if (!Array.isArray(blanks)) return "blank1";
  return blanks
    .map((b) =>
      typeof b === "object" && b !== null && "key" in b
        ? String((b as { key: unknown }).key)
        : ""
    )
    .filter(Boolean)
    .join(",");
}

function AnswerKeyFields({
  question,
}: {
  question: AssessmentAuthoringQuestion;
}) {
  const type = question.question_type;
  if (
    type === "multiple_choice_single" ||
    type === "multiple_choice_multiple"
  ) {
    return type === "multiple_choice_single" ? (
      <label className="block text-xs text-white/70">
        Correct option key
        <input
          name="correctKey"
          required
          className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
          placeholder="a"
        />
      </label>
    ) : (
      <label className="block text-xs text-white/70">
        Correct option keys (comma-separated)
        <input
          name="correctKeys"
          required
          className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
          placeholder="a,c"
        />
      </label>
    );
  }
  if (type === "true_false") {
    return (
      <label className="block text-xs text-white/70">
        Correct answer
        <select
          name="correct"
          required
          className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
          defaultValue="true"
        >
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      </label>
    );
  }
  if (type === "short_answer") {
    return (
      <div className="space-y-2">
        <label className="block text-xs text-white/70">
          Accepted answers (one per line)
          <textarea
            name="accepted"
            required
            rows={3}
            className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" name="normTrim" defaultChecked />
          Trim whitespace
        </label>
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input type="checkbox" name="normCase" />
          Case sensitive
        </label>
      </div>
    );
  }
  if (type === "fill_blank") {
    return (
      <label className="block text-xs text-white/70">
        Blank answers (blankKey=ans1|ans2 per line)
        <textarea
          name="blankAnswers"
          required
          rows={3}
          className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-xs"
          placeholder="blank1=Paris|paris"
        />
      </label>
    );
  }
  if (type === "numeric") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs text-white/70">
          Value
          <input
            name="value"
            required
            inputMode="decimal"
            className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs text-white/70">
          Tolerance (optional)
          <input
            name="tolerance"
            inputMode="decimal"
            className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
          />
        </label>
      </div>
    );
  }
  return (
    <p className="text-xs text-rose-300">
      Answer keys are not editable for this question type in Minimal V1.
    </p>
  );
}

function ContentFields({
  questionTypeName,
  question,
}: {
  questionTypeName: string;
  question?: AssessmentAuthoringQuestion;
}) {
  const content = question?.content ?? {};
  const prompt =
    typeof content.prompt === "string" ? content.prompt : "";
  const type = question?.question_type ?? "";

  return (
    <div className="space-y-2">
      <label className="block text-xs text-white/70">
        Prompt
        <textarea
          name="prompt"
          required
          rows={3}
          defaultValue={prompt}
          className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
        />
      </label>
      {(type === "multiple_choice_single" ||
        type === "multiple_choice_multiple" ||
        questionTypeName === "create_mc") && (
        <label className="block text-xs text-white/70">
          Options (key|text, one per line)
          <textarea
            name="options"
            rows={4}
            defaultValue={optionsDefault(content)}
            className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-xs"
          />
        </label>
      )}
      {(type === "fill_blank" || questionTypeName === "create_fill") && (
        <label className="block text-xs text-white/70">
          Blank keys (comma-separated)
          <input
            name="blanks"
            defaultValue={blanksDefault(content)}
            className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
          />
        </label>
      )}
      {(type === "numeric" || questionTypeName === "create_numeric") && (
        <label className="block text-xs text-white/70">
          Unit (optional)
          <input
            name="unit"
            defaultValue={
              typeof content.unit === "string" ? content.unit : ""
            }
            className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
          />
        </label>
      )}
      <label className="block text-xs text-white/70">
        Points (optional)
        <input
          name="points"
          inputMode="decimal"
          defaultValue={question?.points ?? ""}
          className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
        />
      </label>
    </div>
  );
}

export default async function AssessmentQuestionsPage({ params }: PageProps) {
  const { courseId, activityId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_ASSESSMENT_ROUTES.activityQuestions(courseId, activityId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadAssessmentActivityQuestions(
    supabase,
    courseId,
    activityId
  );

  if (!loaded.ok) {
    return (
      <LearningShell
        title="Questions"
        subtitle="Assessment authoring"
        backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
        instructorHref={LEARNING_INSTRUCTOR_ROUTES.hub}
      >
        <div
          className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100"
          role="alert"
        >
          {loaded.message}
        </div>
      </LearningShell>
    );
  }

  const ctx = loaded.data as AssessmentAuthoringActivityContext;
  const questionIdsOrdered = ctx.questions.map((q) => q.id).join(",");
  const canLifecycle = ctx.canManageActivity;
  const canCreate = ctx.canCreate;

  return (
    <LearningShell
      title={ctx.activity.name}
      subtitle="Question & assessment authoring"
      backHref={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
      instructorHref={LEARNING_INSTRUCTOR_ROUTES.hub}
    >
      <div className="space-y-6 text-white">
        <p className="text-sm text-white/70">
          Activity{" "}
          <span className="font-mono text-white/90">{ctx.activity.slug}</span>{" "}
          ({ctx.activity.type}) — status{" "}
          <span className="uppercase text-white/80">{ctx.activity.status}</span>.
          Answer keys are staff-only and are never shown on learner pages.
        </p>

        {!canCreate && !canLifecycle ? (
          <div
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-50"
            role="status"
          >
            You can view this activity’s questions if RLS allows, but you are not
            entitled to create or manage them here.
          </div>
        ) : null}

        {canCreate ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-base font-bold">Add question</h2>
            <InstructorActionForm
              className="mt-3 space-y-3"
              action={createQuestionAction}
              successMessage="Question created as draft."
              submitLabel="Create question"
            >
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="activityId" value={activityId} />
              <label className="block text-xs text-white/70">
                Type
                <select
                  name="questionType"
                  required
                  className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                  defaultValue="true_false"
                >
                  {LEARNING_QUESTION_CREATABLE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-white/50">
                For multiple-choice types, include options as{" "}
                <code className="text-white/70">key|text</code> lines. For
                fill_blank, provide blank keys. Type is immutable after create.
              </p>
              <label className="block text-xs text-white/70">
                Prompt
                <textarea
                  name="prompt"
                  required
                  rows={3}
                  className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs text-white/70">
                Options (MCQ only — key|text per line)
                <textarea
                  name="options"
                  rows={3}
                  placeholder={"a|Option A\nb|Option B"}
                  className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-xs"
                />
              </label>
              <label className="block text-xs text-white/70">
                Blank keys (fill_blank only)
                <input
                  name="blanks"
                  placeholder="blank1,blank2"
                  className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs text-white/70">
                Unit (numeric only, optional)
                <input
                  name="unit"
                  className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-xs text-white/70">
                Points (optional)
                <input
                  name="points"
                  inputMode="decimal"
                  className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 text-sm"
                />
              </label>
            </InstructorActionForm>
          </section>
        ) : null}

        {canLifecycle && ctx.questions.length > 0 ? (
          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h2 className="text-base font-bold">Reorder questions</h2>
            <InstructorActionForm
              className="mt-3"
              action={reorderQuestionsAction}
              successMessage="Order saved."
              submitLabel="Save order"
            >
              <input type="hidden" name="courseId" value={courseId} />
              <input type="hidden" name="activityId" value={activityId} />
              <label className="block text-xs text-white/70">
                Complete ordered id list
                <textarea
                  name="questionIds"
                  required
                  rows={2}
                  defaultValue={questionIdsOrdered}
                  className="mt-1 w-full rounded border border-white/15 bg-black/40 px-2 py-1.5 font-mono text-xs"
                />
              </label>
            </InstructorActionForm>
          </section>
        ) : null}

        <section className="space-y-4">
          <h2 className="text-base font-bold">
            Questions{" "}
            <span className="font-normal text-white/50">
              ({ctx.questions.length})
            </span>
          </h2>
          {ctx.questions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 p-4 text-sm text-white/60">
              No questions yet. Create a draft question to begin.
            </p>
          ) : (
            <ul className="space-y-4">
              {ctx.questions.map((question) => (
                <li
                  key={question.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <p className="font-bold">
                        #{question.position}{" "}
                        <span className="font-normal text-white/60">
                          {question.question_type}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-white/80">
                        {typeof question.content.prompt === "string"
                          ? question.content.prompt
                          : "(no prompt)"}
                      </p>
                    </div>
                    <div className="text-right text-xs uppercase text-white/50">
                      <div>{question.status}</div>
                      <div className="mt-1 normal-case">
                        {question.has_answer_key
                          ? "Answer key set"
                          : "No answer key"}
                        {question.points != null
                          ? ` · ${question.points} pts`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-bold">Edit content</h3>
                      <InstructorActionForm
                        className="mt-2 space-y-2"
                        action={updateQuestionAction}
                        successMessage="Question updated."
                        submitLabel="Save content"
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="activityId"
                          value={activityId}
                        />
                        <input
                          type="hidden"
                          name="questionId"
                          value={question.id}
                        />
                        <input
                          type="hidden"
                          name="questionType"
                          value={question.question_type}
                        />
                        <ContentFields
                          questionTypeName="edit"
                          question={question}
                        />
                      </InstructorActionForm>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold">Set answer key</h3>
                      <p className="mt-1 text-xs text-white/50">
                        Replaces the staff-only key via trusted RPC. Key values
                        are not prefilled into this form.
                      </p>
                      <InstructorActionForm
                        className="mt-2 space-y-2"
                        action={setAnswerKeyAction}
                        successMessage="Answer key saved."
                        submitLabel="Set answer key"
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="activityId"
                          value={activityId}
                        />
                        <input
                          type="hidden"
                          name="questionId"
                          value={question.id}
                        />
                        <input
                          type="hidden"
                          name="questionType"
                          value={question.question_type}
                        />
                        <AnswerKeyFields question={question} />
                      </InstructorActionForm>
                    </div>
                  </div>

                  {canLifecycle ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <InstructorActionForm
                        action={publishQuestionAction}
                        successMessage="Published."
                        submitLabel="Publish"
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="activityId"
                          value={activityId}
                        />
                        <input
                          type="hidden"
                          name="questionId"
                          value={question.id}
                        />
                      </InstructorActionForm>
                      <InstructorActionForm
                        action={unpublishQuestionAction}
                        successMessage="Unpublished to draft."
                        submitLabel="Unpublish"
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="activityId"
                          value={activityId}
                        />
                        <input
                          type="hidden"
                          name="questionId"
                          value={question.id}
                        />
                      </InstructorActionForm>
                      <InstructorActionForm
                        action={archiveQuestionAction}
                        successMessage="Archived."
                        submitLabel="Archive"
                      >
                        <input type="hidden" name="courseId" value={courseId} />
                        <input
                          type="hidden"
                          name="activityId"
                          value={activityId}
                        />
                        <input
                          type="hidden"
                          name="questionId"
                          value={question.id}
                        />
                      </InstructorActionForm>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-white/40">
          <Link
            href={LEARNING_INSTRUCTOR_ROUTES.course(courseId)}
            className="underline underline-offset-2"
          >
            Back to course authoring
          </Link>
        </p>
      </div>
    </LearningShell>
  );
}
