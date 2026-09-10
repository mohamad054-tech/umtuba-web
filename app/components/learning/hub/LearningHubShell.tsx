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
import { LearningHubNav } from "./LearningHubNav";

export function LearningHubShell({
  isTeacher,
  initialSection = "home",
  surface,
  source = "demo_fallback",
  homePanel,
  panels,
}: {
  isTeacher: boolean;
  initialSection?: LearningHubSectionId | string;
  surface?: "discover" | "library";
  source?: LearningDataSource;
  homePanel: ReactNode;
  panels: Partial<Record<Exclude<LearningHubSectionId, "home">, ReactNode>>;
}) {
  const { t } = useTranslation();
  const visible = getVisibleLearningHubSections({ isTeacher }).map(
    (section) => section.id
  );
  const requested = parseLearningHubSection(initialSection);
  const activeSection = visible.includes(requested) ? requested : "home";
  const nav = (
    <LearningHubNav
      activeSection={activeSection}
      isTeacher={isTeacher}
      surface={surface}
    />
  );

  if (activeSection === "home") {
    return <>{homePanel}</>;
  }

  return (
    <VisualShell
      title={t("learning.hub.title")}
      subtitle={t("learning.hub.subtitle")}
      source={source}
      headerExtra={nav}
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
