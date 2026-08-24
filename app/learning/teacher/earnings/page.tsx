import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";
import {
  LEARNING_TEACHER_EARNINGS_KIND_KEYS,
  emptyTeacherEarningsSnapshot,
} from "../../../../lib/learning/teacherEarnings";

export default async function TeacherEarningsPage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const snapshot = emptyTeacherEarningsSnapshot();

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-black">{t("teacher.earnings.title")}</h1>
      <p className="text-sm text-amber-100/80">{t("teacher.earnings.disabled")}</p>
      <p className="text-sm text-white/55">{t("teacher.earnings.commissionUnset")}</p>
      <ul className="space-y-3">
        {snapshot.rows.map((row) => (
          <li
            key={row.kind}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <span className="font-bold">{t(LEARNING_TEACHER_EARNINGS_KIND_KEYS[row.kind])}</span>
            <span className="text-sm text-white/40">—</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
