"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import {
  getVisibleLearningHubSections,
  learningHubHref,
  type LearningHubSectionId,
} from "../../../../lib/learning/learningHub";

export function LearningHubNav({
  activeSection,
  isTeacher,
  surface,
}: {
  activeSection: LearningHubSectionId;
  isTeacher: boolean;
  surface?: "discover" | "library";
}) {
  const { t } = useTranslation();
  const sections = getVisibleLearningHubSections({ isTeacher });

  return (
    <nav
      aria-label={t("learning.hub.sectionsAria")}
      className="mb-6 flex flex-wrap gap-2"
    >
      {sections.map((section) => {
        const active = activeSection === section.id;
        return (
          <Link
            key={section.id}
            href={learningHubHref(section.id, { surface })}
            aria-current={active ? "page" : undefined}
            className={`watch-focus-ring rounded-full px-4 py-2 text-sm font-bold ${
              active
                ? "bg-white text-black"
                : "border border-white/15 text-white/70 hover:border-white/40"
            }`}
          >
            {t(section.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
