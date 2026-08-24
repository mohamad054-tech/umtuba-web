"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "../../i18n";
import type { LearningDataSource } from "../../../../lib/learning/productization";
import { demoHref } from "../../../../lib/learning/visualDemo";
import VisualShell from "./VisualShell";

export default function BecomeTeacherView({
  source,
  statusLabel,
  hint,
  openCenter,
  form,
}: {
  source: LearningDataSource;
  statusLabel?: string;
  hint?: string;
  openCenter?: boolean;
  form?: ReactNode;
}) {
  const { t } = useTranslation();
  const hrefs = demoHref();

  return (
    <VisualShell title={t("teacher.become.title")} subtitle={t("teacher.become.subtitle")} source={source}>
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(88,28,135,0.35),rgba(8,12,32,0.92))] p-6 md:p-10">
        <h1 className="text-3xl font-black md:text-5xl">{t("teacher.become.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
          {t("teacher.become.intro")}
        </p>
        {statusLabel ? (
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-200/80">
            {t("teacher.become.statusLabel")}: {statusLabel}
          </p>
        ) : null}
        {hint ? <p className="mt-2 text-sm text-white/70">{hint}</p> : null}
        {openCenter ? (
          <Link
            href={hrefs.center}
            className="watch-focus-ring mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            {t("teacher.become.openCenter")}
          </Link>
        ) : null}
      </section>

      <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-xl font-black">{t("learning.visual.benefits")}</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            t("teacher.center.nav.students"),
            t("teacher.center.nav.courses"),
            t("teacher.center.nav.reviews"),
          ].map((item) => (
            <li key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-bold">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        {form}
        {source === "demo_fallback" ? (
          <p className="mt-4 text-xs text-white/45">{t("learning.visual.persistenceUnavailable")}</p>
        ) : (
          <p className="mt-4 text-xs text-white/45">{t("teacher.become.error.selfApprove")}</p>
        )}
      </section>
    </VisualShell>
  );
}
