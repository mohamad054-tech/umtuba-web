/**
 * Learning platform UI message catalog (chrome only).
 * Does NOT include course lesson bodies, video scripts, or content titles from DB.
 */

export type LearningMessages = {
  // Shared
  "learning.shared.hubTitle": string;
  "learning.shared.hubSubtitle": string;
  "learning.shared.continueLearning": string;
  "learning.shared.resume": string;
  "learning.shared.backToLearning": string;
  "learning.shared.emptyState": string;
  "learning.shared.errorState": string;
  "learning.shared.loading": string;
  "learning.shared.retry": string;
  "learning.shared.locked": string;
  "learning.shared.unlock": string;
  "learning.shared.practice": string;
  "learning.shared.review": string;
  "learning.shared.support": string;

  // Programs
  "learning.programs.title": string;
  "learning.programs.empty": string;
  "learning.programs.create": string;
  "learning.programs.open": string;

  // Courses
  "learning.courses.title": string;
  "learning.courses.empty": string;
  "learning.courses.outline": string;
  "learning.courses.enroll": string;
  "learning.courses.resources": string;
  "learning.courses.catalog": string;

  // Sections
  "learning.sections.title": string;
  "learning.sections.empty": string;
  "learning.sections.label": string;

  // Lessons
  "learning.lessons.title": string;
  "learning.lessons.empty": string;
  "learning.lessons.next": string;
  "learning.lessons.previous": string;
  "learning.lessons.complete": string;

  // Activities
  "learning.activities.title": string;
  "learning.activities.empty": string;
  "learning.activities.attempt": string;
  "learning.activities.submit": string;

  // Assessments
  "learning.assessments.title": string;
  "learning.assessments.quiz": string;
  "learning.assessments.submit": string;
  "learning.assessments.grade": string;
  "learning.assessments.passed": string;
  "learning.assessments.failed": string;

  // Assignments
  "learning.assignments.title": string;
  "learning.assignments.empty": string;
  "learning.assignments.submit": string;
  "learning.assignments.submission": string;
  "learning.assignments.queue": string;

  // Instructor
  "learning.instructor.workspace": string;
  "learning.instructor.dashboard": string;
  "learning.instructor.review": string;
  "learning.instructor.bootstrap": string;

  // Learner
  "learning.learner.dashboard": string;
  "learning.learner.hub": string;
  "learning.learner.continue": string;
  "learning.learner.resume": string;

  // Progress / completion
  "learning.progress.title": string;
  "learning.progress.completed": string;
  "learning.progress.inProgress": string;
  "learning.progress.notStarted": string;
  "learning.progress.unavailable": string;
  "learning.completion.title": string;
  "learning.completion.transcript": string;
  "learning.completion.requirements": string;

  // Certificates
  "learning.certificates.title": string;
  "learning.certificates.empty": string;
  "learning.certificates.view": string;
  "learning.certificates.issued": string;

  // Discussions / community
  "learning.discussions.title": string;
  "learning.discussions.feed": string;
  "learning.discussions.qa": string;
  "learning.discussions.announcements": string;
  "learning.discussions.empty": string;

  // Live / calendar
  "learning.live.title": string;
  "learning.live.sessions": string;
  "learning.live.join": string;
  "learning.live.attendance": string;
  "learning.calendar.title": string;
  "learning.calendar.empty": string;
  "learning.calendar.upcoming": string;

  // Notifications (learning-specific)
  "learning.notifications.title": string;
  "learning.notifications.empty": string;
  "learning.notifications.markRead": string;

  // Dashboards
  "learning.dashboards.instructorTitle": string;
  "learning.dashboards.learnerTitle": string;
  "learning.dashboards.overview": string;
};

export type LearningTranslationKey = keyof LearningMessages;
