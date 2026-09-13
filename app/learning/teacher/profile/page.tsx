import Link from "next/link";
import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { createClient } from "../../../../lib/supabase/server";
import { loadTeacherCenterContext } from "../../../../lib/learning/teacherCenterAccess";
import {
  LEARNING_TEACHER_ROUTES,
  teacherStatusMessageKey,
} from "../../../../lib/learning/teacherPlatform";

export default async function TeacherProfilePage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const ctx = await loadTeacherCenterContext(supabase);
  const profile = ctx.profile;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-black">{t("teacher.profile.title")}</h1>
      {profile ? (
        <>
          <p className="text-lg font-bold">{profile.display_name}</p>
          <p className="text-xs uppercase text-sky-200/80">
            {t(teacherStatusMessageKey(profile.status))}
          </p>
          {profile.biography ? (
            <p className="text-sm text-white/70">{profile.biography}</p>
          ) : null}
          <Link
            href={LEARNING_TEACHER_ROUTES.become}
            className="watch-focus-ring inline-flex rounded-full border border-white/20 px-4 py-2 text-sm font-bold"
          >
            {t("teacher.center.applyCta")}
          </Link>
        </>
      ) : (
        <Link
          href={LEARNING_TEACHER_ROUTES.become}
          className="watch-focus-ring inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
        >
          {t("teacher.become.cta")}
        </Link>
      )}
    </section>
  );
}
