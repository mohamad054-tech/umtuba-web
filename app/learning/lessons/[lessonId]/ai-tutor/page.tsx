import { redirect } from "next/navigation";
import LearningShell from "../../../../components/learning/LearningShell";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_AI_TUTOR_MESSAGE_KINDS,
  LEARNING_AI_TUTOR_ROUTES,
  getMyAiTutorThreadMessages,
  listMyAiTutorThreads,
} from "../../../../../lib/learning/aiTutorFoundation";
import {
  LEARNING_LEARNER_ROUTES,
  loadLessonDelivery,
} from "../../../../../lib/learning/learnerDelivery";
import { requireLessonUnlockedForLearner } from "../../../../../lib/learning/lessonUnlockFoundation";
import {
  appendAiTutorMessageAction,
  createAiTutorThreadAction,
} from "../../../firstCourseActions";
import { isAiProductExperienceEnabled } from "../../../../../lib/ai/betaProductSurfaces";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ lessonId: string }> | { lessonId: string };
  searchParams?:
    | Promise<{ error?: string; thread?: string }>
    | { error?: string; thread?: string };
};

export default async function AiTutorPage({ params, searchParams }: PageProps) {
  const { lessonId } = await Promise.resolve(params);
  const query = await Promise.resolve(searchParams ?? {});
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(LEARNING_AI_TUTOR_ROUTES.lesson(lessonId))}`
    );
  }

  const supabase = await createClient();
  const unlock = await requireLessonUnlockedForLearner(supabase, lessonId);
  if (!unlock.ok) {
    redirect(
      `${LEARNING_LEARNER_ROUTES.lesson(lessonId)}?error=${encodeURIComponent(unlock.message)}`
    );
  }
  const delivery = await loadLessonDelivery(supabase, lessonId);
  if (!delivery.ok) {
    redirect(LEARNING_LEARNER_ROUTES.hub);
  }

  if (!isAiProductExperienceEnabled()) {
    return (
      <LearningShell
        title="Tutor unavailable"
        subtitle="AI product surfaces are offline for this Beta"
        backHref={LEARNING_LEARNER_ROUTES.lesson(lessonId)}
        backLabel="Back to lesson"
      >
        <div
          className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-5 text-sm text-amber-50"
          role="status"
        >
          <p className="font-bold">AI Tutor is not enabled</p>
          <p className="mt-2 text-amber-50/80">
            UMTUBA AI Hub and Assistant Runtime are OFF. This route stays
            available for deep links but does not run tutor threads, provider
            calls, or AI-branded study sessions until product flags are
            explicitly enabled.
          </p>
        </div>
      </LearningShell>
    );
  }

  const courseId = delivery.data.lesson.course_id;
  const threadsResult = await listMyAiTutorThreads(supabase, courseId);
  const threads =
    threadsResult.ok && Array.isArray(threadsResult.data.threads)
      ? (threadsResult.data.threads as Array<Record<string, unknown>>)
      : threadsResult.ok && Array.isArray(threadsResult.data.items)
        ? (threadsResult.data.items as Array<Record<string, unknown>>)
        : [];

  const threadId = query.thread ?? (threads[0] ? String(threads[0].id) : "");
  const messagesResult = threadId
    ? await getMyAiTutorThreadMessages(supabase, threadId)
    : null;
  const messages =
    messagesResult?.ok && Array.isArray(messagesResult.data.messages)
      ? (messagesResult.data.messages as Array<Record<string, unknown>>)
      : [];

  return (
    <LearningShell
      title="AI Tutor"
      subtitle="Integration layer (stub responses)"
      backHref={LEARNING_LEARNER_ROUTES.lesson(lessonId)}
      backLabel="Back to lesson"
    >
      {query.error ? (
        <p role="alert" className="mt-4 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        <form action={createAiTutorThreadAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <input
            name="title"
            placeholder="Thread title"
            className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          />
          <button
            type="submit"
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
          >
            New thread
          </button>
        </form>

        {threads.length > 0 ? (
          <ul className="flex flex-wrap gap-2 text-sm">
            {threads.map((t) => (
              <li key={String(t.id)}>
                <a
                  href={`${LEARNING_AI_TUTOR_ROUTES.lesson(lessonId)}?thread=${String(t.id)}`}
                  className={
                    String(t.id) === threadId
                      ? "font-bold text-white"
                      : "text-white/50 underline"
                  }
                >
                  {String(t.title ?? t.id)}
                </a>
              </li>
            ))}
          </ul>
        ) : null}

        {threadId ? (
          <>
            <section className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="text-sm font-bold text-white/70">Conversation</h2>
              {messages.length === 0 ? (
                <p className="text-sm text-white/45">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <div key={String(m.id)} className="text-sm">
                    <p className="text-[10px] uppercase tracking-wider text-white/35">
                      {String(m.role ?? "user")} · {String(m.message_kind ?? m.kind ?? "")}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-white/80">
                      {String(m.content ?? "")}
                    </p>
                  </div>
                ))
              )}
            </section>

            <form action={appendAiTutorMessageAction} className="space-y-3">
              <input type="hidden" name="lessonId" value={lessonId} />
              <input type="hidden" name="threadId" value={threadId} />
              <label className="block text-sm text-white/70">
                Kind
                <select
                  name="kind"
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                  defaultValue="ask_question"
                >
                  {LEARNING_AI_TUTOR_MESSAGE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-white/70">
                Message
                <textarea
                  name="content"
                  rows={4}
                  required
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
                />
              </label>
              <button
                type="submit"
                className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm text-white/50">
            Create a thread to start asking questions. No AI provider is connected yet.
          </p>
        )}
      </div>
    </LearningShell>
  );
}
