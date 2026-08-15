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

const TUTOR_KIND_LABELS: Record<string, string> = {
  ask_question: "Ask a question",
  explain_again: "Explain again",
  code_review: "Code review",
  hint: "Hint",
  other: "Other",
};

function tutorRoleLabel(role: string) {
  if (role === "assistant" || role === "tutor") return "Tutor";
  if (role === "system") return "System";
  return "You";
}

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
        subtitle="AI product surfaces are currently offline"
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
      backHref={LEARNING_LEARNER_ROUTES.lesson(lessonId)}
      backLabel="Back to lesson"
    >
      {query.error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {query.error}
        </p>
      ) : null}

      <div className="mt-6 space-y-6">
        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Study with tutor
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight">
            Ask about this lesson
          </h2>
          <p className="mt-2 text-sm text-white/55">
            Start a thread, ask a question, and keep context next to the lesson
            content.
          </p>
          <form
            action={createAiTutorThreadAction}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
          >
            <input type="hidden" name="courseId" value={courseId} />
            <input type="hidden" name="lessonId" value={lessonId} />
            <input
              name="title"
              placeholder="Thread title"
              aria-label="Thread title"
              className="min-h-11 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white"
            />
            <button
              type="submit"
              className="watch-focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              New thread
            </button>
          </form>
        </section>

        {threads.length > 0 ? (
          <nav aria-label="Tutor threads">
            <ul className="flex flex-wrap gap-2 text-sm">
              {threads.map((t) => {
                const active = String(t.id) === threadId;
                return (
                  <li key={String(t.id)}>
                    <a
                      href={`${LEARNING_AI_TUTOR_ROUTES.lesson(lessonId)}?thread=${String(t.id)}`}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "watch-focus-ring inline-flex rounded-full border border-sky-400/30 bg-sky-500/15 px-3 py-1.5 font-bold text-sky-100"
                          : "watch-focus-ring inline-flex rounded-full border border-white/10 px-3 py-1.5 text-white/55 hover:border-white/25 hover:text-white"
                      }
                    >
                      {String(t.title ?? t.id)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : null}

        {threadId ? (
          <>
            <section
              className="space-y-3 rounded-[28px] border border-white/10 bg-white/[0.03] p-4 md:p-5"
              aria-live="polite"
            >
              <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
                Conversation
              </h2>
              {messages.length === 0 ? (
                <p className="text-sm text-white/45">
                  No messages yet. Ask your first question below.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={String(m.id)}
                    className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-sm"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-white/35">
                      {tutorRoleLabel(String(m.role ?? "user"))}
                      {m.message_kind || m.kind
                        ? ` · ${
                            TUTOR_KIND_LABELS[String(m.message_kind ?? m.kind)] ??
                            String(m.message_kind ?? m.kind)
                          }`
                        : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-white/85">
                      {String(m.content ?? "")}
                    </p>
                  </div>
                ))
              )}
            </section>

            <form
              action={appendAiTutorMessageAction}
              className="space-y-3 rounded-[28px] border border-white/10 bg-[#080816]/60 p-4 md:p-5"
            >
              <input type="hidden" name="lessonId" value={lessonId} />
              <input type="hidden" name="threadId" value={threadId} />
              <label className="block text-sm text-white/70">
                Kind
                <select
                  name="kind"
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
                  defaultValue="ask_question"
                >
                  {LEARNING_AI_TUTOR_MESSAGE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {TUTOR_KIND_LABELS[k] ?? k}
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
                  className="mt-1.5 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
                />
              </label>
              <button
                type="submit"
                className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/55">
            Create a thread to start asking questions. No AI provider is
            connected yet.
          </p>
        )}
      </div>
    </LearningShell>
  );
}
