"use client";

import type { ReactNode } from "react";
import { useTranslation } from "../../i18n";
import {
  getVisibleLearningHubSections,
  parseLearningHubSection,
  type LearningHubSectionId,
} from "../../../../lib/learning/learningHub";
import VisualShell from "../visual/VisualShell";
import type { LearningDataSource } from "../../../../lib/learning/productization";

export function LearningHubShell({
  isTeacher,
  initialSection = "home",
  source = "demo_fallback",
  homePanel,
  panels,
}: {
  isTeacher: boolean;
  initialSection?: LearningHubSectionId | string;
  source?: LearningDataSource;
  homePanel: ReactNode;
  panels: Partial<Record<Exclude<LearningHubSectionId, "home">, ReactNode>>;
}) {
  const { t } = useTranslation();
  const visible = new Set(
    [
      ...getVisibleLearningHubSections({ isTeacher, primaryOnly: false }).map(
        (section) => section.id
      ),
      "assessments" as const,
    ]
  );
  const requested = parseLearningHubSection(initialSection);
  const activeSection = visible.has(requested) ? requested : "home";

  if (activeSection === "home") {
    return <>{homePanel}</>;
  }

  return (
    <VisualShell
      title={t("learning.hub.title")}
      subtitle={t("learning.hub.subtitle")}
      source={source}
      learningNav={{ isTeacher, activeSection }}
    >
      <div
        aria-live="polite"
        className="learning-hub-panel"
        data-learning-section={activeSection}
      >
        {panels[activeSection]}
      </div>
    </VisualShell>
  );
}
