import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import { createClient } from "../../../../lib/supabase/server";
import { loadTeacherCenterContext } from "../../../../lib/learning/teacherCenterAccess";

export default async function TeacherAnalyticsPage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const ctx = await loadTeacherCenterContext(supabase);
  const totals = ctx.dashboard?.totals;

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-black">{t("teacher.analytics.title")}</h1>
      <p className="text-sm text-white/60">{t("teacher.analytics.body")}</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 p-4">
          <dt className="text-xs uppercase text-white/40">{t("teacher.dashboard.students")}</dt>
          <dd className="mt-1 text-2xl font-black">{totals?.enrollment_count ?? 0}</dd>
        </div>
        <div className="rounded-2xl border border-white/10 p-4">
          <dt className="text-xs uppercase text-white/40">{t("teacher.dashboard.completions")}</dt>
          <dd className="mt-1 text-2xl font-black">{totals?.completion_count ?? 0}</dd>
        </div>
      </dl>
    </section>
  );
}
