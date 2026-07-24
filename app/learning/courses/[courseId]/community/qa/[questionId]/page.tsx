import { redirect, notFound } from "next/navigation";
import LearningShell from "../../../../../../components/learning/LearningShell";
import CommunityNav from "../../../../../../components/learning/CommunityNav";
import { createClient, getServerUser } from "../../../../../../../lib/supabase/server";
import {
  LEARNING_COMMUNITY_ROUTES,
  getLearningQaQuestion,
  readCommunityItems,
  readCommunityBoolean,
  readCommunityString,
} from "../../../../../../../lib/learning/communityFoundation";
import {
  acceptQaAnswerAction,
  answerQaQuestionAction,
  moderateQaQuestionAction,
} from "../../../../../communityActions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string; questionId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function CommunityQaQuestionPage({
  params,
  searchParams,
}: PageProps) {
  const { courseId, questionId } = await params;
  const sp = searchParams ? await searchParams : {};
  const path = LEARNING_COMMUNITY_ROUTES.question(courseId, questionId);
  const user = await getServerUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);

  const supabase = await createClient();
  const loaded = await getLearningQaQuestion(supabase, questionId);
  if (!loaded.ok) notFound();

  const question = loaded.data;
  const answers = readCommunityItems(question, "answers");
  const status = readCommunityString(question, "status") ?? "open";
  const canAnswer = status === "open" || status === "resolved";

  return (
    <LearningShell
      title={readCommunityString(question, "title") ?? "Question"}
      subtitle={`${readCommunityString(question, "asker_role") ?? "learner"} · ${status}`}
      backHref={LEARNING_COMMUNITY_ROUTES.qa(courseId)}
      backLabel="Q&A"
    >
      <CommunityNav courseId={courseId} active="qa" />

      {sp.error ? (
        <p className="mt-4 rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {sp.error}
        </p>
      ) : null}

      <article className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs text-white/40">
          {readCommunityString(question, "author_label")}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
          {readCommunityString(question, "body")}
        </p>
      </article>

      <section className="mt-4 flex flex-wrap gap-2 text-sm">
        {(["lock", "reopen", "archive", "remove"] as const).map((action) => (
          <form key={action} action={moderateQaQuestionAction}>
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="questionId" value={questionId} />
            <input type="hidden" name="action" value={action} />
            <button
              type="submit"
              className="rounded-lg border border-white/20 px-3 py-1.5 font-bold capitalize text-white/80"
            >
              {action}
            </button>
          </form>
        ))}
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-base font-bold">Answers</h2>
        {answers.length === 0 ? (
          <p className="text-sm text-white/50">No answers yet.</p>
        ) : (
          answers.map((answer) => {
            const answerId = readCommunityString(answer, "answer_id");
            if (!answerId) return null;
            const accepted = readCommunityBoolean(answer, "is_accepted");
            return (
              <div
                key={answerId}
                className="rounded-xl border border-white/10 bg-[#080816]/50 p-3"
              >
                <p className="text-xs text-white/40">
                  {readCommunityString(answer, "author_label")}
                  {accepted ? " · accepted" : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                  {readCommunityString(answer, "body")}
                </p>
                {!accepted && status !== "removed" ? (
                  <form action={acceptQaAnswerAction} className="mt-2">
                    <input type="hidden" name="courseId" value={courseId} />
                    <input type="hidden" name="questionId" value={questionId} />
                    <input type="hidden" name="answerId" value={answerId} />
                    <button
                      type="submit"
                      className="text-xs font-bold text-emerald-200/90 underline"
                    >
                      Accept answer
                    </button>
                  </form>
                ) : null}
              </div>
            );
          })
        )}
      </section>

      {canAnswer ? (
        <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-sm font-bold">Your answer</h2>
          <form action={answerQaQuestionAction} className="mt-3 space-y-3">
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="questionId" value={questionId} />
            <textarea
              name="body"
              required
              rows={4}
              className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-black"
            >
              Post answer
            </button>
          </form>
        </section>
      ) : (
        <p className="mt-6 text-sm text-white/50">This question is closed.</p>
      )}
    </LearningShell>
  );
}
