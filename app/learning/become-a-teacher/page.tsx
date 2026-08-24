import { redirect } from "next/navigation";
import TeacherApplicationForm from "../../components/learning/teacher/TeacherApplicationForm";
import BecomeTeacherView from "../../components/learning/visual/BecomeTeacherView";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import {
  LEARNING_TEACHER_ROUTES,
  canTeacherEditApplication,
  canTeacherUseCenter,
  loadMyTeacherProfile,
  teacherStatusMessageKey,
} from "../../../lib/learning/teacherPlatform";
import {
  shouldPreferLiveLearningData,
} from "../../../lib/learning/productization";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ error?: string; saved?: string; submitted?: string }>;
};

export default async function BecomeATeacherPage({ searchParams }: PageProps) {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const params = searchParams ? await searchParams : {};

  if (!shouldPreferLiveLearningData()) {
    return (
      <BecomeTeacherView
        source="demo_fallback"
        statusLabel={t("teacher.become.status.draft")}
        form={null}
      />
    );
  }

  const { getServerUser, createClient } = await import("../../../lib/supabase/server");
  const user = await getServerUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(LEARNING_TEACHER_ROUTES.become)}`);
  }

  const supabase = await createClient();
  const loaded = await loadMyTeacherProfile(supabase);
  const profile = loaded.ok ? loaded.data : null;
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
    <BecomeTeacherView
      source="live"
      statusLabel={
        profile ? t(teacherStatusMessageKey(profile.status)) : t("teacher.become.status.draft")
      }
      hint={
        params.saved
          ? t("teacher.become.successDraft")
          : params.submitted
            ? t("teacher.become.successSubmit")
            : params.error
              ? t((params.error as TranslationKey) || "teacher.become.error.generic")
              : hintKey
                ? t(hintKey)
                : undefined
      }
      openCenter={canTeacherUseCenter(profile?.status)}
      form={<TeacherApplicationForm t={t} profile={profile} editable={editable} />}
    />
  );
}
