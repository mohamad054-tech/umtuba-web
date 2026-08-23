import Link from "next/link";
import LearningShell from "../../../components/learning/LearningShell";
import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { createClient } from "../../../../lib/supabase/server";
import {
  LEARNING_TEACHER_ROUTES,
  loadPublicTeacherProfile,
} from "../../../../lib/learning/teacherPlatform";
import { LEARNING_PUBLIC_ROUTES } from "../../../../lib/learning/publicCatalog";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function PublicTeacherProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const loaded = await loadPublicTeacherProfile(supabase, userId);

  if (!loaded.ok || !loaded.data) {
    return (
      <LearningShell title={t("teacher.public.title")}>
        <p className="mt-6 text-sm text-white/60">{t("teacher.public.unavailable")}</p>
      </LearningShell>
    );
  }

  const profile = loaded.data;
  const { data: courses } = await supabase
    .from("learning_courses")
    .select("id, name, slug, status, visibility, created_by")
    .eq("created_by", profile.user_id)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("name");

  return (
    <LearningShell title={profile.display_name} subtitle={t("teacher.public.title")}>
      <section className="mt-6 space-y-4 rounded-[28px] border border-white/10 bg-[#080816]/80 p-6">
        {profile.biography ? (
          <p className="text-sm text-white/70">{profile.biography}</p>
        ) : null}
        {profile.teaching_description ? (
          <p className="text-sm text-white/60">{profile.teaching_description}</p>
        ) : null}
        <p className="text-xs text-white/40">
          {(profile.subjects ?? []).join(" · ")}
        </p>
      </section>
      <section className="mt-6">
        <h2 className="text-lg font-bold">{t("teacher.public.courses")}</h2>
        <ul className="mt-3 space-y-3">
          {(courses ?? []).map((course) => (
            <li key={course.id}>
              <Link
                href={LEARNING_PUBLIC_ROUTES.course(course.slug)}
                className="font-bold hover:underline"
              >
                {course.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={LEARNING_TEACHER_ROUTES.become}
          className="watch-focus-ring mt-6 inline-flex text-sm font-bold text-sky-300"
        >
          {t("teacher.become.cta")}
        </Link>
      </section>
    </LearningShell>
  );
}
