"use client";

import { useTranslation } from "../../i18n";
import {
  LEARNING_HOME_PARTNER_LIMIT,
  selectDueLearningAction,
  selectRecommendedCourses,
  selectSnapshot,
  selectUpcomingLiveCourses,
} from "../../../../lib/learning/learningDashboard";
import type { LearningHomeSurface } from "../../../../lib/learning/productization";
import type { OneToOneHubData } from "../../../../lib/learning/oneToOne";
import type { LearningPartnerCourse } from "../../../../lib/learning/partners/types";
import VisualShell from "../visual/VisualShell";
import { LearningGreeting } from "./LearningGreeting";
import { ContinueLearningCard } from "./ContinueLearningCard";
import { LearningSnapshot } from "./LearningSnapshot";
import { OneToOnePreview } from "./OneToOnePreview";
import { UpcomingLearning } from "./UpcomingLearning";
import { DueLearningAction } from "./DueLearningAction";
import { RecommendedLearning } from "./RecommendedLearning";
import { LearningCategories } from "./LearningCategories";
import { PartnerLearningPreview } from "./PartnerLearningPreview";

export function LearningDashboardView({
  home,
  oneToOne,
  isTeacher,
  partnerCourses,
}: {
  home: LearningHomeSurface;
  oneToOne: OneToOneHubData;
  isTeacher: boolean;
  partnerCourses: LearningPartnerCourse[];
}) {
  const { t, locale } = useTranslation();
  const snapshot = selectSnapshot(home, oneToOne);
  const recommended = selectRecommendedCourses(home);
  const livePreview = selectUpcomingLiveCourses(home);
  const due = selectDueLearningAction(home);
  const partnerPreview = partnerCourses.slice(0, LEARNING_HOME_PARTNER_LIMIT);
  const partnerLocale = locale === "ar" ? "ar" : "en";

  return (
    <VisualShell
      title={t("learning.hub.title")}
      source={home.source}
      learningNav={{ isTeacher, activeSection: "home" }}
    >
      <div
        className="space-y-8"
        data-learning-home="dashboard"
        data-learning-catalog-preview={recommended.length}
      >
        <LearningGreeting home={home} isTeacher={isTeacher} />
        <ContinueLearningCard home={home} />
        <LearningSnapshot snapshot={snapshot} />
        <OneToOnePreview data={oneToOne} />
        <UpcomingLearning courses={livePreview} />
        <DueLearningAction due={due} />
        <RecommendedLearning courses={recommended} />
        <LearningCategories />
        <PartnerLearningPreview
          courses={partnerPreview}
          locale={partnerLocale}
          rtl={locale === "ar"}
        />
      </div>
    </VisualShell>
  );
}
