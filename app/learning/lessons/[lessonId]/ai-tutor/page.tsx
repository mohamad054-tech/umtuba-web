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
        subtitle="Study assistant"
        layout="focus"
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
      subtitle={delivery.data.lesson.name}
      layout="focus"
      backHref={LEARNING_LEARNER_ROUTES.lesson(lessonId)}
      backLabel="Back to lesson"
    >
      {query.error ? (
        <p role="alert" className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {query.error}
        </p>
      ) : null}

      <div className="mt-4 space-y-5">
        <form action={createAiTutorThreadAction} className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="lessonId" value={lessonId} />
          <input
            name="title"
            placeholder="Name this study thread"
            className="min-h-11 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/35"
          />
          <button
            type="submit"
            className="watch-focus-ring inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
          >
            New thread
          </button>
        </form>

        {threads.length > 0 ? (
          <ul className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {threads.map((t) => (
              <li key={String(t.id)}>
                <a
                  href={`${LEARNING_AI_TUTOR_ROUTES.lesson(lessonId)}?thread=${String(t.id)}`}
                  className={
                    String(t.id) === threadId
                      ? "watch-focus-ring inline-flex min-h-9 shrink-0 items-center rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1.5 text-sm font-bold text-sky-100"
                      : "watch-focus-ring inline-flex min-h-9 shrink-0 items-center rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold text-white/60 hover:text-white"
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
            <section
              className="space-y-3 rounded-[24px] border border-white/10 bg-[#080816]/70 p-4"
              aria-label="Conversation"
            >
              <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
                Conversation
              </h2>
              {messages.length === 0 ? (
                <p className="text-sm text-white/45">
                  Ask a question about this lesson to get started.
                </p>
              ) : (
                messages.map((m) => {
                  const role = String(m.role ?? "user");
                  const isUser = role === "user";
                  return (
                    <div
                      key={String(m.id)}
                      className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? "ml-auto bg-sky-500/15 text-sky-50"
                          : "bg-white/[0.06] text-white/85"
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-white/35">
                        {role}
                        {m.message_kind || m.kind
                          ? ` · ${String(m.message_kind ?? m.kind ?? "")}`
                          : ""}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {String(m.content ?? "")}
                      </p>
                    </div>
                  );
                })
              )}
            </section>

            <form action={appendAiTutorMessageAction} className="space-y-3">
              <input type="hidden" name="lessonId" value={lessonId} />
              <input type="hidden" name="threadId" value={threadId} />
              <label className="block text-sm text-white/70">
                Kind
                <select
                  name="kind"
                  className="mt-1 min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
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
                  placeholder="Ask about this lesson…"
                  className="mt-1 min-h-24 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-base text-white placeholder:text-white/35"
                />
              </label>
              <button
                type="submit"
                className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/55">
            Create a thread to start asking questions. No AI provider is connected yet.
          </p>
        )}
      </div>
    </LearningShell>
  );
}
