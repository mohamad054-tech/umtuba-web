"use client";

import { useState } from "react";
import { useTranslation } from "../../i18n";
import VisualShell from "./VisualShell";
import { FeedbackToast } from "./feedback";

const STEPS = [
  "learning.visual.stepProfile",
  "learning.visual.stepSubjects",
  "learning.visual.stepExperience",
  "learning.visual.stepReview",
] as const;

export default function BecomeTeacherView() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <VisualShell title={t("teacher.become.title")} subtitle={t("teacher.become.subtitle")}>
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(88,28,135,0.35),rgba(8,12,32,0.92))] p-6 md:p-10">
        <h1 className="text-3xl font-black md:text-5xl">{t("teacher.become.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
          {t("teacher.become.intro")}
        </p>
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-200/80">
          {t("teacher.become.statusLabel")}: {t("teacher.become.status.draft")}
        </p>
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
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((key, index) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  step === index ? "bg-white text-black" : "border border-white/15 text-white/70"
                }`}
              >
                {index + 1}. {t(key)}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-6 space-y-4">
          {step === 0 ? (
            <>
              <label className="block text-sm font-bold">
                {t("teacher.become.displayName")}
                <input className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" defaultValue="" />
              </label>
              <label className="block text-sm font-bold">
                {t("teacher.become.biography")}
                <textarea className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" />
              </label>
            </>
          ) : null}
          {step === 1 ? (
            <label className="block text-sm font-bold">
              {t("teacher.become.subjects")}
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" />
            </label>
          ) : null}
          {step === 2 ? (
            <>
              <label className="block text-sm font-bold">
                {t("teacher.become.experience")}
                <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" />
              </label>
              <label className="block text-sm font-bold">
                {t("teacher.become.qualifications")}
                <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3" />
              </label>
            </>
          ) : null}
          {step === 3 ? (
            <p className="text-sm text-white/70">{t("teacher.become.pendingHint")}</p>
          ) : null}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setToast(t("teacher.become.successDraft"))}
            className="watch-focus-ring rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold"
          >
            {t("teacher.become.saveDraft")}
          </button>
          <button
            type="button"
            onClick={() => setToast(t("teacher.become.successSubmit"))}
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            {t("teacher.become.submit")}
          </button>
        </div>
        <p className="mt-4 text-xs text-white/45">{t("teacher.become.error.selfApprove")}</p>
      </section>
      <FeedbackToast message={toast} onDismiss={() => setToast(null)} />
    </VisualShell>
  );
}
