import Link from "next/link";
import { redirect } from "next/navigation";
import LearningShell from "../../components/learning/LearningShell";
import TeacherApplicationForm from "../../components/learning/teacher/TeacherApplicationForm";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  LEARNING_TEACHER_ROUTES,
  canTeacherEditApplication,
  canTeacherUseCenter,
  loadMyTeacherProfile,
  teacherStatusMessageKey,
} from "../../../lib/learning/teacherPlatform";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string; saved?: string; submitted?: string }>;
};

export default async function BecomeATeacherPage({ searchParams }: PageProps) {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(LEARNING_TEACHER_ROUTES.become)}`);
  }

  const supabase = await createClient();
  const loaded = await loadMyTeacherProfile(supabase);
  const profile = loaded.ok ? loaded.data : null;
  const params = searchParams ? await searchParams : {};
  const editable = canTeacherEditApplication(profile?.status);
  const hintKey =
    profile?.status === "pending_review"
      ? "teacher.become.pendingHint"
      : profile?.status === "rejected"
        ? "teacher.become.rejectedHint"
        : profile?.status === "suspended"
          ? "teacher.become.suspendedHint"
          : profile?.status === "approved"
            ? "teacher.become.approvedHint"
            : null;

  return (
    <LearningShell
      title={t("teacher.become.title")}
      subtitle={t("teacher.become.subtitle")}
    >
      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <p className="text-sm text-white/60">{t("teacher.become.intro")}</p>
        {profile ? (
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-sky-200/80">
            {t("teacher.become.statusLabel")}: {t(teacherStatusMessageKey(profile.status))}
          </p>
        ) : null}
        {hintKey ? (
          <p className="mt-2 text-sm text-white/70">{t(hintKey)}</p>
        ) : null}
        {params.saved ? (
          <p className="mt-3 text-sm text-emerald-200">{t("teacher.become.successDraft")}</p>
        ) : null}
        {params.submitted ? (
          <p className="mt-3 text-sm text-emerald-200">{t("teacher.become.successSubmit")}</p>
        ) : null}
        {params.error ? (
          <p role="alert" className="mt-3 text-sm text-rose-200">
            {t((params.error as TranslationKey) || "teacher.become.error.generic")}
          </p>
        ) : null}
        {canTeacherUseCenter(profile?.status) ? (
          <Link
            href={LEARNING_TEACHER_ROUTES.center}
            className="watch-focus-ring mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            {t("teacher.become.openCenter")}
          </Link>
        ) : null}
        <TeacherApplicationForm t={t} profile={profile} editable={editable} />
      </section>
    </LearningShell>
  );
}
