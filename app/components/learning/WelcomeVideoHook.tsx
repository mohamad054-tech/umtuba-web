"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "../i18n";
import {
  shouldRenderWelcomeVideo,
  type LearningWelcomeVideoHook,
} from "../../../lib/learning/welcomeVideoHook";

type Props = {
  hook: LearningWelcomeVideoHook;
};

export default function WelcomeVideoHook({ hook }: Props) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  if (!shouldRenderWelcomeVideo(hook, dismissed)) return null;

  return (
    <section
      className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5"
      aria-label={t("learning.welcome.title")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {t("learning.welcome.title")}
          </p>
          <p className="mt-2 text-sm text-white/60">{t("learning.welcome.body")}</p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="watch-focus-ring rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold text-white/70"
        >
          {t("learning.welcome.skip")}
        </button>
      </div>
      {hook.source_url ? (
        <video
          className="mt-4 w-full rounded-2xl bg-black"
          controls
          src={hook.source_url}
        />
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href={hook.destinations.become_a_teacher}
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
        >
          {t("learning.welcome.becomeTeacher")}
        </Link>
        <Link
          href={hook.destinations.first_free_course}
          className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white"
        >
          {t("learning.welcome.firstCourse")}
        </Link>
        <Link
          href={hook.destinations.learning_home}
          className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white"
        >
          {t("learning.welcome.browse")}
        </Link>
      </div>
    </section>
  );
}
