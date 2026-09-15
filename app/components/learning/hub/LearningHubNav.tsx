"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import {
  getSecondaryLearningHubSections,
  getVisibleLearningHubSections,
  learningHubHref,
  type LearningHubSectionId,
} from "../../../../lib/learning/learningHub";

export function LearningHubNav({
  activeSection,
  isTeacher,
}: {
  activeSection: LearningHubSectionId | null;
  isTeacher: boolean;
}) {
  const { t } = useTranslation();
  const sections = getVisibleLearningHubSections({ isTeacher });
  const secondary = getSecondaryLearningHubSections();

  return (
    <nav
      aria-label={t("learning.hub.sectionsAria")}
      className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {sections.map((section) => {
        const active = activeSection === section.id;
        return (
          <Link
            key={section.id}
            href={learningHubHref(section.id)}
            aria-current={active ? "page" : undefined}
            className={`watch-focus-ring shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
              active
                ? "bg-white text-black"
                : "border border-white/15 text-white/70 hover:border-white/40"
            }`}
          >
            {t(section.labelKey)}
          </Link>
        );
      })}
      {secondary.map((section) => {
        const active = activeSection === section.id;
        return (
          <Link
            key={section.id}
            href={learningHubHref(section.id)}
            aria-current={active ? "page" : undefined}
            className={`watch-focus-ring shrink-0 rounded-full px-3 py-2 text-xs font-bold ${
              active
                ? "bg-white text-black"
                : "border border-white/10 text-white/45 hover:border-white/30"
            }`}
          >
            {t(section.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
