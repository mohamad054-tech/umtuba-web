"use client";

import AppTopNav from "../../AppTopNav";
import { useTranslation } from "../../i18n";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../../lib/nav";
import type { LearningHubSectionId } from "../../../../lib/learning/learningHub";
import type { LearningDataSource } from "../../../../lib/learning/productization";
import { LearningHubNav } from "../hub/LearningHubNav";

type VisualShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  wide?: boolean;
  source?: LearningDataSource;
  headerExtra?: React.ReactNode;
  learningNav?: {
    isTeacher: boolean;
    activeSection?: LearningHubSectionId | null;
  };
};

export default function VisualShell({
  title,
  subtitle,
  children,
  wide = true,
  source = "demo_fallback",
  headerExtra,
  learningNav,
}: VisualShellProps) {
  const { t } = useTranslation();
  const bannerKey =
    source === "live"
      ? "learning.visual.liveBanner"
      : "learning.visual.demoFallbackBanner";

  return (
    <main
      className={`learning-visual-root relative min-h-screen overflow-x-hidden text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[#070714]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,_rgba(88,70,180,0.28),_transparent_58%),radial-gradient(circle_at_85%_10%,_rgba(37,99,235,0.18),_transparent_42%)]" />
      <div className="relative">
        <AppTopNav title={title} subtitle={subtitle ?? t("nav.learning")} />
        <p className="mx-auto w-full max-w-7xl px-4 pt-3 text-[11px] font-semibold tracking-wide text-violet-200/70 md:px-6">
          {t(bannerKey)}
        </p>
        <div
          className={`mx-auto w-full px-4 py-6 md:px-6 ${wide ? "max-w-7xl" : "max-w-3xl"}`}
        >
          {learningNav ? (
            <LearningHubNav
              activeSection={learningNav.activeSection ?? null}
              isTeacher={learningNav.isTeacher}
            />
          ) : null}
          {headerExtra}
          {children}
        </div>
      </div>
    </main>
  );
}
