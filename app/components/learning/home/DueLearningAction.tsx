"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import type { LearningDueAction } from "../../../../lib/learning/learningDashboard";
import { loc } from "../../../../lib/learning/visualDemo";

export function DueLearningAction({ due }: { due: LearningDueAction | null }) {
  const { t, locale } = useTranslation();
  if (!due) return null;

  return (
    <section className="rounded-[24px] border border-amber-300/25 bg-amber-400/10 px-5 py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-100/70">
        {t("learning.home.dueTitle")}
      </p>
      <h2 className="mt-2 text-lg font-black">{loc(due.course.title, locale)}</h2>
      <p className="mt-1 text-sm text-white/70">{t("learning.home.dueBody")}</p>
      <Link
        href={due.href}
        className="watch-focus-ring mt-4 inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-sm font-black text-black"
      >
        {t("learning.home.dueCta")}
      </Link>
    </section>
  );
}
