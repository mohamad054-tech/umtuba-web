import Link from "next/link";
import { createTranslator } from "../../../../lib/i18n";
import { resolveRequestLocale } from "../../../../lib/i18n/server";

export default async function TeacherSettingsPage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-black">{t("teacher.settings.title")}</h1>
      <p className="text-sm text-white/60">{t("teacher.settings.body")}</p>
      <p className="text-sm text-amber-100/80">{t("teacher.payments.disabled")}</p>
      <Link
        href="/settings"
        className="watch-focus-ring inline-flex rounded-full border border-white/20 px-4 py-2 text-sm font-bold"
      >
        {t("settings.title")}
      </Link>
    </section>
  );
}
